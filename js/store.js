/**
 * MEU ASSESSOR OS · STORE & LOCAL DATABASE (EXPANDED TO 36 OFFICIAL FUNCTIONALITIES)
 * State management with localStorage persistence and reactive event bus
 */

const STORAGE_KEY = 'meu_assessor_os_state_v2';

const DEFAULT_STATE = {
    user: {
        name: 'Amauri',
        nickname: 'Amauri',
        phone: '+55 (11) 98765-4321',
        plan: 'Plano Pro Empresarial (Sem Limites)',
        theme: 'dark',
        monthClosingDay: 5,
        timezone: 'America/Sao_Paulo (GMT-3)',
        activeProfile: 'all', // 'all', 'cpf', 'cnpj'
        useEmojis: true
    },
    advisors: {
        arthur: { name: 'Arthur', role: 'Diretor de Operações', avatar: 'images/theo.jpg', color: '#8b5cf6', badge: 'Operações' },
        bernardo: { name: 'Bernardo', role: 'Gerente Financeiro', avatar: 'images/martin.jpg', color: '#10b981', badge: 'Finanças' },
        clara: { name: 'Clara', role: 'Secretária Executiva', avatar: 'images/sofi.jpg', color: '#3b82f6', badge: 'Agenda' },
        sara: { name: 'Sara', role: 'Organização & Docs', avatar: 'images/luna.jpg', color: '#f59e0b', badge: 'Docs & Tarefas' },
        diego: { name: 'Diego', role: 'Analista de Mercado & Cotações', avatar: 'images/italo_otim.jpg', color: '#06b6d4', badge: 'Pesquisas' },
        elisa: { name: 'Elisa', role: 'Assistente Fiscal & Tributária', avatar: 'images/rita.jpg', color: '#ec4899', badge: 'Fiscal' },
        // Aliases para total retrocompatibilidade
        get theo() { return this.arthur; },
        get martin() { return this.bernardo; },
        get sofi() { return this.clara; },
        get luna() { return this.sara; },
        get italo() { return this.diego; },
        get rita() { return this.elisa; }
    },
    chatMessages: [
        {
            id: 'm1',
            sender: 'advisor',
            advisorKey: 'arthur',
            text: 'Olá Amauri! Sou o Arthur, diretor de operações da sua equipe de assessores. Já preparei seu dia com o Bernardo, a Clara, a Sara, o Diego e a Elisa. O que precisar organizar hoje, basta me mandar uma mensagem ou áudio.',
            time: '08:30',
            checks: 'read'
        },
        {
            id: 'm2',
            sender: 'advisor',
            advisorKey: 'bernardo',
            text: 'Bom dia! Bernardo aqui. O Open Finance sincronizou com o Itaú e Nubank. Temos R$ 4.250,00 de boletos para vencer esta semana e o orçamento de Alimentação atingiu 65% do teto. Já projetei seu fluxo de caixa do mês.',
            time: '08:32',
            checks: 'read'
        },
        {
            id: 'm3',
            sender: 'advisor',
            advisorKey: 'clara',
            text: 'Clara na escuta! Você tem 3 reuniões hoje. A principal é com a Ana Prado às 15h. Já reservei 25 min de deslocamento para você não se atrasar. Também enviei o link do Meet para o time.',
            time: '08:35',
            checks: 'read'
        }
    ],
    transactions: [
        {
            id: 'tx-1',
            type: 'receita',
            description: 'Pagamento de Consultoria · Cliente Alpha',
            category: 'Serviços Prestados',
            profile: 'cnpj',
            paymentMethod: 'PIX',
            amount: 14500.00,
            date: '2026-10-18',
            registeredBy: 'Martin (Open Finance)',
            status: 'conciliado'
        },
        {
            id: 'tx-2',
            type: 'receita',
            description: 'Faturamento Licença Software SaaS',
            category: 'Vendas & Faturamento',
            profile: 'cnpj',
            paymentMethod: 'Boleto',
            amount: 47900.00,
            date: '2026-10-15',
            registeredBy: 'Rita (NF-e Emitida)',
            status: 'conciliado'
        },
        {
            id: 'tx-3',
            type: 'despesa',
            description: 'Almoço Executivo Faria Lima',
            category: 'Alimentação',
            profile: 'cpf',
            paymentMethod: 'Cartão de Crédito',
            amount: 74.50,
            date: '2026-10-19',
            registeredBy: 'WhatsApp (Texto)',
            status: 'conciliado'
        },
        {
            id: 'tx-4',
            type: 'despesa',
            description: 'Servidores AWS & Cloud Database',
            category: 'Software & Nuvem',
            profile: 'cnpj',
            paymentMethod: 'Cartão de Crédito',
            amount: 1240.00,
            date: '2026-10-17',
            registeredBy: 'Martin',
            status: 'conciliado'
        },
        {
            id: 'tx-5',
            type: 'despesa',
            description: 'DAS Tributos Simples Nacional',
            category: 'Impostos & Tributos',
            profile: 'cnpj',
            paymentMethod: 'Boleto',
            amount: 2850.00,
            date: '2026-10-20',
            registeredBy: 'Rita (OCR de Guia)',
            status: 'pendente'
        },
        {
            id: 'tx-6',
            type: 'despesa',
            description: 'Manutenção e Combustível Veículo',
            category: 'Transporte',
            profile: 'cpf',
            paymentMethod: 'PIX',
            amount: 320.00,
            date: '2026-10-16',
            registeredBy: 'WhatsApp (Áudio)',
            status: 'conciliado'
        },
        {
            id: 'tx-7',
            type: 'despesa',
            description: 'Seguro Empresarial Parcela 4/10',
            category: 'Outros',
            profile: 'cnpj',
            paymentMethod: 'Boleto',
            amount: 1400.00,
            date: '2026-10-25',
            registeredBy: 'Martin',
            status: 'pendente'
        }
    ],
    // 36 Funcionalidades - Orçamentos por Categoria (Martin)
    budgets: [
        { category: 'Alimentação', limit: 1500.00, spent: 1074.50, profile: 'cpf' },
        { category: 'Transporte', limit: 800.00, spent: 320.00, profile: 'cpf' },
        { category: 'Software & Nuvem', limit: 2500.00, spent: 1240.00, profile: 'cnpj' },
        { category: 'Impostos & Tributos', limit: 3500.00, spent: 2850.00, profile: 'cnpj' }
    ],
    // 36 Funcionalidades - Quem te Deve & Contas a Pagar/Receber (Martin)
    debts: [
        {
            id: 'debt-1',
            type: 'receber',
            person: 'Lucas Ferreira',
            amount: 200.00,
            date: '2026-10-14',
            dueDate: '2026-10-25',
            description: 'Empréstimo pessoal almoço + translado',
            status: 'pendente',
            history: 'Cobrado dia 18/10'
        },
        {
            id: 'debt-2',
            type: 'receber',
            person: 'Rafael Mendes',
            amount: 1280.00,
            date: '2026-10-10',
            dueDate: '2026-10-20',
            description: 'Prestação de consultoria técnica avulsa',
            status: 'pendente',
            history: 'Link de cobrança enviado'
        },
        {
            id: 'debt-3',
            type: 'pagar',
            person: 'Dr. Roberto (Dentista)',
            amount: 450.00,
            date: '2026-10-15',
            dueDate: '2026-10-28',
            description: 'Tratamento canal e profilaxia',
            status: 'pendente',
            history: 'Aguardando fatura'
        }
    ],
    // 36 Funcionalidades - Links de Cobrança Gerados
    billingLinks: [
        {
            id: 'bill-1',
            recipient: 'Rafael Mendes',
            amount: 1280.00,
            description: 'Consultoria Técnica Outubro',
            url: 'https://meuassessor.com/pagar/rf9182',
            status: 'aguardando',
            createdAt: '2026-10-18',
            recurrence: 'once'
        },
        {
            id: 'bill-2',
            recipient: 'Júlia Prado',
            amount: 90.00,
            description: 'Aula avulsa de inglês',
            url: 'https://meuassessor.com/pagar/jl4410',
            status: 'pago',
            createdAt: '2026-10-15',
            recurrence: 'once'
        }
    ],
    // 36 Funcionalidades - Patrimônio Consolidado (Martin & Open Finance)
    patrimony: {
        totalLiquid: 342500.00,
        bankAccounts: 62400.00,
        investments: {
            rendaFixa: 180000.00,
            acoes: 48500.00,
            fundos: 32600.00,
            previdencia: 19000.00
        },
        openFinanceInstitutions: 114,
        connectedBanks: [
            { name: 'Itaú Unibanco', balance: 38200.00, type: 'Conta Corrente & Investimentos', syncTime: 'Há 12 min' },
            { name: 'Nubank (Nu Pagamentos)', balance: 14200.00, type: 'Conta & Cartão Platinum', syncTime: 'Há 5 min' },
            { name: 'Banco Inter', balance: 10000.00, type: 'Conta PJ Empresa', syncTime: 'Há 20 min' },
            { name: 'XP Investimentos', balance: 280100.00, type: 'Carteira de Renda Fixa e Ações', syncTime: 'Hoje 08:00' }
        ]
    },
    // Agenda e Compromissos (Sofi)
    events: [
        {
            id: 'ev-1',
            title: 'Reunião com Ana Prado (Contratos)',
            date: '2026-10-19',
            startTime: '15:00',
            endTime: '16:00',
            location: 'Escritório Presencial · Av. Faria Lima',
            guests: 'ana.prado@exemplo.com',
            advisor: 'Sofi',
            travelAdvice: '25 min de trânsito estimado (saída 14:35)',
            meetLink: 'https://meet.google.com/xyz-qwer-tyu'
        },
        {
            id: 'ev-2',
            title: 'Alinhamento Semanal com Sócios',
            date: '2026-10-19',
            startTime: '17:30',
            endTime: '18:15',
            location: 'Google Meet',
            guests: 'socios@empresa.com',
            advisor: 'Sofi',
            meetLink: 'https://meet.google.com/abc-socios-2026'
        },
        {
            id: 'ev-3',
            title: 'Consulta Dentista Dra. Camila',
            date: '2026-10-21',
            startTime: '10:00',
            endTime: '11:00',
            location: 'Clínica Sorrir · Jardins',
            guests: 'Pessoal',
            advisor: 'Sofi',
            travelAdvice: '15 min de deslocamento'
        },
        {
            id: 'ev-4',
            title: 'Fechamento Contábil Mensal',
            date: '2026-10-22',
            startTime: '14:00',
            endTime: '15:30',
            location: 'Sala Virtual Financeiro',
            guests: 'contabilidade@empresa.com',
            advisor: 'Martin & Rita',
            meetLink: 'https://meet.google.com/contab-fechamento'
        }
    ],
    // 36 Funcionalidades - Link Público de Agendamento da Sofi (estilo Calendly)
    bookingSchedule: {
        slug: 'amauri',
        url: 'https://meuassessor.com/agenda/amauri',
        durations: [15, 30, 45, 60],
        workingHours: 'Segunda a Sexta · 09:00 às 18:00',
        availableSlotsToday: ['11:00', '14:00', '16:30']
    },
    // 36 Funcionalidades - Atas de Reunião com Responsáveis (Sofi)
    meetingMinutes: [
        {
            id: 'ata-1',
            meetingTitle: 'Alinhamento de Expansão e Contratos',
            date: '18/10/2026',
            summary: 'Definido cronograma de abertura da nova filial. Aprovado orçamento de infraestrutura com Martin e contratação de consultoria com Ana Prado.',
            actionItems: [
                { task: 'Revisar minuta de contrato com fornecedor', responsible: 'Amauri', deadline: '20/10' },
                { task: 'Enviar comprovante e emitir NF antecipada', responsible: 'Rita', deadline: '19/10' },
                { task: 'Cotar equipamentos e computadores', responsible: 'Ítalo', deadline: '21/10' }
            ]
        }
    ],
    // Tarefas e Projetos (Luna)
    tasks: [
        {
            id: 'tk-1',
            title: 'Pagar IPVA e Taxa de Licenciamento',
            status: 'todo',
            priority: 'urgente',
            dueDate: '2026-10-22',
            project: 'Pessoal / Veículo',
            assignedTo: 'Luna'
        },
        {
            id: 'tk-2',
            title: 'Aprovar minuta de contrato do fornecedor de cloud',
            status: 'inprogress',
            priority: 'alta',
            dueDate: '2026-10-20',
            project: 'Empresa & TI',
            assignedTo: 'Luna'
        },
        {
            id: 'tk-3',
            title: 'Aguardando retorno do cliente sobre proposta comercial B2B',
            status: 'waiting',
            priority: 'media',
            dueDate: '2026-10-24',
            project: 'Vendas',
            assignedTo: 'Ítalo'
        },
        {
            id: 'tk-4',
            title: 'Renovação do seguro empresarial',
            status: 'done',
            priority: 'alta',
            dueDate: '2026-10-14',
            project: 'Empresa & Fiscal',
            assignedTo: 'Luna'
        },
        {
            id: 'tk-5',
            title: 'Emitir Notas Fiscais dos clientes do lote de outubro',
            status: 'inprogress',
            priority: 'alta',
            dueDate: '2026-10-20',
            project: 'Fiscal',
            assignedTo: 'Rita'
        }
    ],
    // 36 Funcionalidades - Listas Rápidas (Compras / Afazeres - Luna)
    lists: [
        {
            id: 'list-1',
            title: 'Lista de Mercado (Casa)',
            updatedAt: 'Hoje 09:15',
            items: [
                { id: 'li-1', text: 'Café em grãos gourmet', done: true },
                { id: 'li-2', text: 'Arroz integral 5kg', done: true },
                { id: 'li-3', text: 'Detergente e sabão em pó', done: false },
                { id: 'li-4', text: 'Frutas e verduras frescas', done: false }
            ]
        },
        {
            id: 'list-2',
            title: 'Itens para Viagem de Negócios (Rio)',
            updatedAt: 'Ontem 18:40',
            items: [
                { id: 'li-5', text: 'Carregador USB-C e adaptador', done: true },
                { id: 'li-6', text: 'Contratos impressos assinados', done: false },
                { id: 'li-7', text: 'Documento CNH e cartão corporativo', done: true }
            ]
        }
    ],
    // 36 Funcionalidades - Banco de Ideias & Insights (Luna)
    ideas: [
        {
            id: 'idea-1',
            title: 'Abertura de Filial em Curitiba',
            description: 'Estruturar centro de suporte compartilhado e filial no Paraná para redução tributária e proximidade com clientes sulistas.',
            date: '12/10/2026',
            tags: ['Expansão', 'Estratégia', 'Tributário']
        },
        {
            id: 'idea-2',
            title: 'Plano de Fidelidade no WhatsApp para Clientes VIP',
            description: 'Criar automação onde clientes que atingem R$ 50k em compras ganham assessoria premium sem custo extra.',
            date: '04/10/2026',
            tags: ['Marketing', 'Vendas', 'WhatsApp']
        }
    ],
    // 36 Funcionalidades - Drive na Nuvem (Pastas, até 50MB, Links Públicos - Luna)
    cloudDrive: {
        totalSpace: '10 GB',
        usedSpace: '1.8 GB',
        folders: [
            { id: 'f-1', name: 'Contratos', count: 8, size: '24.5 MB', publicLink: 'https://meuassessor.com/drive/d8172c', linkActive: true },
            { id: 'f-2', name: 'Notas Fiscais & DAS', count: 34, size: '68.2 MB', publicLink: '', linkActive: false },
            { id: 'f-3', name: 'Comprovantes Bancários', count: 52, size: '42.1 MB', publicLink: '', linkActive: false },
            { id: 'f-4', name: 'Veículos & IPVA', count: 6, size: '12.4 MB', publicLink: '', linkActive: false },
            { id: 'f-5', name: 'Casa & Pessoal', count: 14, size: '18.9 MB', publicLink: '', linkActive: false },
            { id: 'f-6', name: 'Viagens', count: 9, size: '31.0 MB', publicLink: '', linkActive: false }
        ]
    },
    // Cofre de Documentos Detalhado
    vault: [
        {
            id: 'doc-1',
            name: 'NFS-e 2026_0984_Consultoria_Alpha.pdf',
            folder: 'Notas Fiscais & DAS',
            category: 'nota-fiscal',
            fileType: 'pdf',
            date: '15/10/2026',
            size: '245 KB',
            ocrData: 'Valor: R$ 14.500,00 · CNPJ: 12.345.678/0001-90 · Retenção IR: R$ 217,50'
        },
        {
            id: 'doc-2',
            name: 'Comprovante_PIX_FariaLimaAlmoco.png',
            folder: 'Comprovantes Bancários',
            category: 'comprovante',
            fileType: 'png',
            date: '19/10/2026',
            size: '512 KB',
            ocrData: 'Valor: R$ 74,50 · Autenticação: E202610191245 · Conciliado no Martin'
        },
        {
            id: 'doc-3',
            name: 'Contrato_Prestacao_Servicos_Tech_2026.pdf',
            folder: 'Contratos',
            category: 'contrato',
            fileType: 'pdf',
            date: '02/10/2026',
            size: '1.4 MB',
            ocrData: 'Contrato assinado digitalmente via ICP-Brasil · Vigência: 12 meses'
        },
        {
            id: 'doc-4',
            name: 'CRLV_Documento_Veiculo_2026.pdf',
            folder: 'Veículos & IPVA',
            category: 'pessoal',
            fileType: 'pdf',
            date: '10/08/2026',
            size: '380 KB',
            ocrData: 'Placa: BRA2E19 · IPVA Exercício 2026 · Vencimento 22/10'
        }
    ],
    // 36 Funcionalidades - Mesa de Pesquisas & Cotações (Ítalo)
    researches: [
        {
            id: 'res-1',
            query: 'Preço médio do notebook MacBook Pro M3 16GB no Brasil',
            summary: 'Preço médio nacional: R$ 13.499,00 à vista (variação de R$ 12.890 a R$ 15.200 em varejistas homologados Apple).',
            sourceName: 'Zoom & CompareTech',
            sourceUrl: 'https://zoom.com.br',
            time: 'Hoje 11:34',
            date: '19/10/2026',
            status: 'entregue'
        },
        {
            id: 'res-2',
            query: 'Cotação comercial do Dólar e Euro hoje',
            summary: 'Dólar Comercial: R$ 5,42 (+0,3%). Euro Comercial: R$ 5,88 (+0,15%). Ptax Banco Central atualizada.',
            sourceName: 'Banco Central do Brasil',
            sourceUrl: 'https://www.bcb.gov.br',
            time: 'Hoje 09:44',
            date: '19/10/2026',
            status: 'entregue'
        },
        {
            id: 'res-3',
            query: 'Regras de desconto e tabela do IPVA SP 2027',
            summary: 'Desconto à vista em parcela única de 3% no mês de janeiro ou parcelamento em até 5 vezes sem juros.',
            sourceName: 'Secretaria da Fazenda de São Paulo',
            sourceUrl: 'https://portal.fazenda.sp.gov.br',
            time: 'Ontem 16:15',
            date: '18/10/2026',
            status: 'entregue'
        },
        {
            id: 'res-4',
            query: 'Comparação planos de internet fibra 600 Mega Vivo vs Claro',
            summary: 'Vivo Fibra R$ 120/mês (upload 300M, IP dinâmico) vs Claro Fibra R$ 119,90/mês (upload 100M). Para reuniões e envio de arquivos pesados, Vivo oferece maior estabilidade de upload.',
            sourceName: 'MelhorPlano.net',
            sourceUrl: 'https://melhorplano.net',
            time: '17/10/2026',
            date: '17/10/2026',
            status: 'entregue'
        }
    ],
    // Lembretes & Alertas (Theo)
    reminders: [
        {
            id: 'rem-1',
            text: 'Pagar boleto do DAS Simples Nacional',
            date: '2026-10-20',
            time: '09:00',
            recurrence: 'monthly',
            status: 'active',
            advisor: 'Rita & Martin'
        },
        {
            id: 'rem-2',
            text: 'Cobrar relatório quinzenal da agência de marketing',
            date: '2026-10-21',
            time: '14:30',
            recurrence: 'once',
            status: 'active',
            advisor: 'Theo'
        },
        {
            id: 'rem-3',
            text: 'Reunião com Ana Prado (Alerta de saída com trânsito)',
            date: '2026-10-19',
            time: '14:35',
            recurrence: 'once',
            status: 'active',
            advisor: 'Sofi'
        }
    ],
    // Equipe Multiusuário Real (Conta Compartilhada)
    team: [
        {
            id: 'tm-1',
            name: 'Amauri Castro',
            phone: '+55 (85) 98801-4049',
            role: 'Administrador (Titular)',
            status: 'Ativo · Conectado',
            avatar: 'AM'
        }
    ],
    teamMembers: [],
    clients: [],
    notifications: [],
    // Feed de Execução ao Vivo
    executionFeed: [
        {
            id: 'ef-1',
            type: 'financas',
            title: 'Martin conciliou gasto',
            sub: 'R$ 74,50 em Alimentação no Cartão Crédito',
            time: 'Há 5 minutos',
            advisor: 'martin'
        },
        {
            id: 'ef-2',
            type: 'agenda',
            title: 'Sofi calculou rota',
            sub: '25 min de deslocamento para reunião de 15h',
            time: 'Há 25 minutos',
            advisor: 'sofi'
        },
        {
            id: 'ef-3',
            type: 'tarefas',
            title: 'Luna atualizou tarefa',
            sub: 'Prioridade alta para "Pagar IPVA"',
            time: 'Há 1 hora',
            advisor: 'luna'
        },
        {
            id: 'ef-4',
            type: 'pesquisas',
            title: 'Ítalo entregou pesquisa',
            sub: 'Cotação do Dólar Ptax verificada no Banco Central',
            time: 'Há 2 horas',
            advisor: 'italo'
        }
    ]
};

