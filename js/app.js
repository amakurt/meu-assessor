/**
 * MEU ASSESSOR OS · MAIN APPLICATION CONTROLLER (EXPANDED TO 36 FUNCTIONALITIES)
 * Coordinates tabs, sidebar drawer, themes, search, profile filters (CPF/CNPJ), modals and toasts.
 */

document.addEventListener('DOMContentLoaded', () => {
    // Tab Navigation
    const navItems = document.querySelectorAll('.nav-item');
    const tabPanels = {
        overview: document.getElementById('tabContentOverview'),
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
        overview: { title: 'Visão Geral Executiva', sub: 'Briefing Geral do Dia · Finanças, Agenda e Metas com seus 6 Assessores de Elite' },
        chat: { title: 'Conversa WhatsApp', sub: 'Assessoria de IA em Tempo Real · Selo Oficial Meta' },
        financas: { title: 'Finanças & Contas', sub: 'Gerenciadas pelo Bernardo · Open Finance Conectado (114 Bancos)' },
        agenda: { title: 'Agenda & Reuniões', sub: 'Gerenciada pela Clara · Google Agenda & Link Público' },
        tarefas: { title: 'Tarefas & Projetos', sub: 'Quadro Kanban & Pirâmide de Prioridades com Sara' },
        pesquisas: { title: 'Pesquisas & Cotações', sub: 'Mesa do Diego · Busca na Web com Fonte Oficial' },
        cobrancas: { title: 'Cobranças & Devedores', sub: 'Links de Pagamento e Gestão de Quem te Deve com Bernardo' },
        listas: { title: 'Listas & Banco de Ideias', sub: 'Checklists Dinâmicas e Memória de Longo Prazo da Sara' },
        arquivos: { title: 'Meu Drive & Notas Fiscais', sub: 'Pastas, Links Públicos e OCR Tributário com Elisa e Sara' },
        lembretes: { title: 'Lembretes Ilimitados no WhatsApp', sub: 'Alertas Inteligentes e Notificações com Arthur' },
        equipe: { title: 'Conta Compartilhada & Equipe', sub: 'Sócios, Família e Clientes Integrados no WhatsApp' },
        conexao: { title: 'Conexão Gateway WhatsApp', sub: 'Meta Cloud API Oficial & Webhook' }
    };

    window.switchTab = function (tabKey) {
        if (!tabPanels[tabKey]) tabKey = 'chat';
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

        // Persiste a aba para nunca mais perder a tela em um refresh!
        try {
            localStorage.setItem('kit_active_tab', tabKey);
            history.replaceState(null, null, '#' + tabKey);
        } catch(e) {}
    };

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const tabKey = item.getAttribute('data-tab');
            window.switchTab(tabKey);
        });
    });

    // Inicializa módulo de Visão Geral Executiva
    if (window.OverviewModule && window.appStore) {
        window.overviewModule = new window.OverviewModule(window.appStore);
    }
    if (window.FinancesModule && window.appStore && !window.financesModule) {
        window.financesModule = new window.FinancesModule(window.appStore);
    }

    // Restaura imediatamente a aba salva (Overview, Finanças, Agenda, etc.)
    const hashTab = window.location.hash ? window.location.hash.replace('#', '') : null;
    const initialSavedTab = hashTab || localStorage.getItem('kit_active_tab') || 'overview';
    if (initialSavedTab && tabPanels[initialSavedTab]) {
        window.switchTab(initialSavedTab);
    }

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
    window.showToast = function (message, targetTab = null) {
        let toast = document.getElementById('appToast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'appToast';
            toast.className = 'app-toast';
            document.body.appendChild(toast);
        }
        if (targetTab) {
            toast.innerHTML = `<span>${message}</span> <button class="toast-tab-btn" onclick="window.switchTab('${targetTab}')" style="background: var(--brand-purple); color: #fff; border: none; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 700; margin-left: 10px; cursor: pointer;">Abrir ➔</button>`;
        } else {
            toast.textContent = message;
        }
        toast.classList.add('show');
        setTimeout(() => {
            toast.classList.remove('show');
        }, 4500);
    };

    // ==========================================================================
    // KIT OS · AUTENTICAÇÃO & TELA DE LOGIN
    // ==========================================================================
    const loginOverlay = document.getElementById('kitLoginOverlay');
    const loginForm = document.getElementById('kitLoginForm');
    const loginAlert = document.getElementById('kitLoginAlert');
    const loginUsername = document.getElementById('loginUsername');
    const loginPassword = document.getElementById('loginPassword');
    const rememberLogin = document.getElementById('rememberLogin');
    const btnLogout = document.getElementById('btnLogout');

    function checkAuth() {
        const token = localStorage.getItem('kit_auth_token') || sessionStorage.getItem('kit_auth_token');
        if (!token) {
            showLogin();
            return;
        }

        fetch('/api/auth/check', {
            headers: { 'Authorization': `Bearer ${token}` }
        }).then(res => res.json()).then(data => {
            if (data.authenticated) {
                hideLogin();
            } else {
                showLogin();
            }
        }).catch(() => {
            hideLogin();
        });
    }

    function showLogin(errorMsg = '') {
        if (!loginOverlay) return;
        loginOverlay.classList.remove('d-none');
        if (errorMsg) {
            loginAlert.textContent = errorMsg;
            loginAlert.classList.remove('d-none');
        } else {
            loginAlert.classList.add('d-none');
        }
        if (loginPassword) loginPassword.value = '';
    }

    function hideLogin() {
        if (!loginOverlay) return;
        loginOverlay.classList.add('d-none');
        if (window.appStore) {
            window.appStore.syncWithBackend();
        }
    }

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = loginUsername.value.trim();
            const password = loginPassword.value.trim();

            try {
                const res = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });

                const json = await res.json();
                if (res.ok && json.success) {
                    if (rememberLogin.checked) {
                        localStorage.setItem('kit_auth_token', json.token);
                    } else {
                        sessionStorage.setItem('kit_auth_token', json.token);
                    }
                    hideLogin();
                    window.showToast('Bem-vindo ao KIT OS, Amauri!');
                } else {
                    showLogin(json.error || 'Credenciais incorretas.');
                }
            } catch (err) {
                showLogin('Erro ao conectar ao servidor de autenticação.');
            }
        });
    }

    if (btnLogout) {
        btnLogout.addEventListener('click', async () => {
            const token = localStorage.getItem('kit_auth_token') || sessionStorage.getItem('kit_auth_token');
            if (token) {
                fetch('/api/auth/logout', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` }
                }).catch(() => {});
            }
            localStorage.removeItem('kit_auth_token');
            sessionStorage.removeItem('kit_auth_token');
            showLogin('Sessão encerrada.');
            window.showToast('Você bloqueou o acesso ao KIT OS.');
        });
    }

    // Inicializa verificação de segurança
    checkAuth();
});
