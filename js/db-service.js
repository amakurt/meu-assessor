/**
 * KIT OS · PERSISTENT DATABASE & REAL-TIME SSE BROADCASTER
 * Stores and manages live transactions, tasks, events, and pushes live updates to the frontend.
 */

const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'data', 'db.json');

const INITIAL_DB = {
    transactions: [],
    events: [],
    tasks: [],
    budgets: [
        { category: 'Alimentação', ceiling: 3000.0, spent: 0, profile: 'personal' },
        { category: 'Transporte & Viagens', ceiling: 1800.0, spent: 0, profile: 'personal' },
        { category: 'Compras & Serviços', ceiling: 5000.0, spent: 0, profile: 'personal' },
        { category: 'Saúde & Farmácia', ceiling: 1500.0, spent: 0, profile: 'personal' }
    ],
    debts: [],
    billingLinks: [],
    researches: [],
    lists: [],
    cloudDrive: [],
    connectedBanks: []
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
                    date: txData.date || dateStr,
                    paymentMethod: txData.paymentMethod || 'Open Finance',
                    pluggyId: txData.pluggyId || null
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