class Store {
    constructor() {
        this.listeners = [];
        this.state = this.loadState();
        this.initRealtimeSync();
    }

    initRealtimeSync() {
        // Snapshot inicial
        this.syncWithBackend();

        // Polling contínuo de 2.5 segundos (garantia de sincronização em qualquer navegador/rede)
        if (typeof window !== 'undefined') {
            setInterval(() => {
                this.syncWithBackend();
            }, 2500);
        }

        // Conecta ao fluxo de eventos em tempo real (Server-Sent Events)
        try {
            if (typeof window !== 'undefined' && typeof EventSource !== 'undefined') {
                this.sse = new EventSource('/api/live-sync');
                this.sse.addEventListener('initial_state', (e) => {
                    try {
                        const data = JSON.parse(e.data);
                        this.mergeBackendData(data);
                    } catch (err) {}
                });
                this.sse.addEventListener('data_updated', (e) => {
                    try {
                        const payload = JSON.parse(e.data);
                        console.log('[Store Live Sync] Atualização recebida via WhatsApp:', payload.type);
                        if (payload.fullDb) {
                            this.mergeBackendData(payload.fullDb, true, payload);
                        }
                    } catch (err) {}
                });
            }
        } catch (e) {
            console.warn('[Store] SSE live-sync indisponível:', e.message);
        }
    }

