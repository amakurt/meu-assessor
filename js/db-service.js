/**
 * KIT OS · PERSISTENT DATABASE & REAL-TIME SSE BROADCASTER
 * Stores and manages live transactions, tasks, events, and pushes live updates to the frontend.
 */

const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'data', 'db.json');

const INITIAL_DB = {
    transactions: [
        { id: 'tx-1', type: 'receita', description: 'Consultoria Alpha', amount: 14500.0, category: 'Serviços Prestados', status: 'conciliado', profile: 'cnpj', date: '2026-10-18' },
        { id: 'tx-2', type: 'despesa', description: 'Almoço Executivo Faria Lima', amount: 74.5, category: 'Alimentação', status: 'conciliado', profile: 'personal', date: '2026-10-19' },
        { id: 'tx-3', type: 'despesa', description: 'DAS Tributos', amount: 2850.0, category: 'Impostos & Tributos', status: 'pendente', profile: 'business', date: '2026-10-19' }
    ],
    events: [
        { id: 'ev-1', title: 'Reunião com Ana Prado', date: '2026-10-19', startTime: '15:00', endTime: '16:00', location: 'Faria Lima', hasMeet: false },
        { id: 'ev-2', title: 'Alinhamento com Sócios', date: '2026-10-19', startTime: '17:30', endTime: '18:15', location: 'Google Meet', hasMeet: true, meetUrl: 'https://meet.google.com/xyz-kit-os' }
    ],
    tasks: [
        { id: 'tk-1', title: 'Pagar IPVA', status: 'todo', priority: 'urgente', dueDate: '2026-10-22' },
        { id: 'tk-2', title: 'Aprovar minuta de contrato', status: 'inprogress', priority: 'alta', dueDate: '2026-10-20' },
        { id: 'tk-3', title: 'Revisar métricas de marketing', status: 'done', priority: 'normal', dueDate: '2026-10-18' }
    ],
    budgets: [
        { category: 'Alimentação', ceiling: 3000.0, spent: 2150.0, profile: 'personal' },
        { category: 'Transporte & Viagens', ceiling: 1800.0, spent: 780.0, profile: 'personal' },
        { category: 'Marketing & Ads', ceiling: 5000.0, spent: 4850.0, profile: 'business' },
        { category: 'Infraestrutura SaaS', ceiling: 2200.0, spent: 1450.0, profile: 'business' }
    ],
    debts: [
        { id: 'debt-1', name: 'Rodrigo Mendonça', amount: 1450.0, reason: 'Empréstimo emergência', date: '12/10/2026', status: 'pendente' },
        { id: 'debt-2', name: 'Studio Criativo XP', amount: 4800.0, reason: 'Projeto Landing Page', date: '05/10/2026', status: 'pendente' }
    ],
    billingLinks: [
        { id: 'bil-1', debtor: 'Lucas Alencar', amount: 350.0, url: 'https://kit.ai/pay/bil-1', status: 'ativo' }
    ],
    researches: [
        {
            id: 'res-1',
            title: 'Análise Comparativa: Melhores Cartões PJ com Cashback 2026',
            summary: 'Avaliamos C6 Bank, Inter PJ e Cora. O C6 oferece 1.5% cashback direto na conta corrente PJ, sendo a melhor taxa para seu volume.',
            sources: ['https://valor.globo.com/financas', 'https://c6bank.com.br/pj'],
            status: 'concluido',
            verifiedBy: 'Ítalo',
            date: '18/10/2026'
        }
    ],
    lists: [
        {
            id: 'lst-1',
            title: 'Compras Supermercado',
            items: [
                { id: 'itm-1', text: 'Café Grãos Especiais', checked: true },
                { id: 'itm-2', text: 'Cápsulas Nespresso Descafeinado', checked: false },
                { id: 'itm-3', text: 'Azeite Extra Virgem 0.2%', checked: false }
            ]
        }
    ],
    cloudDrive: [
        { id: 'fld-1', name: 'Contratos Clientes 2026', filesCount: 14, totalSize: '34.2 MB', isPublic: true, publicUrl: 'https://kit.ai/drive/fld-1' },
        { id: 'fld-2', name: 'Comprovantes Fiscais & DAS', filesCount: 38, totalSize: '48.9 MB', isPublic: false, publicUrl: null },
        { id: 'fld-3', name: 'Identidade Visual & Logos', filesCount: 9, totalSize: '18.1 MB', isPublic: true, publicUrl: 'https://kit.ai/drive/fld-3' }
    ]
};

class DbService {
    constructor() {
        this.db = this._loadDb();
        this.sseClients = new Set();
    }

