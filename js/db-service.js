/**
 * KIT OS · SQLITE DATABASE SERVICE (WAL MODE)
 * Banco de dados SQLite de alta performance integrado via better-sqlite3.
 * Latência sub-milissegundo, 0 MB de consumo de fundo, compatível com LibSQL/Turso.
 */

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const DB_DIR = path.join(__dirname, '..', 'data');
const DB_FILE = path.join(DB_DIR, 'kit.db');
const LEGACY_JSON_PATH = path.join(DB_DIR, 'db.json');

const INITIAL_BUDGETS = [
    { category: 'Alimentação', ceiling: 3000.0, spent: 0, profile: 'personal' },
    { category: 'Transporte & Viagens', ceiling: 1800.0, spent: 0, profile: 'personal' },
    { category: 'Compras & Serviços', ceiling: 5000.0, spent: 0, profile: 'personal' },
    { category: 'Saúde & Farmácia', ceiling: 1500.0, spent: 0, profile: 'personal' }
];

class DbService {
    constructor() {
        if (!fs.existsSync(DB_DIR)) {
            fs.mkdirSync(DB_DIR, { recursive: true });
        }

        // Inicializa o banco de dados SQLite
        this.sqlite = new Database(DB_FILE);

        // Ativa o WAL Mode (Write-Ahead Logging) para alta concorrência e velocidade extrema
        this.sqlite.pragma('journal_mode = WAL');
        this.sqlite.pragma('synchronous = NORMAL');
        this.sqlite.pragma('foreign_keys = ON');

        this.sseClients = new Set();
        this.lastAction = null;

        this._createTables();
        this._migrateFromLegacyJson();
        this._prepareStatements();
    }

    _createTables() {
        this.sqlite.exec(`
            CREATE TABLE IF NOT EXISTS transactions (
                id TEXT PRIMARY KEY,
                type TEXT NOT NULL,
                description TEXT NOT NULL,
                amount REAL NOT NULL,
                category TEXT NOT NULL,
                status TEXT NOT NULL,
                profile TEXT DEFAULT 'personal',
                date TEXT NOT NULL,
                paymentMethod TEXT,
                registeredBy TEXT,
                pluggyId TEXT,
                createdAt INTEGER NOT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_transactions_pluggyId ON transactions(pluggyId);
            CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
            CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category);
            CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);

            CREATE TABLE IF NOT EXISTS events (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                date TEXT NOT NULL,
                startTime TEXT NOT NULL,
                endTime TEXT NOT NULL,
                location TEXT,
                hasMeet INTEGER DEFAULT 0,
                meetUrl TEXT,
                participants TEXT,
                createdAt INTEGER NOT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_events_date ON events(date);

            CREATE TABLE IF NOT EXISTS tasks (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'todo',
                priority TEXT NOT NULL DEFAULT 'normal',
                dueDate TEXT,
                completed INTEGER DEFAULT 0,
                createdAt INTEGER NOT NULL
            );

            CREATE TABLE IF NOT EXISTS budgets (
                category TEXT PRIMARY KEY,
                ceiling REAL NOT NULL,
                spent REAL NOT NULL DEFAULT 0,
                profile TEXT DEFAULT 'personal'
            );

            CREATE TABLE IF NOT EXISTS debts (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                amount REAL NOT NULL,
                reason TEXT,
                date TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'pendente',
                createdAt INTEGER NOT NULL
            );

            CREATE TABLE IF NOT EXISTS billing_links (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                amount REAL NOT NULL,
                url TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'ativo',
                createdAt INTEGER NOT NULL
            );

            CREATE TABLE IF NOT EXISTS researches (
                id TEXT PRIMARY KEY,
                query TEXT NOT NULL,
                summary TEXT,
                sources TEXT,
                status TEXT NOT NULL DEFAULT 'concluido',
                createdAt INTEGER NOT NULL
            );

            CREATE TABLE IF NOT EXISTS lists (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                items TEXT,
                createdAt INTEGER NOT NULL
            );

            CREATE TABLE IF NOT EXISTS cloud_drive (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                size INTEGER NOT NULL,
                type TEXT,
                url TEXT,
                createdAt INTEGER NOT NULL
            );

            CREATE TABLE IF NOT EXISTS chat_messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                sender TEXT NOT NULL,
                advisorKey TEXT,
                text TEXT NOT NULL,
                isAudio INTEGER DEFAULT 0,
                audioDuration TEXT,
                audioTranscript TEXT,
                timestamp INTEGER NOT NULL
            );
        `);

        // Garante que orçamentos padrão existam
        const countBudgets = this.sqlite.prepare('SELECT COUNT(*) as count FROM budgets').get().count;
        if (countBudgets === 0) {
            const insertBudget = this.sqlite.prepare('INSERT INTO budgets (category, ceiling, spent, profile) VALUES (?, ?, ?, ?)');
            INITIAL_BUDGETS.forEach(b => insertBudget.run(b.category, b.ceiling, b.spent, b.profile));
        }
    }

