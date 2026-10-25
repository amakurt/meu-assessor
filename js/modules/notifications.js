/**
 * KIT OS · CENTRAL DE NOTIFICAÇÕES & ALERTAS MODULE
 * Gerencia a central de notificações no topo (sino), badges em tempo real,
 * áudio de alerta discreto e disparo de resumos para o WhatsApp.
 */

class NotificationsModule {
    constructor(store) {
        this.store = store;
        this.isOpen = false;
        this.isPushSubscribed = false;

        this.elements = {
            btnNotifications: document.getElementById('btnNotifications'),
            notificationsDropdown: document.getElementById('notificationsDropdown'),
            notifBadgeCount: document.getElementById('notifBadgeCount'),
            notifSubCount: document.getElementById('notifSubCount'),
            notifListContainer: document.getElementById('notifListContainer'),
            btnMarkAllNotifsRead: document.getElementById('btnMarkAllNotifsRead'),
            btnSendTestWaAlert: document.getElementById('btnSendTestWaAlert'),
            // Elementos de Web Push Nativo
            notifPushControl: document.getElementById('notifPushControl'),
            btnTogglePush: document.getElementById('btnTogglePush'),
            btnTogglePushIcon: document.getElementById('btnTogglePushIcon'),
            btnTogglePushText: document.getElementById('btnTogglePushText'),
            btnTestPush: document.getElementById('btnTestPush'),
            pushStatusSub: document.getElementById('pushStatusSub'),
            pushBadgeStatus: document.getElementById('pushBadgeStatus'),
            pillPushStatus: document.getElementById('pillPushStatus'),
            dotPushStatus: document.getElementById('dotPushStatus'),
            textPushStatus: document.getElementById('textPushStatus')
        };

        this.audioCtx = null;
        this.init();
    }

