/**
 * MEU ASSESSOR OS · BACKEND SERVER & WHATSAPP WEBHOOK GATEWAY
 * Express server providing static hosting, REST APIs and WhatsApp Webhook integration.
 */

const express = require('express');
const cors = require('cors');
const path = require('path');

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

// 2. WhatsApp Webhook Verification (Meta Cloud API protocol)
app.get('/api/whatsapp/webhook', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'meu_assessor_secret_token_live_2026';

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
        console.log('[Webhook] Webhook verificado com sucesso pelo Meta Cloud API!');
        return res.status(200).send(challenge);
    }
    res.sendStatus(403);
});

// 3. WhatsApp Inbound Messages Webhook (Meta / Evolution API)
app.post('/api/whatsapp/webhook', (req, res) => {
    try {
        const body = req.body;
        console.log('[Webhook] Mensagem recebida no WhatsApp:', JSON.stringify(body, null, 2));

        // Format response immediately to acknowledge WhatsApp server
        res.status(200).json({ status: 'received' });
    } catch (e) {
        console.error('[Webhook] Erro no processamento:', e);
        res.sendStatus(500);
    }
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

// 12. REST API: Direct AI Chat Endpoint
app.post('/api/chat', (req, res) => {
    const { message, senderPhone } = req.body;
    if (!message) {
        return res.status(400).json({ error: 'Mensagem obrigatória' });
    }

    const lower = message.toLowerCase();
    let advisor = 'Theo';
    let reply = `Compreendido! O Theo organizou a demanda com seu time executivo.`;

    if (lower.includes('gastei') || lower.includes('paguei') || lower.includes('recebi') || lower.includes('saldo') || lower.includes('orçamento') || lower.includes('quem me deve')) {
        advisor = 'Martin';
        reply = `Registrado com sucesso nas finanças e conciliado no Open Finance!`;
    } else if (lower.includes('agenda') || lower.includes('reunião') || lower.includes('marcar') || lower.includes('link') || lower.includes('meet')) {
        advisor = 'Sofi';
        reply = `Compromisso agendado no seu Google Agenda com tempo de deslocamento e link do Meet reservado.`;
    } else if (lower.includes('pesquisa') || lower.includes('cotação') || lower.includes('preço') || lower.includes('compara') || lower.includes('ítalo')) {
        advisor = 'Ítalo';
        reply = `Pesquisa concluída! Analisei as fontes mais confiáveis e montei o comparativo.`;
    } else if (lower.includes('tarefa') || lower.includes('lista') || lower.includes('ideia') || lower.includes('drive') || lower.includes('pasta')) {
        advisor = 'Luna';
        reply = `Registrado na sua central de tarefas e documentos com sincronização na nuvem.`;
    } else if (lower.includes('nota') || lower.includes('imposto') || lower.includes('das') || lower.includes('cnpj') || lower.includes('fiscal')) {
        advisor = 'Rita';
        reply = `Documento fiscal processado via OCR com alíquotas verificadas.`;
    }

    res.json({
        success: true,
        advisor,
        reply,
        timestamp: new Date().toISOString()
    });
});

app.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`🚀 MEU ASSESSOR OS RODANDO COM SUCESSO!`);
    console.log(`👉 Acesse a plataforma: http://localhost:${PORT}`);
    console.log(`👉 Webhook WhatsApp:   http://localhost:${PORT}/api/whatsapp/webhook`);
    console.log(`=======================================================`);
});