    _prepareStatements() {
        this.stmtInsertTx = this.sqlite.prepare(`
            INSERT INTO transactions (id, type, description, amount, category, status, profile, date, paymentMethod, registeredBy, pluggyId, createdAt)
            VALUES (@id, @type, @description, @amount, @category, @status, @profile, @date, @paymentMethod, @registeredBy, @pluggyId, @createdAt)
        `);

        this.stmtUpdateTx = this.sqlite.prepare(`
            UPDATE transactions 
            SET amount = @amount, description = @description, category = @category, type = @type
            WHERE id = @id
        `);

        this.stmtDeleteTx = this.sqlite.prepare('DELETE FROM transactions WHERE id = ?');
        this.stmtGetTxById = this.sqlite.prepare('SELECT * FROM transactions WHERE id = ?');
        this.stmtGetRecentManualTx = this.sqlite.prepare('SELECT * FROM transactions WHERE pluggyId IS NULL ORDER BY createdAt DESC LIMIT 1');

        this.stmtInsertEvent = this.sqlite.prepare(`
            INSERT INTO events (id, title, date, startTime, endTime, location, hasMeet, meetUrl, participants, createdAt)
            VALUES (@id, @title, @date, @startTime, @endTime, @location, @hasMeet, @meetUrl, @participants, @createdAt)
        `);

        this.stmtDeleteEvent = this.sqlite.prepare('DELETE FROM events WHERE id = ?');

        this.stmtInsertTask = this.sqlite.prepare(`
            INSERT INTO tasks (id, title, status, priority, dueDate, completed, createdAt)
            VALUES (@id, @title, @status, @priority, @dueDate, @completed, @createdAt)
        `);

        this.stmtDeleteTask = this.sqlite.prepare('DELETE FROM tasks WHERE id = ?');

        this.stmtInsertDebt = this.sqlite.prepare(`
            INSERT INTO debts (id, name, amount, reason, date, status, createdAt)
            VALUES (@id, @name, @amount, @reason, @date, @status, @createdAt)
        `);

        this.stmtInsertChat = this.sqlite.prepare(`
            INSERT INTO chat_messages (sender, advisorKey, text, isAudio, audioDuration, audioTranscript, timestamp)
            VALUES (@sender, @advisorKey, @text, @isAudio, @audioDuration, @audioTranscript, @timestamp)
        `);
    }

