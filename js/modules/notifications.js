/**
 * KIT OS · CENTRAL DE NOTIFICAÇÕES & ALERTAS MODULE
 * Gerencia a central de notificações no topo (sino), badges em tempo real,
 * áudio de alerta discreto e disparo de resumos para o WhatsApp.
 */

class NotificationsModule {
    constructor(store) {
        this.store = store;
        this.isOpen = false;

        this.elements = {
            btnNotifications: document.getElementById('btnNotifications'),
            notificationsDropdown: document.getElementById('notificationsDropdown'),
            notifBadgeCount: document.getElementById('notifBadgeCount'),
            notifSubCount: document.getElementById('notifSubCount'),
            notifListContainer: document.getElementById('notifListContainer'),
            btnMarkAllNotifsRead: document.getElementById('btnMarkAllNotifsRead'),
            btnSendTestWaAlert: document.getElementById('btnSendTestWaAlert')
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

        // Escuta atualizações do store
        this.store.subscribe(() => this.render());

        // Render inicial
        this.render();
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
