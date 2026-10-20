/**
 * MEU ASSESSOR OS · BACKEND SERVER & WHATSAPP WEBHOOK GATEWAY
 * Express server providing static hosting, REST APIs and WhatsApp Webhook integration.
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const whatsappService = require('./js/whatsapp-service');
const geminiService = require('./js/gemini-service');
const dbService = require('./js/db-service');
const pluggyService = require('./js/pluggy-service');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend files with anti-cache headers for instant updates
app.use(express.static(path.join(__dirname), {
    etag: false,
    maxAge: 0,
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('.html') || filePath.endsWith('.js') || filePath.endsWith('.css')) {
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
        }
    }
}));

// 0. AUTHENTICATION & LOGIN GATEWAY
const activeSessions = new Set();
const KIT_USER = process.env.KIT_USER || 'amauri';
const KIT_PASS = process.env.KIT_PASS || 'kit2026';

app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;
    if (username === KIT_USER && password === KIT_PASS) {
        const token = crypto.randomBytes(32).toString('hex');
        activeSessions.add(token);
        return res.json({
            success: true,
            token,
            user: { name: 'Amauri', username: KIT_USER }
        });
    }
    return res.status(401).json({ error: 'Usuário ou senha incorretos' });
});

app.get('/api/auth/check', (req, res) => {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.replace('Bearer ', '').trim();
    if (activeSessions.has(token)) {
        return res.json({ authenticated: true, user: { name: 'Amauri', username: KIT_USER } });
    }
    return res.status(401).json({ authenticated: false });
});

app.post('/api/auth/logout', (req, res) => {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.replace('Bearer ', '').trim();
    activeSessions.delete(token);
    res.json({ success: true });
});

// REAL-TIME SERVER-SENT EVENTS (SSE) LIVE SYNC
app.get('/api/live-sync', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Crucial para Nginx não segurar o SSE
    if (res.flushHeaders) res.flushHeaders();

    dbService.addSseClient(res);
    res.write(`event: initial_state\ndata: ${JSON.stringify(dbService.getAll())}\n\n`);
});

// FULL UNIFIED DATA & ACTION API
app.get('/api/data', (req, res) => {
    res.json({ success: true, data: dbService.getAll() });
});

app.post('/api/action', (req, res) => {
    const applied = dbService.applyAction(req.body);
    res.json({ success: true, item: applied });
});

// 1. Health & Status Endpoint
app.get('/api/status', (req, res) => {
    res.json({
        status: 'online',
        service: 'KIT OS',
        version: '2.0.0',
        whatsappConnected: true,
        advisors: [
            { name: 'Theo', role: 'Diretor de Operações', photo: 'img/advisors/theo.png' },
            { name: 'Martin', role: 'Gestor Financeiro', photo: 'img/advisors/martin.png' },
            { name: 'Sofi', role: 'Secretária Executiva', photo: 'img/advisors/sofi.png' },
            { name: 'Luna', role: 'Docs & Tarefas', photo: 'img/advisors/luna.png' },
            { name: 'Ítalo', role: 'Estagiário de Pesquisa', photo: 'img/advisors/italo.png' },
            { name: 'Rita', role: 'Assistente Fiscal', photo: 'img/advisors/rita.png' }
        ],
        activeBancosOpenFinance: 114,
        featuresCount: 36
    });
});

// 2. WhatsApp Baileys Status & QR Code API
app.get('/api/whatsapp/status', (req, res) => {
    res.json(whatsappService.getStatus());
});

app.post('/api/whatsapp/connect', async (req, res) => {
    try {
        const status = await whatsappService.init();
        res.json(status);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/whatsapp/disconnect', async (req, res) => {
    try {
        const status = await whatsappService.disconnect();
        res.json(status);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/whatsapp/test', async (req, res) => {
    const { phone, message } = req.body;
    if (!phone || !message) {
        return res.status(400).json({ error: 'Telefone e mensagem são obrigatórios' });
    }
    try {
        await whatsappService.sendTestMessage(phone, message);
        res.json({ success: true, message: 'Mensagem de teste enviada com sucesso!' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 3. Gemini Configuration API
app.post('/api/config/gemini', (req, res) => {
    const { apiKey } = req.body;
    if (apiKey) {
        geminiService.setApiKey(apiKey);
        try {
            const envPath = path.join(__dirname, '.env');
            let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
            if (envContent.includes('GEMINI_API_KEY=')) {
                envContent = envContent.replace(/GEMINI_API_KEY=.*/, `GEMINI_API_KEY=${apiKey}`);
            } else {
                envContent += `\nGEMINI_API_KEY=${apiKey}\n`;
            }
            fs.writeFileSync(envPath, envContent);
        } catch (e) {}
    }
    res.json({ success: true, configured: geminiService.isConfigured() });
});