    /**
     * Migra automaticamente dados de db.json antigo para SQLite na primeira execução
     */
    _migrateFromLegacyJson() {
        try {
            const txCount = this.sqlite.prepare('SELECT COUNT(*) as count FROM transactions').get().count;
            if (txCount > 0 || !fs.existsSync(LEGACY_JSON_PATH)) return;

            const raw = fs.readFileSync(LEGACY_JSON_PATH, 'utf8');
            const data = JSON.parse(raw);
            console.log(`[SQLite] Iniciando migração de db.json para kit.db...`);

            const insertTx = this.sqlite.prepare(`
                INSERT OR IGNORE INTO transactions (id, type, description, amount, category, status, profile, date, paymentMethod, registeredBy, pluggyId, createdAt)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);

            const insertEvent = this.sqlite.prepare(`
                INSERT OR IGNORE INTO events (id, title, date, startTime, endTime, location, hasMeet, meetUrl, participants, createdAt)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);

            const insertTask = this.sqlite.prepare(`
                INSERT OR IGNORE INTO tasks (id, title, status, priority, dueDate, completed, createdAt)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `);

            const insertDebt = this.sqlite.prepare(`
                INSERT OR IGNORE INTO debts (id, name, amount, reason, date, status, createdAt)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `);

            const insertChat = this.sqlite.prepare(`
                INSERT INTO chat_messages (sender, advisorKey, text, isAudio, audioDuration, audioTranscript, timestamp)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `);

            const migrateAll = this.sqlite.transaction(() => {
                if (Array.isArray(data.transactions)) {
                    data.transactions.forEach(t => {
                        insertTx.run(
                            t.id || `tx-${Date.now()}-${Math.random()}`,
                            t.type || 'despesa',
                            t.description || 'Lançamento',
                            Math.abs(parseFloat(t.amount) || 0),
                            t.category || 'Geral',
                            t.status || 'conciliado',
                            t.profile || 'personal',
                            t.date || new Date().toISOString().split('T')[0],
                            t.paymentMethod || 'Cartão',
                            t.registeredBy || 'Open Finance',
                            t.pluggyId || null,
                            t.createdAt || Date.now()
                        );
                    });
                }

                if (Array.isArray(data.events)) {
                    data.events.forEach(e => {
                        insertEvent.run(
                            e.id || `ev-${Date.now()}`,
                            e.title || 'Reunião',
                            e.date || new Date().toISOString().split('T')[0],
                            e.startTime || '10:00',
                            e.endTime || '11:00',
                            e.location || 'Meet',
                            e.hasMeet ? 1 : 0,
                            e.meetUrl || null,
                            e.participants || '',
                            e.createdAt || Date.now()
                        );
                    });
                }

                if (Array.isArray(data.tasks)) {
                    data.tasks.forEach(tk => {
                        insertTask.run(
                            tk.id || `tk-${Date.now()}`,
                            tk.title || tk.text || 'Tarefa',
                            tk.status || 'todo',
                            tk.priority || 'normal',
                            tk.dueDate || null,
                            tk.completed ? 1 : 0,
                            tk.createdAt || Date.now()
                        );
                    });
                }

                if (Array.isArray(data.debts)) {
                    data.debts.forEach(d => {
                        insertDebt.run(
                            d.id || `debt-${Date.now()}`,
                            d.name || 'Contato',
                            parseFloat(d.amount) || 0,
                            d.reason || '',
                            d.date || new Date().toISOString().split('T')[0],
                            d.status || 'pendente',
                            d.createdAt || Date.now()
                        );
                    });
                }

                if (Array.isArray(data.chatMessages)) {
                    data.chatMessages.forEach(m => {
                        insertChat.run(
                            m.sender || 'user',
                            m.advisorKey || null,
                            m.text || '',
                            m.isAudio ? 1 : 0,
                            m.audioDuration || null,
                            m.audioTranscript || null,
                            m.timestamp || Date.now()
                        );
                    });
                }
            });

            migrateAll();
            const countAfter = this.sqlite.prepare('SELECT COUNT(*) as count FROM transactions').get().count;
            console.log(`[SQLite] ✅ Migração concluída com sucesso! ${countAfter} transações migradas para kit.db.`);

            // Cria backup do JSON antigo
            fs.copyFileSync(LEGACY_JSON_PATH, `${LEGACY_JSON_PATH}.bak`);
        } catch (err) {
            console.error('[SQLite] Erro ao migrar db.json:', err.message);
        }
    }