    async syncWithBackend() {
        try {
            if (typeof window === 'undefined' || typeof fetch === 'undefined') return;
            const res = await fetch('/api/data?t=' + Date.now(), { cache: 'no-store' });
            if (res.ok) {
                const json = await res.json();
                if (json.success && json.data) {
                    this.mergeBackendData(json.data);
                }
            }
        } catch (e) {
            console.warn('[Store] Falha ao sincronizar com backend:', e.message);
        }
    }

    mergeBackendData(backendDb, isLiveEvent = false, payload = null) {
        if (!backendDb) return;
        let hasChanges = false;

        if (isLiveEvent && payload) {
            if (payload.type === 'update_transaction') {
                const item = payload.item;
                window.showToast?.(`✏️ KIT: Lançamento corrigido para R$ ${Number(item?.amount || 0).toFixed(2)}`, 'financas');
            } else if (payload.type === 'delete_transaction' || payload.type === 'undo') {
                window.showToast?.(`↩️ KIT: Lançamento anterior cancelado/desfeito`, 'financas');
            }
        }

        if (Array.isArray(backendDb.transactions)) {
            const oldFirstId = this.state.transactions?.[0]?.id;
            const newFirstId = backendDb.transactions?.[0]?.id;
            if (oldFirstId !== newFirstId) {
                hasChanges = true;
                const newTx = backendDb.transactions[0];
                if (newTx && isLiveEvent && payload?.type === 'transaction') {
                    window.showToast?.(`⚡ KIT: Nova despesa adicionada: ${newTx.description} (R$ ${Number(newTx.amount).toFixed(2)})`, 'financas');
                }
            }
            this.state.transactions = backendDb.transactions;
        }

        if (Array.isArray(backendDb.events)) {
            const oldFirstId = this.state.events?.[0]?.id;
            const newFirstId = backendDb.events?.[0]?.id;
            if (oldFirstId !== newFirstId) {
                hasChanges = true;
                const newEv = backendDb.events[0];
                if (newEv && isLiveEvent) {
                    window.showToast?.(`📅 KIT: Novo compromisso na agenda: ${newEv.title}`, 'agenda');
                }
            }
            this.state.events = backendDb.events;
        }

        if (Array.isArray(backendDb.tasks)) {
            const oldFirstId = this.state.tasks?.[0]?.id;
            const newFirstId = backendDb.tasks?.[0]?.id;
            if (oldFirstId !== newFirstId) {
                hasChanges = true;
            }
            this.state.tasks = backendDb.tasks;
        }

        if (Array.isArray(backendDb.chatMessages) && backendDb.chatMessages.length > 0) {
            this.state.chatMessages = backendDb.chatMessages;
        }

        if (Array.isArray(backendDb.budgets)) {
            this.state.budgets = backendDb.budgets;
        }
        if (Array.isArray(backendDb.debts)) {
            this.state.debts = backendDb.debts;
        }
        if (Array.isArray(backendDb.researches)) {
            this.state.researches = backendDb.researches;
        }
        if (Array.isArray(backendDb.lists)) {
            this.state.lists = backendDb.lists;
        }
        if (Array.isArray(backendDb.teamMembers)) {
            this.state.teamMembers = backendDb.teamMembers;
        }
        if (Array.isArray(backendDb.clients)) {
            this.state.clients = backendDb.clients;
        }
        if (Array.isArray(backendDb.notifications)) {
            const oldUnread = (this.state.notifications || []).filter(n => !n.read).length;
            const newUnread = backendDb.notifications.filter(n => !n.read).length;
            if (newUnread > oldUnread && isLiveEvent) {
                window.notificationsModule?.playNotificationSound();
            }
            this.state.notifications = backendDb.notifications;
        }

        this.saveState();
    }