    init() {
        if (!this.elements.btnNotifications) return;

        // Toggle do dropdown
        this.elements.btnNotifications.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleDropdown();
        });

        // Pill na Visão Geral abre o painel de notificações
        if (this.elements.pillPushStatus) {
            this.elements.pillPushStatus.addEventListener('click', (e) => {
                e.stopPropagation();
                this.openDropdown();
            });
        }

        // Fechar ao clicar fora
        document.addEventListener('click', (e) => {
            if (this.isOpen && this.elements.notificationsDropdown && !this.elements.notificationsDropdown.contains(e.target)) {
                this.closeDropdown();
            }
        });

        // Marcar todas como lidas
        if (this.elements.btnMarkAllNotifsRead) {
            this.elements.btnMarkAllNotifsRead.addEventListener('click', async () => {
                try {
                    await fetch('/api/notifications/read-all', { method: 'PUT' });
                    const notifs = this.store.state.notifications || [];
                    notifs.forEach(n => { n.read = 1; });
                    this.render();
                    window.showToast?.('✓ Todas as notificações marcadas como lidas');
                } catch (e) {
                    console.error('Erro ao marcar notificações:', e);
                }
            });
        }

        // Disparo de teste para o WhatsApp
        if (this.elements.btnSendTestWaAlert) {
            this.elements.btnSendTestWaAlert.addEventListener('click', async () => {
                const notifs = this.store.state.notifications || [];
                const unread = notifs.filter(n => !n.read);
                const summary = unread.length > 0 
                    ? `Você tem ${unread.length} alertas não lidos no painel, incluindo: "${unread[0].title}".`
                    : `Seu painel executivo está 100% em dia e sem pendências financeiras no momento.`;

                try {
                    const res = await fetch('/api/notifications/whatsapp-alert', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ message: summary })
                    });
                    const data = await res.json();
                    if (data.sentWhatsApp) {
                        window.showToast?.('💬 Alerta enviado para o seu WhatsApp!');
                    } else {
                        window.showToast?.('WhatsApp desconectado ou sem sessão ativa.');
                    }
                } catch (e) {
                    console.error('Erro ao enviar alerta:', e);
                }
            });
        }

        // Inicialização do Web Push Mobile
        this.initPushNotifications();

        // Escuta atualizações do store
        this.store.subscribe(() => this.render());

        // Render inicial
        this.render();
    }

    // ==========================================
    // INTEGRAÇÃO NATIVA WEB PUSH (W3C PUSH API)
    // ==========================================

    _urlBase64ToUint8Array(base64String) {
        const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
        const base64 = (base64String + padding)
            .replace(/\-/g, '+')
            .replace(/_/g, '/');
        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);
        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    }

    async initPushNotifications() {
        if (!this.elements.btnTogglePush) return;

        const isPushSupported = ('serviceWorker' in navigator) && ('PushManager' in window);
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;

        if (!isPushSupported) {
            if (isIOS && !isStandalone) {
                if (this.elements.pushStatusSub) {
                    this.elements.pushStatusSub.textContent = 'Adicione o PWA à Tela de Início para ativar Push no iPhone';
                }
                if (this.elements.btnTogglePushText) {
                    this.elements.btnTogglePushText.textContent = 'Requer PWA no iOS';
                }
                this.elements.btnTogglePush.disabled = true;
            } else {
                if (this.elements.pushStatusSub) {
                    this.elements.pushStatusSub.textContent = 'Push não suportado neste navegador';
                }
                this.elements.btnTogglePush.disabled = true;
            }
            this.updatePushUI(false);
            return;
        }

        // Checa inscrição ativa
        try {
            const reg = await navigator.serviceWorker.ready;
            const sub = await reg.pushManager.getSubscription();
            this.isPushSubscribed = !!sub;
            this.updatePushUI(this.isPushSubscribed);
        } catch (e) {
            console.warn('[Push] Não foi possível verificar inscrição:', e);
            this.updatePushUI(false);
        }

        // Listener do botão de ativar/desativar
        this.elements.btnTogglePush.addEventListener('click', async () => {
            await this.togglePushSubscription();
        });

        // Listener do botão de teste de disparo
        if (this.elements.btnTestPush) {
            this.elements.btnTestPush.addEventListener('click', async () => {
                await this.sendTestPushNotification();
            });
        }
    }

    async togglePushSubscription() {
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
            window.showToast?.('Seu navegador não suporta notificações Push.');
            return;
        }

        try {
            const reg = await navigator.serviceWorker.ready;
            const existingSub = await reg.pushManager.getSubscription();

            if (existingSub) {
                // Desativar Push
                this.elements.btnTogglePush.disabled = true;
                if (this.elements.btnTogglePushText) this.elements.btnTogglePushText.textContent = 'Desativando...';

                await existingSub.unsubscribe();
                await fetch('/api/push/unsubscribe', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ endpoint: existingSub.endpoint })
                });

                this.isPushSubscribed = false;
                this.elements.btnTogglePush.disabled = false;
                this.updatePushUI(false);
                window.showToast?.('Notificações Push desativadas no aparelho.');
                return;
            }

            // Ativar Push
            if (Notification.permission === 'denied') {
                window.showToast?.('Permissão de notificações bloqueada. Habilite nas configurações do navegador.');
                return;
            }

            this.elements.btnTogglePush.disabled = true;
            if (this.elements.btnTogglePushText) this.elements.btnTogglePushText.textContent = 'Solicitando...';

            const permission = await Notification.requestPermission();
            if (permission !== 'granted') {
                this.elements.btnTogglePush.disabled = false;
                this.updatePushUI(false);
                window.showToast?.('Permissão de notificações não concedida.');
                return;
            }

            // Busca chave pública VAPID do servidor
            const keyRes = await fetch('/api/push/public-key');
            const keyData = await keyRes.json();
            if (!keyData.success || !keyData.publicKey) {
                throw new Error('Chave pública VAPID indisponível');
            }

            const applicationServerKey = this._urlBase64ToUint8Array(keyData.publicKey);
            const newSub = await reg.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey
            });

            // Envia subscription para o backend persistir no SQLite
            await fetch('/api/push/subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ subscription: newSub.toJSON() })
            });

            this.isPushSubscribed = true;
            this.elements.btnTogglePush.disabled = false;
            this.updatePushUI(true);
            window.showToast?.('📲 Notificações Push nativas ativadas com sucesso!');
        } catch (err) {
            console.error('[Push] Falha ao alternar push:', err);
            this.elements.btnTogglePush.disabled = false;
            window.showToast?.('Falha ao configurar notificações push: ' + err.message);
        }
    }

    async sendTestPushNotification() {
        try {
            if (this.elements.btnTestPush) this.elements.btnTestPush.disabled = true;
            const res = await fetch('/api/push/test', { method: 'POST' });
            const data = await res.json();
            if (this.elements.btnTestPush) this.elements.btnTestPush.disabled = false;

            if (data.success && data.result && data.result.sent > 0) {
                window.showToast?.('⚡ Notificação enviada! Verifique sua tela de bloqueio.');
            } else {
                window.showToast?.('Aviso: Nenhum aparelho registrado para envio imediato.');
            }
        } catch (e) {
            if (this.elements.btnTestPush) this.elements.btnTestPush.disabled = false;
            window.showToast?.('Erro de rede ao disparar teste de push.');
        }
    }

    updatePushUI(isActive) {
        if (this.elements.btnTogglePushText) {
            this.elements.btnTogglePushText.textContent = isActive ? 'Ativo (Desativar)' : 'Ativar Push';
        }
        if (this.elements.btnTogglePushIcon) {
            this.elements.btnTogglePushIcon.textContent = isActive ? '✓' : '⚡';
        }
        if (this.elements.btnTogglePush) {
            this.elements.btnTogglePush.className = isActive 
                ? 'btn btn-xs btn-outline notif-push-btn' 
                : 'btn btn-xs btn-primary notif-push-btn';
        }
        if (this.elements.btnTestPush) {
            this.elements.btnTestPush.style.display = isActive ? 'inline-flex' : 'none';
        }
        if (this.elements.notifPushControl) {
            if (isActive) {
                this.elements.notifPushControl.classList.add('active');
            } else {
                this.elements.notifPushControl.classList.remove('active');
            }
        }
        if (this.elements.pushStatusSub) {
            this.elements.pushStatusSub.textContent = isActive 
                ? 'Conectado · Alertas na tela de bloqueio ativos' 
                : 'Avisos na tela de bloqueio (iOS & Android)';
        }
        if (this.elements.pushBadgeStatus) {
            this.elements.pushBadgeStatus.textContent = isActive ? 'ATIVO' : 'PWA';
            this.elements.pushBadgeStatus.style.background = isActive ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.08)';
            this.elements.pushBadgeStatus.style.color = isActive ? '#10b981' : 'var(--text-muted)';
            this.elements.pushBadgeStatus.style.borderColor = isActive ? 'rgba(16, 185, 129, 0.4)' : 'rgba(255, 255, 255, 0.12)';
        }
        if (this.elements.dotPushStatus) {
            this.elements.dotPushStatus.style.background = isActive ? '#10b981' : '#64748b';
            this.elements.dotPushStatus.style.boxShadow = isActive ? '0 0 8px rgba(16, 185, 129, 0.6)' : 'none';
        }
        if (this.elements.textPushStatus) {
            this.elements.textPushStatus.textContent = isActive ? 'Push Mobile Ativo 📲' : 'Push Mobile';
        }
    }

    toggleDropdown() {
        if (this.isOpen) {
            this.closeDropdown();
        } else {
            this.openDropdown();
        }
    }

    openDropdown() {
        if (!this.elements.notificationsDropdown) return;
        this.elements.notificationsDropdown.style.display = 'block';
        this.isOpen = true;
        this.render();
    }

    closeDropdown() {
        if (!this.elements.notificationsDropdown) return;
        this.elements.notificationsDropdown.style.display = 'none';
        this.isOpen = false;
    }

    playNotificationSound() {
        try {
            if (!this.audioCtx) {
                const AudioContext = window.AudioContext || window.webkitAudioContext;
                if (AudioContext) this.audioCtx = new AudioContext();
            }
            if (!this.audioCtx) return;

            const osc = this.audioCtx.createOscillator();
            const gain = this.audioCtx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(587.33, this.audioCtx.currentTime); // D5
            osc.frequency.exponentialRampToValueAtTime(880, this.audioCtx.currentTime + 0.15); // A5

            gain.gain.setValueAtTime(0.08, this.audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.35);

            osc.connect(gain);
            gain.connect(this.audioCtx.destination);

            osc.start();
            osc.stop(this.audioCtx.currentTime + 0.35);
        } catch (e) {
            // Silencioso se navegador bloquear autoplay
        }
    }

    render() {
        const notifs = this.store.state.notifications || [];
        const unreadCount = notifs.filter(n => !n.read).length;

        // Atualiza badges
        if (this.elements.notifBadgeCount) {
            if (unreadCount > 0) {
                this.elements.notifBadgeCount.textContent = unreadCount > 9 ? '9+' : unreadCount;
                this.elements.notifBadgeCount.style.display = 'flex';
            } else {
                this.elements.notifBadgeCount.style.display = 'none';
            }
        }

        if (this.elements.notifSubCount) {
            this.elements.notifSubCount.textContent = unreadCount > 0 
                ? `${unreadCount} ${unreadCount === 1 ? 'alerta pendente' : 'alertas pendentes'}`
                : 'Nenhuma notificação nova';
        }

        // Renderiza lista no container
        if (!this.elements.notifListContainer) return;
        this.elements.notifListContainer.innerHTML = '';

        if (notifs.length === 0) {
            this.elements.notifListContainer.innerHTML = `
                <div class="notif-empty-state">
                    <span style="font-size: 2rem;">✨</span>
                    <div>Tudo tranquilo por aqui!</div>
                    <small style="color: var(--text-muted); font-size: 11px;">Nenhum alerta ou pendência no momento.</small>
                </div>
            `;
            return;
        }

        notifs.forEach(n => {
            const item = document.createElement('div');
            item.className = `notif-item ${!n.read ? 'notif-unread' : ''}`;

            let icon = '⚡';
            let iconClass = 'notif-icon-sistema';

            if (n.type === 'cobranca') {
                icon = '⏳';
                iconClass = 'notif-icon-cobranca';
            } else if (n.type === 'financeiro') {
                icon = '💳';
                iconClass = 'notif-icon-financeiro';
            } else if (n.type === 'equipe') {
                icon = '👥';
                iconClass = 'notif-icon-equipe';
            }

            const timeFormatted = this.formatTime(n.createdAt);

            item.innerHTML = `
                <div class="notif-icon-circle ${iconClass}">${icon}</div>
                <div class="notif-content">
                    <h5 class="notif-title">${n.title}</h5>
                    <p class="notif-message">${n.message}</p>
                    <span class="notif-time">${timeFormatted}</span>
                </div>
            `;

            item.addEventListener('click', async () => {
                // Marca como lida
                if (!n.read) {
                    try {
                        await fetch(`/api/notifications/${n.id}/read`, { method: 'PUT' });
                        n.read = 1;
                        this.render();
                    } catch (e) {}
                }

                // Navega para a aba correspondente
                if (n.linkTab && window.switchTab) {
                    window.switchTab(n.linkTab);
                    this.closeDropdown();
                }
            });

            this.elements.notifListContainer.appendChild(item);
        });
    }

    formatTime(timestamp) {
        if (!timestamp) return 'Hoje';
        const diff = Date.now() - timestamp;
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'Agora mesmo';
        if (mins < 60) return `Há ${mins} min`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `Há ${hours}h`;
        const days = Math.floor(hours / 24);
        if (days === 1) return 'Ontem';
        return `Há ${days} dias`;
    }
}

// Instância global
window.notificationsModule = new NotificationsModule(window.appStore);