    /**
     * Retorna todos os dados consolidados no formato que o frontend espera
     */
    getAll() {
        const transactions = this.sqlite.prepare('SELECT * FROM transactions ORDER BY date DESC, createdAt DESC').all();
        const events = this.sqlite.prepare('SELECT * FROM events ORDER BY date ASC, startTime ASC').all();
        const tasks = this.sqlite.prepare('SELECT * FROM tasks ORDER BY createdAt DESC').all();
        const budgets = this.sqlite.prepare('SELECT * FROM budgets').all();
        const debts = this.sqlite.prepare('SELECT * FROM debts ORDER BY createdAt DESC').all();
        const billingLinks = this.sqlite.prepare('SELECT * FROM billing_links ORDER BY createdAt DESC').all();
        const researches = this.sqlite.prepare('SELECT * FROM researches ORDER BY createdAt DESC').all();
        const lists = this.sqlite.prepare('SELECT * FROM lists ORDER BY createdAt DESC').all();
        const cloudDrive = this.sqlite.prepare('SELECT * FROM cloud_drive ORDER BY createdAt DESC').all();
        const chatMessages = this.sqlite.prepare('SELECT * FROM chat_messages ORDER BY id ASC').all();

        // Mapeia booleans
        events.forEach(e => { e.hasMeet = !!e.hasMeet; });
        tasks.forEach(t => { e = !!t.completed; });
        chatMessages.forEach(m => { m.isAudio = !!m.isAudio; });

        return {
            transactions,
            events,
            tasks,
            budgets,
            debts,
            billingLinks,
            researches,
            lists,
            cloudDrive,
            chatMessages
        };
    }

    addSseClient(res) {
        this.sseClients.add(res);
        res.on('close', () => {
            this.sseClients.delete(res);
        });
    }

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

    applyAction(action) {
        if (!action || !action.type) return null;

        let applied = null;
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];

