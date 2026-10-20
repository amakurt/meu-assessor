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
            const data = JSON.stringify({
                options: {
                    clientUserId: options.clientUserId || 'amauri-kit-os'
                }
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

                // 2. Busca transações recentes da conta
                const txs = await this._makeGetRequest(`/transactions?accountId=${acc.id}&pageSize=50`, apiKey);
                if (txs && Array.isArray(txs.results)) {
                    for (const t of txs.results) {
                        const amount = Math.abs(t.amount);
                        const isReceita = t.amount > 0;
                        const dateStr = t.date ? t.date.split('T')[0] : new Date().toISOString().split('T')[0];

                        // Verifica se já não importou esta transação
                        const existing = dbService.getAll().transactions.find(existingTx => existingTx.pluggyId === t.id);
                        if (!existing) {
                            dbService.applyAction({
                                type: 'transaction',
                                data: {
                                    pluggyId: t.id,
                                    type: isReceita ? 'receita' : 'despesa',
                                    description: t.description || 'Lançamento bancário',
                                    amount: amount,
                                    category: t.category || 'Bancário',
                                    status: 'conciliado',
                                    profile: 'personal',
                                    date: dateStr,
                                    paymentMethod: acc.name || 'Open Finance'
                                }
                            });
                            importedCount++;
                        }
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
