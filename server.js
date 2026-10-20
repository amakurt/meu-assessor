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

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// Serve static frontend files
app.use(express.static(path.join(__dirname)));

// Simulated in-memory database
const db = {
    transactions: [
        { id: 'tx-1', type: 'receita', description: 'Consultoria Alpha', amount: 14500.0, category: 'Serviços Prestados', status: 'conciliado', profile: 'business' },
        { id: 'tx-2', type: 'despesa', description: 'Almoço Executivo Faria Lima', amount: 74.5, category: 'Alimentação', status: 'conciliado', profile: 'personal' },
        { id: 'tx-3', type: 'despesa', description: 'DAS Tributos', amount: 2850.0, category: 'Impostos & Tributos', status: 'pendente', profile: 'business' }
    ],
    events: [
        { id: 'ev-1', title: 'Reunião com Ana Prado', date: '2026-10-19', startTime: '15:00', endTime: '16:00', location: 'Faria Lima', hasMeet: false },
        { id: 'ev-2', title: 'Alinhamento com Sócios', date: '2026-10-19', startTime: '17:30', endTime: '18:15', location: 'Google Meet', hasMeet: true, meetUrl: 'https://meet.google.com/xyz-meu-assessor' }
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
        { id: 'bil-1', debtor: 'Lucas Alencar', amount: 350.0, url: 'https://meuassessor.com/pay/bil-1', status: 'ativo' }
    ],
    researches: [
        {
            id: 'res-1',
            title: 'Análise Comparativa: Melhores Cartões PJ com Cashback 2026',
            summary: 'Avaliamos C6 Bank, Inter PJ e Cora. O C6 oferece 1.5% cashback direto na conta corrente PJ, sendo a melhor taxa para seu volume.',
            sources: ['https://valor.globo.com/financas', 'https://c6bank.com.br/pj'],
            status: 'entregue',
            date: '19/10/2026'
        },
        {
            id: 'res-2',
            title: 'Cotação & Menor Preço: MacBook Pro M3 Max 36GB',
            summary: 'Menor preço encontrado no Mercado Livre Oficial por R$ 21.499 à vista com entrega Full em SP no mesmo dia.',
            sources: ['https://mercadolivre.com.br/apple-store'],
            status: 'entregue',
            date: '18/10/2026'
        }
    ],
    lists: [
        {
            id: 'lst-1',
            title: 'Compras de Mercado & Adega',
            items: [
                { id: 'itm-1', text: 'Café Especial Torra Média', checked: true },
                { id: 'itm-2', text: 'Vinho Tinto Cabernet Reserva', checked: false },
                { id: 'itm-3', text: 'Azeite Extra Virgem 0.2%', checked: false }
            ]
        }
    ],
    cloudDrive: [
        { id: 'fld-1', name: 'Contratos Clientes 2026', filesCount: 14, totalSize: '34.2 MB', isPublic: true, publicUrl: 'https://meuassessor.com/drive/fld-1' },
        { id: 'fld-2', name: 'Comprovantes Fiscais & DAS', filesCount: 38, totalSize: '48.9 MB', isPublic: false, publicUrl: null },
        { id: 'fld-3', name: 'Identidade Visual & Logos', filesCount: 9, totalSize: '18.1 MB', isPublic: true, publicUrl: 'https://meuassessor.com/drive/fld-3' }
    ]
};

// 1. Health & Status Endpoint
app.get('/api/status', (req, res) => {
    res.json({
        status: 'online',
        service: 'Meu Assessor OS',
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
    res.json({ success: true, data: db.transactions });
});

// 5. REST API: Agenda & Calendar
app.get('/api/agenda', (req, res) => {
    res.json({ success: true, data: db.events });
});

// 6. REST API: Tasks
app.get('/api/tarefas', (req, res) => {
    res.json({ success: true, data: db.tasks });
});

// 7. REST API: Budgets (Tetos de Gastos)
app.get('/api/orcamentos', (req, res) => {
    res.json({ success: true, data: db.budgets });
});

// 8. REST API: Debts & Receivables (Quem te Deve)
app.get('/api/cobrancas', (req, res) => {
    res.json({ success: true, debts: db.debts, billingLinks: db.billingLinks });
});

// 9. REST API: Research Desk (Ítalo)
app.get('/api/pesquisas', (req, res) => {
    res.json({ success: true, data: db.researches });
});

// 10. REST API: Checklists & Ideas (Luna)
app.get('/api/listas', (req, res) => {
    res.json({ success: true, lists: db.lists });
});

// 11. REST API: Cloud Drive Folders (Luna)
app.get('/api/drive/pastas', (req, res) => {
    res.json({ success: true, data: db.cloudDrive });
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