    loadState() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                // Merge with DEFAULT_STATE in case new collections were added
                return { ...DEFAULT_STATE, ...parsed };
            }
        } catch (e) {
            console.error('Error loading state from localStorage:', e);
        }
        return JSON.parse(JSON.stringify(DEFAULT_STATE));
    }

    saveState() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
        } catch (e) {
            console.error('Error saving state:', e);
        }
        this.notify();
    }

    subscribe(listener) {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    notify() {
        for (const l of this.listeners) {
            try { l(this.state); } catch (e) { console.error('Listener error:', e); }
        }
    }

    // --- ACTIONS ---

    // Chat
    addChatMessage(msg) {
        this.state.chatMessages.push(msg);
        this.saveState();
    }

    // Finances & Transactions
    addTransaction(tx) {
        const newTx = {
            id: 'tx-' + Date.now(),
            status: 'conciliado',
            date: new Date().toISOString().split('T')[0],
            registeredBy: 'WhatsApp (Martin)',
            profile: this.state.user.activeProfile === 'all' ? 'cnpj' : this.state.user.activeProfile,
            ...tx
        };
        this.state.transactions.unshift(newTx);

        // Update category budget if expense
        if (tx.type === 'despesa') {
            const budget = this.state.budgets.find(b => b.category.toLowerCase() === tx.category.toLowerCase());
            if (budget) {
                budget.spent += parseFloat(tx.amount || 0);
            }
        }

        this.addExecutionFeed({
            type: 'financas',
            title: 'Martin registrou ' + (tx.type === 'receita' ? 'receita' : 'despesa'),
            sub: `R$ ${parseFloat(tx.amount).toFixed(2)} · ${tx.description}`,
            time: 'Agora mesmo',
            advisor: 'martin'
        });
        this.saveState();
        return newTx;
    }

    undoLastTransaction() {
        if (this.state.transactions.length > 0) {
            const removed = this.state.transactions.shift();
            this.addExecutionFeed({
                type: 'financas',
                title: 'Desfeito: lançamento cancelado',
                sub: `R$ ${parseFloat(removed.amount).toFixed(2)} removido`,
                time: 'Agora mesmo',
                advisor: 'martin'
            });
            this.saveState();
            return removed;
        }
        return null;
    }

    // Budgets (Martin)
    setBudget(category, limit) {
        const found = this.state.budgets.find(b => b.category.toLowerCase() === category.toLowerCase());
        if (found) {
            found.limit = parseFloat(limit);
        } else {
            this.state.budgets.push({
                category: category,
                limit: parseFloat(limit),
                spent: 0,
                profile: 'cpf'
            });
        }
        this.saveState();
    }

    // Debts ("Quem te deve" - Martin)
    addDebt(debt) {
        this.state.debts.unshift({
            id: 'debt-' + Date.now(),
            status: 'pendente',
            date: new Date().toISOString().split('T')[0],
            ...debt
        });
        this.addExecutionFeed({
            type: 'financas',
            title: 'Martin registrou empréstimo/cobrança',
            sub: `${debt.person}: R$ ${parseFloat(debt.amount).toFixed(2)}`,
            time: 'Agora mesmo',
            advisor: 'martin'
        });
        this.saveState();
    }

    settleDebt(debtId) {
        const d = this.state.debts.find(item => item.id === debtId);
        if (d) {
            d.status = 'pago';
            d.history = `Baixa dada em ${new Date().toLocaleDateString('pt-BR')}`;
            this.addExecutionFeed({
                type: 'financas',
                title: 'Martin deu baixa em recebimento',
                sub: `${d.person} pagou R$ ${parseFloat(d.amount).toFixed(2)}`,
                time: 'Agora mesmo',
                advisor: 'martin'
            });
            this.saveState();
        }
    }

    addDebt(debt) {
        const id = 'debt-' + Date.now();
        this.state.debts.unshift({
            id,
            status: 'pendente',
            dueDate: new Date().toISOString().split('T')[0],
            ...debt
        });
        this.saveState();
        return id;
    }

    updateDebt(debtId, updatedFields) {
        const idx = this.state.debts.findIndex(item => item.id === debtId);
        if (idx !== -1) {
            this.state.debts[idx] = { ...this.state.debts[idx], ...updatedFields };
            this.saveState();
        }
    }

    deleteDebt(debtId) {
        this.state.debts = this.state.debts.filter(item => item.id !== debtId);
        this.saveState();
    }

    // Billing links
    addBillingLink(link) {
        this.state.billingLinks.unshift({
            id: 'bill-' + Date.now(),
            url: `https://meuassessor.com/pagar/${Math.random().toString(36).substring(2, 8)}`,
            status: 'aguardando',
            createdAt: new Date().toISOString().split('T')[0],
            ...link
        });
        this.saveState();
    }

    deleteBillingLink(linkId) {
        this.state.billingLinks = this.state.billingLinks.filter(item => item.id !== linkId);
        this.saveState();
    }

    // Agenda (Sofi)
    addEvent(event) {
        const newEv = {
            id: 'ev-' + Date.now(),
            advisor: 'Sofi',
            meetLink: event.location && event.location.includes('Meet') ? `https://meet.google.com/${Math.random().toString(36).substring(2, 6)}-${Math.random().toString(36).substring(2, 6)}` : '',
            ...event
        };
        this.state.events.unshift(newEv);
        this.addExecutionFeed({
            type: 'agenda',
            title: 'Sofi agendou compromisso',
            sub: `${event.title} em ${event.date} às ${event.startTime}`,
            time: 'Agora mesmo',
            advisor: 'sofi'
        });
        this.saveState();
        return newEv;
    }

    rescheduleEvent(query, newDate, newTime) {
        const ev = this.state.events.find(e => e.title.toLowerCase().includes(query.toLowerCase()));
        if (ev) {
            ev.date = newDate || ev.date;
            ev.startTime = newTime || ev.startTime;
            this.saveState();
            return ev;
        }
        return null;
    }

    // Tasks (Luna)
    addTask(task) {
        const newTk = {
            id: 'tk-' + Date.now(),
            status: 'todo',
            priority: 'media',
            project: 'Geral',
            assignedTo: 'Luna',
            ...task
        };
        this.state.tasks.unshift(newTk);
        this.addExecutionFeed({
            type: 'tarefas',
            title: 'Luna criou nova tarefa',
            sub: task.title,
            time: 'Agora mesmo',
            advisor: 'luna'
        });
        this.saveState();
        return newTk;
    }

    updateTaskStatus(taskId, newStatus) {
        const task = this.state.tasks.find(t => t.id === taskId);
        if (task) {
            task.status = newStatus;
            this.saveState();
        }
    }

    // Dynamic Lists (Luna)
    addList(title, initialItems = []) {
        this.state.lists.unshift({
            id: 'list-' + Date.now(),
            title: title,
            updatedAt: 'Agora mesmo',
            items: initialItems.map((text, idx) => ({ id: `li-${Date.now()}-${idx}`, text, done: false }))
        });
        this.saveState();
    }

    addListItem(listTitle, itemText) {
        let list = this.state.lists.find(l => l.title.toLowerCase().includes(listTitle.toLowerCase()));
        if (!list) {
            this.addList(listTitle, [itemText]);
            return;
        }
        list.items.push({
            id: 'li-' + Date.now(),
            text: itemText,
            done: false
        });
        list.updatedAt = 'Agora mesmo';
        this.saveState();
    }

    toggleListItem(listId, itemId) {
        const list = this.state.lists.find(l => l.id === listId);
        if (list) {
            const item = list.items.find(i => i.id === itemId);
            if (item) {
                item.done = !item.done;
                list.updatedAt = 'Agora mesmo';
                this.saveState();
            }
        }
    }

    // Ideas (Luna)
    addIdea(idea) {
        this.state.ideas.unshift({
            id: 'idea-' + Date.now(),
            date: new Date().toLocaleDateString('pt-BR'),
            tags: ['Geral'],
            ...idea
        });
        this.addExecutionFeed({
            type: 'tarefas',
            title: 'Luna guardou nova ideia',
            sub: idea.title,
            time: 'Agora mesmo',
            advisor: 'luna'
        });
        this.saveState();
    }

    // Researches (Ítalo)
    addResearch(research) {
        const newRes = {
            id: 'res-' + Date.now(),
            date: new Date().toLocaleDateString('pt-BR'),
            time: 'Hoje ' + new Date().getHours().toString().padStart(2, '0') + ':' + new Date().getMinutes().toString().padStart(2, '0'),
            status: 'entregue',
            ...research
        };
        this.state.researches.unshift(newRes);
        this.addExecutionFeed({
            type: 'pesquisas',
            title: 'Ítalo entregou pesquisa com fonte',
            sub: research.query,
            time: 'Agora mesmo',
            advisor: 'italo'
        });
        this.saveState();
        return newRes;
    }

    // Cloud Drive Folders & Links (Luna)
    addDriveFolder(folderName) {
        this.state.cloudDrive.folders.push({
            id: 'f-' + Date.now(),
            name: folderName,
            count: 0,
            size: '0 KB',
            publicLink: '',
            linkActive: false
        });
        this.saveState();
    }

    toggleFolderPublicLink(folderId) {
        const f = this.state.cloudDrive.folders.find(item => item.id === folderId);
        if (f) {
            f.linkActive = !f.linkActive;
            if (f.linkActive && !f.publicLink) {
                f.publicLink = `https://meuassessor.com/drive/${Math.random().toString(36).substring(2, 8)}`;
            }
            this.saveState();
            return f;
        }
        return null;
    }

    // Memory & Settings (Theo)
    updateUserMemory(key, value) {
        this.state.user[key] = value;
        this.saveState();
    }

    // Vault
    addVaultFile(file) {
        this.state.vault.unshift({
            id: 'doc-' + Date.now(),
            date: new Date().toLocaleDateString('pt-BR'),
            folder: file.folder || 'Notas Fiscais & DAS',
            ...file
        });
        this.saveState();
    }

    addReminder(rem) {
        this.state.reminders.unshift({
            id: 'rem-' + Date.now(),
            status: 'active',
            advisor: 'Theo & Equipe',
            ...rem
        });
        this.saveState();
    }

    updateReminder(reminderId, updatedFields) {
        const idx = this.state.reminders.findIndex(item => item.id === reminderId);
        if (idx !== -1) {
            this.state.reminders[idx] = { ...this.state.reminders[idx], ...updatedFields };
            this.saveState();
        }
    }

    deleteReminder(reminderId) {
        this.state.reminders = this.state.reminders.filter(item => item.id !== reminderId);
        this.saveState();
    }

    // Team
    addTeamMember(member) {
        const initials = member.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
        this.state.team.push({
            id: 'tm-' + Date.now(),
            status: 'Ativo · WhatsApp Conectado',
            avatar: initials,
            ...member
        });
        this.saveState();
    }

    // Feed
    addExecutionFeed(feedItem) {
        this.state.executionFeed.unshift({
            id: 'ef-' + Date.now(),
            ...feedItem
        });
        if (this.state.executionFeed.length > 25) {
            this.state.executionFeed.pop();
        }
    }

    resetToDefault() {
        this.state = JSON.parse(JSON.stringify(DEFAULT_STATE));
        this.saveState();
    }
}

// Global instance
window.appStore = new Store();