    _loadDb() {
        try {
            if (fs.existsSync(DB_PATH)) {
                const raw = fs.readFileSync(DB_PATH, 'utf8');
                return JSON.parse(raw);
            }
        } catch (e) {
            console.error('[DB] Erro ao ler db.json, restaurando padrões:', e.message);
        }
        this._saveDb(INITIAL_DB);
        return JSON.parse(JSON.stringify(INITIAL_DB));
    }

    _saveDb(data = this.db) {
        try {
            const dir = path.dirname(DB_PATH);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
        } catch (e) {
            console.error('[DB] Erro ao salvar db.json:', e.message);
        }
    }

    getAll() {
        return this.db;
    }

    /**
     * Registra cliente SSE para transmissão em tempo real para a tela do usuário
     */
    addSseClient(res) {
        this.sseClients.add(res);
        res.on('close', () => {
            this.sseClients.delete(res);
        });
    }

    /**
     * Dispara evento em tempo real para todos os navegadores abertos
     */
    broadcast(event, payload) {
        const message = `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
        for (const client of this.sseClients) {
            try {
                client.write(message);
            } catch (err) {
                this.sseClients.delete(client);
            }
        }
    }

    /**
     * Aplica uma ação extraída da IA (transação, tarefa, reunião) e notifica o painel
     */
    applyAction(action) {
        if (!action || !action.type) return null;

        let applied = null;
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];

        switch (action.type) {
            case 'transaction': {
                const txData = action.data || {};
                const amount = parseFloat(txData.amount) || 0;
                applied = {
                    id: `tx-${Date.now()}`,
                    type: txData.type || 'despesa',
                    description: txData.description || 'Despesa registrada via WhatsApp',
                    amount: Math.abs(amount),
                    category: txData.category || 'Geral',
                    status: 'conciliado',
                    profile: txData.profile || 'personal',
                    date: txData.date || dateStr
                };
                this.db.transactions.unshift(applied);

                // Atualiza o orçamento gasto se for despesa
                if (applied.type === 'despesa') {
                    const budget = this.db.budgets.find(b => b.category.toLowerCase() === applied.category.toLowerCase());
                    if (budget) {
                        budget.spent += applied.amount;
                    }
                }
                break;
            }

            case 'event': {
                const evData = action.data || {};
                applied = {
                    id: `ev-${Date.now()}`,
                    title: evData.title || 'Compromisso KIT',
                    date: evData.date || dateStr,
                    startTime: evData.startTime || '10:00',
                    endTime: evData.endTime || '11:00',
                    location: evData.location || (evData.hasMeet ? 'Google Meet' : 'Presencial'),
                    hasMeet: !!evData.hasMeet,
                    meetUrl: evData.hasMeet ? `https://meet.google.com/kit-${Math.random().toString(36).substring(2, 6)}` : null
                };
                this.db.events.unshift(applied);
                break;
            }

            case 'task': {
                const tkData = action.data || {};
                applied = {
                    id: `tk-${Date.now()}`,
                    title: tkData.title || 'Nova Tarefa via WhatsApp',
                    status: 'todo',
                    priority: tkData.priority || 'alta',
                    dueDate: tkData.dueDate || dateStr
                };
                this.db.tasks.unshift(applied);
                break;
            }

            case 'debt': {
                const dbData = action.data || {};
                applied = {
                    id: `debt-${Date.now()}`,
                    name: dbData.name || 'Contato',
                    amount: parseFloat(dbData.amount) || 0,
                    reason: dbData.reason || 'Cobrança',
                    date: dateStr,
                    status: 'pendente'
                };
                this.db.debts.unshift(applied);
                break;
            }

            default:
                console.warn('[DB] Tipo de ação desconhecido:', action.type);
        }

        if (applied) {
            this._saveDb();
            console.log(`[DB] Ação aplicada com sucesso: [${action.type}]`, applied);
            // Avisa todos os navegadores abertos instantaneamente!
            this.broadcast('data_updated', {
                type: action.type,
                item: applied,
                fullDb: this.db
            });
        }

        return applied;
    }

    /**
     * Registra mensagem no feed em tempo real do WhatsApp
     */
    addChatMessage(msg) {
        if (!this.db.chatMessages) this.db.chatMessages = [];
        this.db.chatMessages.push(msg);
        if (this.db.chatMessages.length > 50) {
            this.db.chatMessages.shift();
        }
        this._saveDb();
        this.broadcast('data_updated', {
            type: 'chat',
            item: msg,
            fullDb: this.db
        });
    }
}

module.exports = new DbService();
