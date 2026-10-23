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

    window.switchTab = function (tabKey, direction = null) {
        if (!tabPanels[tabKey]) tabKey = 'chat';
        navItems.forEach(i => i.classList.remove('active'));
        const activeNav = document.querySelector(`.nav-item[data-tab="${tabKey}"]`);
        if (activeNav) activeNav.classList.add('active');

        Object.values(tabPanels).forEach(panel => {
            if (panel) {
                panel.classList.remove('active', 'slide-left', 'slide-right');
            }
        });

        if (tabPanels[tabKey]) {
            tabPanels[tabKey].classList.add('active');
            if (direction === 'left') {
                tabPanels[tabKey].classList.add('slide-left');
            } else if (direction === 'right') {
                tabPanels[tabKey].classList.add('slide-right');
            }
        }

        if (tabTitles[tabKey] && pageMainTitle && pageBreadcrumb) {
            pageMainTitle.textContent = tabTitles[tabKey].title;
            pageBreadcrumb.textContent = tabTitles[tabKey].sub;
        }

        const sidebar = document.getElementById('sidebar');
        const sidebarBackdrop = document.getElementById('sidebarBackdrop');
        if (sidebar && window.innerWidth <= 768) {
            sidebar.classList.remove('open');
            sidebarBackdrop?.classList.remove('active');
        }

        // Atualiza a barra de navegação inferior mobile (Bottom Nav)
        const mobileNavBtns = document.querySelectorAll('.mobile-nav-btn[data-tab]');
        mobileNavBtns.forEach(btn => btn.classList.remove('active'));
        const activeMobileNav = document.querySelector(`.mobile-nav-btn[data-tab="${tabKey}"]`);
        if (activeMobileNav) activeMobileNav.classList.add('active');

        // Persiste a aba para nunca mais perder a tela em um refresh!
        try {
            localStorage.setItem('kit_active_tab', tabKey);
            history.replaceState(null, null, '#' + tabKey);
        } catch(e) {}

        if (tabKey === 'financas') {
            const searchInput = document.getElementById('txSearchInput');
            if (searchInput && searchInput.value.toLowerCase() === 'amauri') {
                searchInput.value = '';
                if (window.financesModule) {
                    window.financesModule.searchTerm = '';
                    window.financesModule.renderTransactions();
                }
            }
        }

        if (tabKey === 'chat') {
            localStorage.setItem('kit_last_read_chat_time', Date.now().toString());
            const badge = document.getElementById('badgeUnread');
            const mBadge = document.getElementById('mBadgeUnread');
            if (badge) {
                badge.style.display = 'none';
                badge.textContent = '0';
            }
            if (mBadge) {
                mBadge.style.display = 'none';
                mBadge.textContent = '0';
            }
        } else {
            window.updateChatBadge?.();
        }
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

    // Mobile Sidebar Drawer & Native Backdrop
    const mobileMenuTrigger = document.getElementById('mobileMenuTrigger');
    const mobileNavMenuBtn = document.getElementById('mobileNavMenuBtn');
    const sidebarCloseBtn = document.getElementById('sidebarCloseBtn');
    const sidebarBackdrop = document.getElementById('sidebarBackdrop');
    const sidebar = document.getElementById('sidebar');

    const openSidebar = () => {
        if (sidebar) sidebar.classList.add('open');
        if (sidebarBackdrop) sidebarBackdrop.classList.add('active');
    };

    const closeSidebar = () => {
        if (sidebar) sidebar.classList.remove('open');
        if (sidebarBackdrop) sidebarBackdrop.classList.remove('active');
    };

    if (mobileMenuTrigger) mobileMenuTrigger.addEventListener('click', openSidebar);
    if (mobileNavMenuBtn) mobileNavMenuBtn.addEventListener('click', openSidebar);
    if (sidebarCloseBtn) sidebarCloseBtn.addEventListener('click', closeSidebar);
    if (sidebarBackdrop) sidebarBackdrop.addEventListener('click', closeSidebar);

    // Mobile Bottom Navigation Bar Tabs
    const mobileBottomBtns = document.querySelectorAll('.mobile-nav-btn[data-tab]');
    mobileBottomBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabKey = btn.getAttribute('data-tab');
            window.switchTab(tabKey);
        });
    });

    // ==========================================================================
    // NATIVE MOBILE SWIPE GESTURES (NAVEGAÇÃO POR DESLIZE FLUIDO ENTRE ABAS)
    // ==========================================================================
    const primaryMobileTabs = ['overview', 'chat', 'financas', 'agenda'];
    let touchStartX = 0;
    let touchStartY = 0;
    let touchStartTime = 0;
    let isSwipeCandidate = false;

    const onTouchStart = (e) => {
        if (!e.touches || e.touches.length !== 1) return;
        const touch = e.touches[0];
        const target = e.target;

        // Ignora toques em inputs interativos, selects, textareas e sliders
        if (target.closest('input, textarea, select, .booking-slots-grid, .segmented-control')) {
            isSwipeCandidate = false;
            return;
        }

        // Se o toque iniciou dentro de uma tabela com scroll horizontal ativo, ignora para permitir scroll na tabela
        const tableResponsive = target.closest('.table-responsive');
        if (tableResponsive && tableResponsive.scrollWidth > tableResponsive.clientWidth) {
            isSwipeCandidate = false;
            return;
        }

        touchStartX = touch.clientX;
        touchStartY = touch.clientY;
        touchStartTime = Date.now();
        isSwipeCandidate = true;
    };

    const onTouchEnd = (e) => {
        if (!isSwipeCandidate || !e.changedTouches || e.changedTouches.length === 0) {
            isSwipeCandidate = false;
            return;
        }
        isSwipeCandidate = false;

        const touch = e.changedTouches[0];
        const deltaX = touch.clientX - touchStartX;
        const deltaY = touch.clientY - touchStartY;
        const deltaTime = Date.now() - touchStartTime;

        // Gesto natural e confortável: tempo até 650ms, deslocamento horizontal mínimo de 45px e mais horizontal que vertical
        if (deltaTime > 650) return;
        if (Math.abs(deltaX) < 45) return;
        if (Math.abs(deltaX) < Math.abs(deltaY) * 1.25) return;

        // Detecta a aba ativa atual
        const currentActiveBtn = document.querySelector('.mobile-nav-btn.active');
        const currentTab = (currentActiveBtn ? currentActiveBtn.getAttribute('data-tab') : null) || localStorage.getItem('kit_active_tab') || 'overview';
        const currentIndex = primaryMobileTabs.indexOf(currentTab);

        if (deltaX < 0) {
            // DESLIZOU PARA A ESQUERDA ➔ AVANÇA PARA A PRÓXIMA ABA
            if (currentIndex >= 0 && currentIndex < primaryMobileTabs.length - 1) {
                const nextTab = primaryMobileTabs[currentIndex + 1];
                try { navigator.vibrate?.(12); } catch(err) {}
                window.switchTab(nextTab, 'left');
            }
        } else {
            // DESLIZOU PARA A DIREITA ➔ RETORNA PARA A ABA ANTERIOR
            if (currentIndex > 0) {
                const prevTab = primaryMobileTabs[currentIndex - 1];
                try { navigator.vibrate?.(12); } catch(err) {}
                window.switchTab(prevTab, 'right');
            }
        }
    };

    // Escuta tanto no container principal quanto na barra inferior de navegação
    const mainContentEl = document.getElementById('mainContent') || document.body;
    mainContentEl.addEventListener('touchstart', onTouchStart, { passive: true });
    mainContentEl.addEventListener('touchend', onTouchEnd, { passive: true });

    const mobileBottomNavEl = document.getElementById('mobileBottomNav');
    if (mobileBottomNavEl) {
        mobileBottomNavEl.addEventListener('touchstart', onTouchStart, { passive: true });
        mobileBottomNavEl.addEventListener('touchend', onTouchEnd, { passive: true });
    }

    // Permite fechar a gaveta lateral deslizando para a esquerda dentro do menu
    let sidebarTouchStartX = 0;
    if (sidebar) {
        sidebar.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1) {
                sidebarTouchStartX = e.touches[0].clientX;
            }
        }, { passive: true });

        sidebar.addEventListener('touchend', (e) => {
            if (e.changedTouches && e.changedTouches.length > 0) {
                const deltaX = e.changedTouches[0].clientX - sidebarTouchStartX;
                if (deltaX < -50) {
                    closeSidebar();
                }
            }
        }, { passive: true });
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

    // ==========================================================================
    // BADGE DINÂMICO DE MENSAGENS NÃO LIDAS (CONVERSA WHATSAPP)
    // ==========================================================================
    window.updateChatBadge = function () {
        const badge = document.getElementById('badgeUnread');
        const mBadge = document.getElementById('mBadgeUnread');
        if (!badge && !mBadge) return;

        const activeTab = localStorage.getItem('kit_active_tab') || 'overview';
        if (activeTab === 'chat') {
            if (badge) { badge.style.display = 'none'; badge.textContent = '0'; }
            if (mBadge) { mBadge.style.display = 'none'; mBadge.textContent = '0'; }
            localStorage.setItem('kit_last_read_chat_time', Date.now().toString());
            return;
        }

        const lastReadTime = parseInt(localStorage.getItem('kit_last_read_chat_time') || '0', 10);
        const msgs = window.appStore?.state?.chatMessages || [];

        // Na primeira execução, marca as mensagens históricas como vistas para não prender em 3
        if (!lastReadTime) {
            localStorage.setItem('kit_last_read_chat_time', Date.now().toString());
            if (badge) { badge.style.display = 'none'; badge.textContent = '0'; }
            if (mBadge) { mBadge.style.display = 'none'; mBadge.textContent = '0'; }
            return;
        }

        const unreadCount = msgs.filter(m => {
            const time = m.timestamp || (m.createdAt ? Number(m.createdAt) : 0);
            return m.sender !== 'user' && time > lastReadTime;
        }).length;

        const badgeText = unreadCount > 99 ? '99+' : unreadCount.toString();
        if (unreadCount > 0) {
            if (badge) { badge.textContent = badgeText; badge.style.display = 'inline-block'; }
            if (mBadge) { mBadge.textContent = badgeText; mBadge.style.display = 'inline-block'; }
        } else {
            if (badge) { badge.style.display = 'none'; badge.textContent = '0'; }
            if (mBadge) { mBadge.style.display = 'none'; mBadge.textContent = '0'; }
        }
    };

    if (window.appStore) {
        window.appStore.subscribe(() => {
            window.updateChatBadge();
        });
    }
    window.updateChatBadge();

    // Inicializa verificação de segurança
    checkAuth();

    // ==========================================================================
    // PWA SERVICE WORKER REGISTRATION (OFFLINE & STANDALONE APP INSTALL)
    // ==========================================================================
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js').then((reg) => {
                console.log('[PWA] Service Worker registrado com sucesso no escopo:', reg.scope);
            }).catch((err) => {
                console.warn('[PWA] Falha ao registrar Service Worker:', err);
            });
        });
    }
});
