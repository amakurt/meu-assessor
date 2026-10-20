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
        this.lastAction = null;
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
     * Aplica uma ação extraída da IA (transação, tarefa, reunião, atualização ou exclusão) e notifica o painel
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
                this.lastAction = { type: 'transaction', item: applied, timestamp: Date.now() };
                break;
            }

            case 'update_transaction': {
                const updData = action.data || {};
                let target = null;

                // 1. Tenta achar por ID explícito
                if (updData.id) {
                    target = this.db.transactions.find(t => t.id === updData.id);
                }
                // 2. Tenta achar pela última transação gravada nesta sessão
                if (!target && this.lastAction && this.lastAction.type === 'transaction' && this.lastAction.item) {
                    target = this.db.transactions.find(t => t.id === this.lastAction.item.id);
                }
                // 3. Fallback: transação manual mais recente no banco (que não seja de Open Finance)
                if (!target) {
                    target = this.db.transactions.find(t => !t.pluggyId) || this.db.transactions[0];
                }

                if (target) {
                    // Reverte gasto anterior no orçamento se era despesa
                    if (target.type === 'despesa') {
                        const oldBudget = this.db.budgets.find(b => b.category.toLowerCase() === (target.category || '').toLowerCase());
                        if (oldBudget) {
                            oldBudget.spent = Math.max(0, oldBudget.spent - (target.amount || 0));
                        }
                    }

                    // Aplica alterações nos campos
                    if (updData.amount !== undefined && updData.amount !== null && !isNaN(updData.amount)) {
                        target.amount = Math.abs(parseFloat(updData.amount));
                    }
                    if (updData.description) {
                        target.description = updData.description;
                    }
                    if (updData.category) {
                        target.category = updData.category;
                    }
                    if (updData.type) {
                        target.type = updData.type;
                    }

                    // Aplica novo valor ao orçamento
                    if (target.type === 'despesa') {
                        const newBudget = this.db.budgets.find(b => b.category.toLowerCase() === (target.category || '').toLowerCase());
                        if (newBudget) {
                            newBudget.spent += target.amount;
                        }
                    }

                    applied = target;
                    this.lastAction = { type: 'transaction', item: target, timestamp: Date.now() };
                }
                break;
            }

            case 'delete_transaction':
            case 'undo': {
                let targetId = action.data?.id;
                let targetIndex = -1;

                if (targetId) {
                    targetIndex = this.db.transactions.findIndex(t => t.id === targetId);
                } else if (this.lastAction && this.lastAction.type === 'transaction' && this.lastAction.item) {
                    targetIndex = this.db.transactions.findIndex(t => t.id === this.lastAction.item.id);
                } else {
                    // Procura a transação manual mais recente
                    targetIndex = this.db.transactions.findIndex(t => !t.pluggyId);
                    if (targetIndex === -1 && this.db.transactions.length > 0) {
                        targetIndex = 0;
                    }
                }

                if (targetIndex !== -1) {
                    const removed = this.db.transactions.splice(targetIndex, 1)[0];
                    if (removed.type === 'despesa') {
                        const budget = this.db.budgets.find(b => b.category.toLowerCase() === (removed.category || '').toLowerCase());
                        if (budget) {
                            budget.spent = Math.max(0, budget.spent - (removed.amount || 0));
                        }
                    }
                    applied = { deleted: true, ...removed };
                    this.lastAction = null;
                } else if (this.lastAction && this.lastAction.type === 'event' && this.lastAction.item) {
                    const evIndex = this.db.events.findIndex(e => e.id === this.lastAction.item.id);
                    if (evIndex !== -1) {
                        const removed = this.db.events.splice(evIndex, 1)[0];
                        applied = { deleted: true, ...removed };
                        this.lastAction = null;
                    }
                } else if (this.lastAction && this.lastAction.type === 'task' && this.lastAction.item) {
                    const tkIndex = this.db.tasks.findIndex(t => t.id === this.lastAction.item.id);
                    if (tkIndex !== -1) {
                        const removed = this.db.tasks.splice(tkIndex, 1)[0];
                        applied = { deleted: true, ...removed };
                        this.lastAction = null;
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
                this.lastAction = { type: 'event', item: applied, timestamp: Date.now() };
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
                this.lastAction = { type: 'task', item: applied, timestamp: Date.now() };
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
                this.lastAction = { type: 'debt', item: applied, timestamp: Date.now() };
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
     * Retorna a última ação realizada pelo KIT
     */
    getLastAction() {
        return this.lastAction;
    }

    /**
     * Resumo amigável da última ação para injetar no prompt do Gemini
     */
    getLastActionSummary() {
        if (!this.lastAction || !this.lastAction.item) {
            const recentManual = this.db.transactions?.find(t => !t.pluggyId);
            if (recentManual) {
                return `Última transação registrada: [${(recentManual.type || 'despesa').toUpperCase()}] R$ ${Number(recentManual.amount).toFixed(2)} - "${recentManual.description}" (Categoria: ${recentManual.category}) - ID: ${recentManual.id}`;
            }
            return 'Nenhuma transação recente foi registrada pelo KIT ainda.';
        }
        const item = this.lastAction.item;
        if (this.lastAction.type === 'transaction') {
            return `Última transação registrada: [${(item.type || 'despesa').toUpperCase()}] R$ ${Number(item.amount).toFixed(2)} - "${item.description}" (Categoria: ${item.category}) - ID: ${item.id}`;
        } else if (this.lastAction.type === 'event') {
            return `Último compromisso agendado: "${item.title}" em ${item.date} às ${item.startTime} - ID: ${item.id}`;
        } else if (this.lastAction.type === 'task') {
            return `Última tarefa criada: "${item.title}" (Prioridade: ${item.priority}) - ID: ${item.id}`;
        }
        return 'Ação executiva recente gravada no sistema.';
    }

    /**
     * Retorna resumo das mensagens recentes de chat para contexto da IA
     */
    getRecentChatSummary(limit = 4) {
        if (!this.db.chatMessages || this.db.chatMessages.length === 0) return '';
        const recent = this.db.chatMessages.slice(-limit);
        return recent.map(m => `${m.sender === 'user' ? 'Usuário' : 'KIT'}: "${(m.text || '').replace(/<!--KIT_ACTION:.*?-->/gs, '').trim()}"`).join('\n');
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