        switch (action.type) {
            case 'transaction': {
                const txData = action.data || {};
                const amount = Math.abs(parseFloat(txData.amount) || 0);
                applied = {
                    id: `tx-${Date.now()}`,
                    type: txData.type || 'despesa',
                    description: txData.description || 'Despesa registrada via WhatsApp',
                    amount: amount,
                    category: txData.category || 'Geral',
                    status: 'conciliado',
                    profile: txData.profile || 'personal',
                    date: txData.date || dateStr,
                    paymentMethod: txData.paymentMethod || 'Open Finance',
                    registeredBy: txData.registeredBy || 'WhatsApp (KIT)',
                    pluggyId: txData.pluggyId || null,
                    createdAt: Date.now()
                };

                this.stmtInsertTx.run(applied);

                // Atualiza o orçamento gasto se for despesa
                if (applied.type === 'despesa') {
                    this.sqlite.prepare(`
                        UPDATE budgets SET spent = spent + ? 
                        WHERE LOWER(category) = LOWER(?)
                    `).run(applied.amount, applied.category);
                }

                this.lastAction = { type: 'transaction', item: applied, timestamp: Date.now() };
                break;
            }

            case 'update_transaction': {
                const updData = action.data || {};
                let target = null;

                if (updData.id) {
                    target = this.stmtGetTxById.get(updData.id);
                }
                if (!target && this.lastAction && this.lastAction.type === 'transaction' && this.lastAction.item) {
                    target = this.stmtGetTxById.get(this.lastAction.item.id);
                }
                if (!target) {
                    target = this.stmtGetRecentManualTx.get();
                }

                if (target) {
                    // Reverte gasto anterior no orçamento se era despesa
                    if (target.type === 'despesa') {
                        this.sqlite.prepare(`
                            UPDATE budgets SET spent = MAX(0, spent - ?) 
                            WHERE LOWER(category) = LOWER(?)
                        `).run(target.amount, target.category);
                    }

                    const newAmount = (updData.amount !== undefined && updData.amount !== null && !isNaN(updData.amount))
                        ? Math.abs(parseFloat(updData.amount))
                        : target.amount;
                    const newDesc = updData.description || target.description;
                    const newCat = updData.category || target.category;
                    const newType = updData.type || target.type;

                    this.stmtUpdateTx.run({
                        id: target.id,
                        amount: newAmount,
                        description: newDesc,
                        category: newCat,
                        type: newType
                    });

                    // Aplica novo valor ao orçamento
                    if (newType === 'despesa') {
                        this.sqlite.prepare(`
                            UPDATE budgets SET spent = spent + ? 
                            WHERE LOWER(category) = LOWER(?)
                        `).run(newAmount, newCat);
                    }

                    applied = { ...target, amount: newAmount, description: newDesc, category: newCat, type: newType };
                    this.lastAction = { type: 'transaction', item: applied, timestamp: Date.now() };
                }
                break;
            }

            case 'delete_transaction':
            case 'undo': {
                let target = null;
                const targetId = action.data?.id;

                if (targetId) {
                    target = this.stmtGetTxById.get(targetId);
                } else if (this.lastAction && this.lastAction.type === 'transaction' && this.lastAction.item) {
                    target = this.stmtGetTxById.get(this.lastAction.item.id);
                } else {
                    target = this.stmtGetRecentManualTx.get();
                }

                if (target) {
                    this.stmtDeleteTx.run(target.id);
                    if (target.type === 'despesa') {
                        this.sqlite.prepare(`
                            UPDATE budgets SET spent = MAX(0, spent - ?) 
                            WHERE LOWER(category) = LOWER(?)
                        `).run(target.amount, target.category);
                    }
                    applied = { deleted: true, ...target };
                    this.lastAction = null;
                } else if (this.lastAction && this.lastAction.type === 'event' && this.lastAction.item) {
                    this.stmtDeleteEvent.run(this.lastAction.item.id);
                    applied = { deleted: true, ...this.lastAction.item };
                    this.lastAction = null;
                } else if (this.lastAction && this.lastAction.type === 'task' && this.lastAction.item) {
                    this.stmtDeleteTask.run(this.lastAction.item.id);
                    applied = { deleted: true, ...this.lastAction.item };
                    this.lastAction = null;
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
                    hasMeet: evData.hasMeet ? 1 : 0,
                    meetUrl: evData.hasMeet ? `https://meet.google.com/kit-${Math.random().toString(36).substring(2, 6)}` : null,
                    participants: evData.participants || '',
                    createdAt: Date.now()
                };
                this.stmtInsertEvent.run(applied);
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
                    dueDate: tkData.dueDate || dateStr,
                    completed: 0,
                    createdAt: Date.now()
                };
                this.stmtInsertTask.run(applied);
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
                    status: 'pendente',
                    createdAt: Date.now()
                };
                this.stmtInsertDebt.run(applied);
                this.lastAction = { type: 'debt', item: applied, timestamp: Date.now() };
                break;
            }

            default:
                console.warn('[DB] Tipo de ação desconhecido:', action.type);
        }

        if (applied) {
            console.log(`[SQLite] Ação aplicada: [${action.type}]`, applied);
            this.broadcast('data_updated', {
                type: action.type,
                item: applied,
                fullDb: this.getAll()
            });
        }

        return applied;
    }

    getLastAction() {
        return this.lastAction;
    }

    getLastActionSummary() {
        if (!this.lastAction || !this.lastAction.item) {
            const recentManual = this.stmtGetRecentManualTx.get();
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

    getRecentChatSummary(limit = 6) {
        const rows = this.sqlite.prepare(`
            SELECT * FROM chat_messages ORDER BY id DESC LIMIT ?
        `).all(limit);

        if (rows.length === 0) return '';
        rows.reverse();
        return rows.map(m => `${m.sender === 'user' ? 'Usuário' : 'KIT'}: "${(m.text || '').replace(/<!--KIT_ACTION:.*?-->/gs, '').trim()}"`).join('\n');
    }

    addChatMessage(msg) {
        this.stmtInsertChat.run({
            sender: msg.sender || 'user',
            advisorKey: msg.advisorKey || null,
            text: msg.text || '',
            isAudio: msg.isAudio ? 1 : 0,
            audioDuration: msg.audioDuration || null,
            audioTranscript: msg.audioTranscript || null,
            timestamp: Date.now()
        });

        // Mantém histórico limpo limitando a 100 mensagens
        this.sqlite.exec(`
            DELETE FROM chat_messages WHERE id NOT IN (
                SELECT id FROM chat_messages ORDER BY id DESC LIMIT 100
            )
        `);

        this.broadcast('data_updated', {
            type: 'chat',
            item: msg,
            fullDb: this.getAll()
        });
    }
}

module.exports = new DbService();
