/**
 * MEU ASSESSOR OS · MAIN APPLICATION CONTROLLER (EXPANDED TO 36 FUNCTIONALITIES)
 * Coordinates tabs, sidebar drawer, themes, search, profile filters (CPF/CNPJ), modals and toasts.
 */

document.addEventListener('DOMContentLoaded', () => {
    // Tab Navigation
    const navItems = document.querySelectorAll('.nav-item');
    const tabPanels = {
        chat: document.getElementById('tabContentChat'),
        financas: document.getElementById('tabContentFinancas'),
        agenda: document.getElementById('tabContentAgenda'),
        tarefas: document.getElementById('tabContentTarefas'),
        pesquisas: document.getElementById('tabContentPesquisas'),
        cobrancas: document.getElementById('tabContentCobrancas'),
        listas: document.getElementById('tabContentListas'),
        arquivos: document.getElementById('tabContentArquivos'),
        lembretes: document.getElementById('tabContentLembretes'),
        equipe: document.getElementById('tabContentEquipe'),
        conexao: document.getElementById('tabContentConexao')
    };

    const pageMainTitle = document.getElementById('pageMainTitle');
    const pageBreadcrumb = document.getElementById('pageBreadcrumb');

    const tabTitles = {
        chat: { title: 'Conversa WhatsApp', sub: 'Assessoria de IA em Tempo Real · Selo Oficial Meta' },
        financas: { title: 'Finanças & Contas', sub: 'Gerenciadas pelo Martin · Open Finance Conectado (114 Bancos)' },
        agenda: { title: 'Agenda & Reuniões', sub: 'Gerenciada pela Sofi · Google Agenda & Link Público' },
        tarefas: { title: 'Tarefas & Projetos', sub: 'Quadro Kanban & Pirâmide de Prioridades com Luna' },
        pesquisas: { title: 'Pesquisas & Cotações', sub: 'Mesa do Ítalo · Busca na Web com Fonte Oficial' },
        cobrancas: { title: 'Cobranças & Devedores', sub: 'Links de Pagamento e Gestão de Quem te Deve' },
        listas: { title: 'Listas & Banco de Ideias', sub: 'Checklists Dinâmicas e Memória de Longo Prazo da Luna' },
        arquivos: { title: 'Meu Drive & Notas Fiscais', sub: 'Pastas, Links Públicos e OCR Tributário com Rita e Luna' },
        lembretes: { title: 'Lembretes Ilimitados no WhatsApp', sub: 'Alertas Inteligentes e Notificações com Theo' },
        equipe: { title: 'Usuários & Equipe Ilimitada', sub: 'Sócios, Família e Colaboradores no WhatsApp' },
        conexao: { title: 'Conexão Gateway WhatsApp', sub: 'Meta Cloud API Oficial & Webhook' }
    };

    window.switchTab = function (tabKey) {
        navItems.forEach(i => i.classList.remove('active'));
        const activeNav = document.querySelector(`.nav-item[data-tab="${tabKey}"]`);
        if (activeNav) activeNav.classList.add('active');

        Object.values(tabPanels).forEach(panel => {
            if (panel) panel.classList.remove('active');
        });

        if (tabPanels[tabKey]) {
            tabPanels[tabKey].classList.add('active');
        }

        if (tabTitles[tabKey] && pageMainTitle && pageBreadcrumb) {
            pageMainTitle.textContent = tabTitles[tabKey].title;
            pageBreadcrumb.textContent = tabTitles[tabKey].sub;
        }

        const sidebar = document.getElementById('sidebar');
        if (sidebar && window.innerWidth <= 768) {
            sidebar.classList.remove('open');
        }
    };

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const tabKey = item.getAttribute('data-tab');
            window.switchTab(tabKey);
        });
    });

    // Profile Filter (Todos / CPF Pessoal / CNPJ Empresa)
    const profilePills = document.querySelectorAll('.profile-toggle-pill');
    profilePills.forEach(pill => {
        pill.addEventListener('click', (e) => {
            profilePills.forEach(p => p.classList.remove('active'));
            e.currentTarget.classList.add('active');
            const profile = e.currentTarget.getAttribute('data-profile');
            window.appStore.updateUserMemory('activeProfile', profile);
            window.showToast(`Visão alterada: ${profile === 'all' ? 'Geral (Todos)' : (profile === 'cpf' ? 'Pessoa Física (CPF)' : 'Empresa (CNPJ)')}`);
        });
    });

    // Mobile Sidebar Drawer
    const mobileMenuTrigger = document.getElementById('mobileMenuTrigger');
    const sidebarCloseBtn = document.getElementById('sidebarCloseBtn');
    const sidebar = document.getElementById('sidebar');

    if (mobileMenuTrigger && sidebar) {
        mobileMenuTrigger.addEventListener('click', () => {
            sidebar.classList.add('open');
        });
    }

    if (sidebarCloseBtn && sidebar) {
        sidebarCloseBtn.addEventListener('click', () => {
            sidebar.classList.remove('open');
        });
    }

    // Theme Toggle
    const themeToggleBtn = document.getElementById('themeToggleBtn');
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
            const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', nextTheme);
            themeToggleBtn.textContent = nextTheme === 'dark' ? '🌓' : '☀️';
            window.showToast(`Modo ${nextTheme === 'dark' ? 'Escuro' : 'Claro'} ativado`);
        });
    }

    // Quick Action Trigger
    const btnQuickAction = document.getElementById('btnQuickAction');
    if (btnQuickAction) {
        btnQuickAction.addEventListener('click', () => {
            window.switchTab('chat');
            const input = document.getElementById('waTextInput');
            if (input) {
                input.focus();
                input.placeholder = 'Digite uma ação rápida (ex: Gastei 50 no almoço, Ítalo pesquisa o dólar...)';
            }
        });
    }

    // Global Search
    const globalSearchInput = document.getElementById('globalSearchInput');
    if (globalSearchInput) {
        globalSearchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase().trim();
            if (!query) return;

            const matchTx = window.appStore.state.transactions.find(t => t.description.toLowerCase().includes(query));
            if (matchTx) {
                window.switchTab('financas');
                return;
            }

            const matchTask = window.appStore.state.tasks.find(t => t.title.toLowerCase().includes(query));
            if (matchTask) {
                window.switchTab('tarefas');
                return;
            }

            const matchEvent = window.appStore.state.events.find(ev => ev.title.toLowerCase().includes(query));
            if (matchEvent) {
                window.switchTab('agenda');
                return;
            }

            const matchResearch = window.appStore.state.researches.find(r => r.query.toLowerCase().includes(query));
            if (matchResearch) {
                window.switchTab('pesquisas');
                return;
            }
        });
    }

    // Copy Webhook URL
    const btnCopyWebhook = document.getElementById('btnCopyWebhook');
    const cfgWebhookUrl = document.getElementById('cfgWebhookUrl');
    if (btnCopyWebhook && cfgWebhookUrl) {
        btnCopyWebhook.addEventListener('click', () => {
            navigator.clipboard.writeText(cfgWebhookUrl.value).then(() => {
                window.showToast('URL do Webhook copiada para a área de transferência!');
            }).catch(() => {
                window.showToast('URL: ' + cfgWebhookUrl.value);
            });
        });
    }

    // Save WhatsApp Config
    const btnSaveWaConfig = document.getElementById('btnSaveWaConfig');
    if (btnSaveWaConfig) {
        btnSaveWaConfig.addEventListener('click', () => {
            window.showToast('Configurações do Gateway WhatsApp salvas com sucesso!');
        });
    }

    // Toast Utility
    window.showToast = function (message) {
        let toast = document.getElementById('appToast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'appToast';
            toast.className = 'app-toast';
            document.body.appendChild(toast);
        }
        toast.textContent = message;
        toast.classList.add('show');
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3200);
    };
});