// 4. REST API: Finances & Open Finance
app.get('/api/financas', (req, res) => {
    res.json({ success: true, data: dbService.getAll().transactions });
});

// OPEN FINANCE (PLUGGY) REST API
app.get('/api/open-finance/status', (req, res) => {
    res.json({
        configured: pluggyService.isConfigured(),
        clientId: process.env.PLUGGY_CLIENT_ID ? 'Configurado' : 'Pendente'
    });
});

app.post('/api/open-finance/configure', (req, res) => {
    const { clientId, clientSecret } = req.body;
    if (clientId && clientSecret) {
        pluggyService.setCredentials(clientId, clientSecret);
        try {
            const envPath = path.join(__dirname, '.env');
            let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
            if (envContent.includes('PLUGGY_CLIENT_ID=')) {
                envContent = envContent.replace(/PLUGGY_CLIENT_ID=.*/, `PLUGGY_CLIENT_ID=${clientId}`);
            } else {
                envContent += `\nPLUGGY_CLIENT_ID=${clientId}\n`;
            }
            if (envContent.includes('PLUGGY_CLIENT_SECRET=')) {
                envContent = envContent.replace(/PLUGGY_CLIENT_SECRET=.*/, `PLUGGY_CLIENT_SECRET=${clientSecret}`);
            } else {
                envContent += `\nPLUGGY_CLIENT_SECRET=${clientSecret}\n`;
            }
            fs.writeFileSync(envPath, envContent);
        } catch (e) {
            console.error('[OpenFinance] Erro ao salvar .env:', e.message);
        }
    }
    res.json({ success: true, configured: pluggyService.isConfigured() });
});

const handleConnectToken = async (req, res) => {
    try {
        const oauthRedirectUri = req.body?.oauthRedirectUri || req.query?.oauthRedirectUri || (req.headers['x-forwarded-proto'] === 'https' ? `https://${req.get('host')}/` : null);
        const accessToken = await pluggyService.createConnectToken({ oauthRedirectUri });
        res.json({ success: true, accessToken });
    } catch (err) {
        console.error('[OpenFinance] Erro ao gerar Connect Token:', err.message);
        res.status(500).json({ success: false, error: err.message });
    }
};

app.get('/api/connect-token', handleConnectToken);
app.post('/api/connect-token', handleConnectToken);
app.get('/api/open-finance/connect-token', handleConnectToken);
app.post('/api/open-finance/connect-token', handleConnectToken);

