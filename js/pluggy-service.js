/**
 * KIT OS · PLUGGY OPEN FINANCE SERVICE
 * Official Open Finance Brasil aggregator integration (Nubank, Itaú, Bradesco, BB, C6, Next, XP, etc.)
 */

const https = require('https');
const dbService = require('./db-service');

class PluggyService {
    constructor() {
        this.clientId = process.env.PLUGGY_CLIENT_ID || '';
        this.clientSecret = process.env.PLUGGY_CLIENT_SECRET || '';
        this.apiKey = null;
        this.apiKeyExpiresAt = null;
    }

    setCredentials(clientId, clientSecret) {
        this.clientId = clientId;
        this.clientSecret = clientSecret;
        this.apiKey = null;
    }

    isConfigured() {
        return !!(this.clientId && this.clientSecret && !this.clientSecret.includes('•'));
    }

    /**
     * Autentica na API da Pluggy e obtém o X-API-KEY temporário
     */
    async authenticate() {
        if (!this.isConfigured()) {
            throw new Error('Credenciais da Pluggy não configuradas ou secret mascarado.');
        }

        if (this.apiKey && this.apiKeyExpiresAt && Date.now() < this.apiKeyExpiresAt) {
            return this.apiKey;
        }

        return new Promise((resolve, reject) => {
            const data = JSON.stringify({
                clientId: this.clientId,
                clientSecret: this.clientSecret
            });

            const req = https.request({
                hostname: 'api.pluggy.ai',
                port: 443,
                path: '/auth',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(data)
                }
            }, (res) => {
                let body = '';
                res.on('data', chunk => body += chunk);
                res.on('end', () => {
                    try {
                        const parsed = JSON.parse(body);
                        if (parsed.apiKey) {
                            this.apiKey = parsed.apiKey;
                            // Expira em 2 horas
                            this.apiKeyExpiresAt = Date.now() + (2 * 60 * 60 * 1000) - 60000;
                            resolve(this.apiKey);
                        } else {
                            reject(new Error(parsed.message || 'Falha ao autenticar na Pluggy'));
                        }
                    } catch (e) {
                        reject(new Error('Erro na resposta da Pluggy: ' + e.message));
                    }
                });
            });

            req.on('error', err => reject(err));
            req.write(data);
            req.end();
        });
    }

    /**
     * Cria um Connect Token para inicializar o Widget de Conexão no navegador do usuário
     */
    async createConnectToken(options = {}) {
        const apiKey = await this.authenticate();

        return new Promise((resolve, reject) => {
            const tokenOptions = {
                clientUserId: options.clientUserId || 'amauri-kit-os'
            };

            if (options.oauthRedirectUri && options.oauthRedirectUri.startsWith('https://')) {
                tokenOptions.oauthRedirectUri = options.oauthRedirectUri;
            } else {
                // URL segura HTTPS exigida pela especificação do Open Finance para fluxos OAuth
                tokenOptions.oauthRedirectUri = 'https://pluggy.ai/demo';
            }

            const data = JSON.stringify({
                options: tokenOptions
            });

            const req = https.request({
                hostname: 'api.pluggy.ai',
                port: 443,
                path: '/connect_token',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-KEY': apiKey,
                    'Content-Length': Buffer.byteLength(data)
                }
            }, (res) => {
                let body = '';
                res.on('data', chunk => body += chunk);
                res.on('end', () => {
                    try {
                        const parsed = JSON.parse(body);
                        if (parsed.accessToken) {
                            resolve(parsed.accessToken);
                        } else {
                            reject(new Error(parsed.message || 'Erro ao gerar Connect Token na Pluggy'));
                        }
                    } catch (e) {
                        reject(new Error('Erro ao processar token: ' + e.message));
                    }
                });
            });

            req.on('error', err => reject(err));
            req.write(data);
            req.end();
        });
    }

    /**
     * Sincroniza todas as contas, saldos e transações de uma conexão bancária
     */
    async syncItem(itemId) {
        const apiKey = await this.authenticate();
        console.log(`[Pluggy] Sincronizando item bancário: ${itemId}`);

        // 1. Busca contas vinculadas a essa conexão
        const accounts = await this._makeGetRequest(`/accounts?itemId=${itemId}`, apiKey);
        let importedCount = 0;

        if (accounts && Array.isArray(accounts.results)) {
            for (const acc of accounts.results) {
                console.log(`[Pluggy] Conta encontrada: ${acc.name} (${acc.type}) - Saldo: R$ ${acc.balance}`);

                // 2. Busca transações recentes da conta usando v2
                const txs = await this._makeGetRequest(`/v2/transactions?accountId=${acc.id}`, apiKey);
                if (txs && Array.isArray(txs.results)) {
                    for (const t of txs.results) {
                        const amount = Math.abs(t.amount);
                        const isDespesa = t.type === 'DEBIT' || t.amount < 0;
                        const isReceita = !isDespesa;
                        const dateStr = t.date ? t.date.split('T')[0] : new Date().toISOString().split('T')[0];

                        // 1. Verifica se esta transação já foi importada anteriormente pelo pluggyId
                        const allTxs = dbService.getAll().transactions;
                        const existing = allTxs.find(existingTx => existingTx.pluggyId === t.id);
                        if (existing) continue;

                        // 2. CONCILIAÇÃO INTELIGENTE (Anti-Duplicação com WhatsApp/Manual):
                        // Se o usuário já antecipou o lançamento pelo WhatsApp ou manualmente,
                        // associamos o ID do banco oficial sem duplicar nem alterar o teto de gastos novamente.
                        const txDate = new Date(dateStr);
                        const manualMatch = allTxs.find(existingTx => {
                            if (existingTx.pluggyId) return false; // Já conciliada
                            if (existingTx.type !== (isReceita ? 'receita' : 'despesa')) return false;
                            if (Math.abs(existingTx.amount - amount) > 0.01) return false;

                            // Tolerância de até 3 dias entre passar o cartão e o fechamento/compensação bancária
                            const existingDate = new Date(existingTx.date);
                            const diffDays = Math.abs((txDate - existingDate) / (1000 * 60 * 60 * 24));
                            return diffDays <= 3;
                        });

                        if (manualMatch) {
                            console.log(`[Pluggy Conciliação] Vinculando transação do WhatsApp "${manualMatch.description}" (R$ ${amount.toFixed(2)}) ao lançamento bancário oficial (${t.description || acc.name})`);
                            dbService.reconcileTransaction(manualMatch.id, {
                                id: t.id,
                                account: acc.name || manualMatch.account
                            });
                            continue;
                        }

                        // 3. Caso não seja um gasto já registrado, adiciona como novo lançamento
                        dbService.applyAction({
                            type: 'transaction',
                            data: {
                                pluggyId: t.id,
                                type: isReceita ? 'receita' : 'despesa',
                                description: t.description || t.descriptionRaw || 'Lançamento bancário',
                                amount: amount,
                                category: t.category || 'Bancário',
                                status: 'conciliado',
                                profile: 'personal',
                                date: dateStr,
                                paymentMethod: acc.name || 'Open Finance',
                                account: acc.name || 'Open Finance'
                            }
                        });
                        importedCount++;
                    }
                }
            }
        }

        console.log(`[Pluggy] Sincronização concluída: ${importedCount} novos lançamentos reais importados!`);
        return { success: true, importedCount, accountsCount: accounts.results?.length || 0 };
    }

    _makeGetRequest(path, apiKey) {
        return new Promise((resolve, reject) => {
            const req = https.request({
                hostname: 'api.pluggy.ai',
                port: 443,
                path: path,
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-KEY': apiKey
                }
            }, (res) => {
                let body = '';
                res.on('data', chunk => body += chunk);
                res.on('end', () => {
                    try {
                        resolve(JSON.parse(body));
                    } catch (e) {
                        reject(e);
                    }
                });
            });

            req.on('error', err => reject(err));
            req.end();
        });
    }
}

module.exports = new PluggyService();