app.post('/api/open-finance/sync', async (req, res) => {
    const { itemId } = req.body;
    if (!itemId) {
        return res.status(400).json({ error: 'itemId é obrigatório para sincronização.' });
    }
    try {
        const result = await pluggyService.syncItem(itemId);
        res.json(result);
    } catch (err) {
        console.error('[OpenFinance] Erro ao sincronizar item:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// WEBHOOK OFICIAL DA PLUGGY (Eventos em tempo real: item/created, transactions/created, etc.)
const handlePluggyWebhook = async (req, res) => {
    console.log('[Pluggy Webhook] Evento recebido:', req.body);
    const event = req.body?.event;
    const itemId = req.body?.itemId || req.body?.data?.itemId || req.body?.data?.item?.id;

    if (itemId) {
        try {
            console.log(`[Pluggy Webhook] Disparando auto-sincronização do item: ${itemId} (evento: ${event})`);
            await pluggyService.syncItem(itemId);
        } catch (e) {
            console.error('[Pluggy Webhook] Erro ao sincronizar item do webhook:', e.message);
        }
    }

    res.status(200).json({ received: true });
};

app.post('/api/open-finance/webhook', handlePluggyWebhook);
app.post('/api/pluggy/webhook', handlePluggyWebhook);


// 5. REST API: Agenda & Calendar
app.get('/api/agenda', (req, res) => {
    res.json({ success: true, data: dbService.getAll().events });
});

// 6. REST API: Tasks
app.get('/api/tarefas', (req, res) => {
    res.json({ success: true, data: dbService.getAll().tasks });
});

// 7. REST API: Budgets (Tetos de Gastos)
app.get('/api/orcamentos', (req, res) => {
    res.json({ success: true, data: dbService.getAll().budgets });
});

// 8. REST API: Debts & Receivables (Quem te Deve)
app.get('/api/cobrancas', (req, res) => {
    const data = dbService.getAll();
    res.json({ success: true, debts: data.debts, billingLinks: data.billingLinks });
});

// 9. REST API: Research Desk (Ítalo)
app.get('/api/pesquisas', (req, res) => {
    res.json({ success: true, data: dbService.getAll().researches });
});

// 10. REST API: Checklists & Ideas (Luna)
app.get('/api/listas', (req, res) => {
    res.json({ success: true, lists: dbService.getAll().lists });
});

// 11. REST API: Cloud Drive Folders (Luna)
app.get('/api/drive/pastas', (req, res) => {
    res.json({ success: true, data: dbService.getAll().cloudDrive });
});

// 12. REST API: Direct AI Chat Endpoint (Powered by Gemini Pro)
app.post('/api/chat', async (req, res) => {
    const { message, senderPhone } = req.body;
    if (!message) {
        return res.status(400).json({ error: 'Mensagem obrigatória' });
    }

    let reply = '';
    let advisor = 'Theo';

    if (geminiService.isConfigured()) {
        try {
            reply = await geminiService.generateAdvisorResponse(message);
            // Extrai o nome do assessor da resposta se existir
            if (reply.includes('Martin')) advisor = 'Martin';
            else if (reply.includes('Sofi')) advisor = 'Sofi';
            else if (reply.includes('Luna')) advisor = 'Luna';
            else if (reply.includes('Ítalo') || reply.includes('Italo')) advisor = 'Ítalo';
            else if (reply.includes('Rita')) advisor = 'Rita';
        } catch (e) {
            console.error('[Chat API] Erro no Gemini:', e.message);
        }
    }

    if (!reply) {
        reply = `*KIT* · Seu Assessor Pessoal\n\nDemanda registrada com sucesso! Estou organizando tudo nos seus relatórios.\n\n[✏️ Editar]  [↩️ Desfazer] (ativo por 24h)`;
    }

    res.json({
        success: true,
        advisor: 'KIT',
        reply,
        timestamp: new Date().toISOString()
    });
});

app.listen(PORT, async () => {
    console.log(`=======================================================`);
    console.log(`🚀 KIT OS · SEU ASSESSOR EXECUTIVO RODANDO COM SUCESSO!`);
    console.log(`👉 Acesse a plataforma: http://localhost:${PORT}`);
    console.log(`👉 Status WhatsApp:    http://localhost:${PORT}/api/whatsapp/status`);
    console.log(`👉 Gemini Pro Ativo:    ${geminiService.isConfigured() ? 'SIM (Google Gemini Pro/Flash)' : 'NÃO'}`);
    console.log(`=======================================================`);

    console.log(`👉 Gemini Pro Ativo:    ${geminiService.isConfigured() ? 'SIM (Google Gemini Pro/Flash)' : 'NÃO'}`);
    console.log(`=======================================================`);

    // Auto connect WhatsApp se houver sessão anterior salva
    const authDir = path.join(__dirname, 'auth_info_baileys');
    if (fs.existsSync(authDir) && fs.readdirSync(authDir).length > 0) {
        console.log('[WhatsApp] Sessão existente detectada. Conectando automaticamente...');
        whatsappService.init().catch(err => console.error('[WhatsApp] Erro no auto-connect:', err.message));
    }
});

