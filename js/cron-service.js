/**
 * MEU ASSESSOR OS · AUTOMATED CRON & DAILY BRIEFING SERVICE
 * Manages automated morning (08:00) and evening (20:00) executive briefings
 * dispatched via WhatsApp to the user's self-chat and stored in the OS feed.
 */

const dbService = require('./db-service');

class CronService {
    constructor() {
        this.intervalId = null;
        this.whatsappService = null;
        this.lastMorningDate = null;
        this.lastEveningDate = null;
        this.morningHour = 8;
        this.morningMinute = 0;
        this.eveningHour = 20;
        this.eveningMinute = 0;
    }

    setWhatsAppService(service) {
        this.whatsappService = service;
    }

    start() {
        if (this.intervalId) return;
        console.log('[CronService] ⏰ Serviço de briefings automáticos iniciado (08:00 e 20:00).');
        
        // Verifica a cada 30 segundos se chegou o momento do briefing
        this.intervalId = setInterval(() => {
            this.checkSchedule();
        }, 30000);

        // Executa uma checagem imediata não-bloqueante
        this.checkSchedule();
    }

    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
            console.log('[CronService] Serviço de briefings pausado.');
        }
    }

    checkSchedule() {
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];
        const hours = now.getHours();
        const minutes = now.getMinutes();

        // 1. Briefing Matinal (08:00)
        if (hours === this.morningHour && minutes >= this.morningMinute && this.lastMorningDate !== dateStr) {
            this.lastMorningDate = dateStr;
            this.dispatchBriefing('morning').catch(err => {
                console.error('[CronService] Erro ao disparar briefing matinal:', err.message);
            });
        }

        // 2. Briefing Noturno (20:00)
        if (hours === this.eveningHour && minutes >= this.eveningMinute && this.lastEveningDate !== dateStr) {
            this.lastEveningDate = dateStr;
            this.dispatchBriefing('evening').catch(err => {
                console.error('[CronService] Erro ao disparar briefing noturno:', err.message);
            });
        }
    }

    /**
     * Gera o texto do briefing com dados em tempo real do banco SQLite
     */
    generateBriefingText(type = 'morning') {
        const allData = dbService.getAll();
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];
        const formattedDate = now.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });

        if (type === 'morning') {
            // Eventos de hoje
            const todayEvents = (allData.events || []).filter(e => e.date === todayStr);
            todayEvents.sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));

            // Tarefas pendentes de alta prioridade
            const urgentTasks = (allData.tasks || []).filter(t => !t.completed && (t.priority === 'alta' || t.priority === 'urgente'));

            // Contas a pagar/receber hoje
            const todayDebts = (allData.debts || []).filter(d => d.date === todayStr || d.dueDate === todayStr);

            let eventsSection = '';
            if (todayEvents.length > 0) {
                eventsSection = todayEvents.map(e => {
                    const meet = e.hasMeet && e.meetUrl ? ` (🔗 ${e.meetUrl})` : '';
                    return `  • *${e.startTime || 'Horário a definir'}* - ${e.title}${meet}`;
                }).join('\n');
            } else {
                eventsSection = '  • Nenhum compromisso externo agendado para hoje.';
            }

            let tasksSection = '';
            if (urgentTasks.length > 0) {
                tasksSection = urgentTasks.slice(0, 3).map(t => `  • [ ] ${t.title}`).join('\n');
            } else {
                tasksSection = '  • Todas as prioridades críticas estão em dia.';
            }

            let debtsSection = '';
            if (todayDebts.length > 0) {
                const total = todayDebts.reduce((acc, d) => acc + (parseFloat(d.amount) || 0), 0);
                debtsSection = `\n💰 *Finanças (Bernardo):* ${todayDebts.length} conta(s) com vencimento hoje (Total: R$ ${total.toFixed(2)}).`;
            }

            return `*Arthur* · Diretor de Operações\n\n🌅 *Briefing Matinal Executivo*\n${formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1)}\n\n📅 *Agenda de Hoje (Clara):*\n${eventsSection}\n\n🎯 *Prioridades do Dia (Sara):*\n${tasksSection}${debtsSection}\n\nTenha um dia produtivo! Estaremos a postos por aqui.`;
        } else {
            // Noturno
            const todayTxs = (allData.transactions || []).filter(t => t.date === todayStr);
            const totalSpent = todayTxs
                .filter(t => t.type === 'despesa')
                .reduce((acc, t) => acc + (parseFloat(t.amount) || 0), 0);
            const totalIncome = todayTxs
                .filter(t => t.type === 'receita')
                .reduce((acc, t) => acc + (parseFloat(t.amount) || 0), 0);

            // Amanhã
            const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
            const tomorrowStr = tomorrow.toISOString().split('T')[0];
            const tomorrowEvents = (allData.events || []).filter(e => e.date === tomorrowStr);

            let tomorrowSection = '';
            if (tomorrowEvents.length > 0) {
                tomorrowSection = tomorrowEvents.map(e => `  • ${e.startTime} - ${e.title}`).join('\n');
            } else {
                tomorrowSection = '  • Agenda livre para amanhã até o momento.';
            }

            return `*Arthur* · Diretor de Operações\n\n🌙 *Fechamento do Dia*\n${formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1)}\n\n📊 *Balanço Financeiro de Hoje (Bernardo):*\n  • Total de despesas registradas: R$ ${totalSpent.toFixed(2)}\n  • Receitas / Entradas: R$ ${totalIncome.toFixed(2)}\n\n📅 *Visão Prévia de Amanhã (Clara):*\n${tomorrowSection}\n\nDescanse bem! Seu painel está 100% conciliado e sincronizado.`;
        }
    }

    /**
     * Dispara o briefing imediatamente e envia pelo WhatsApp se disponível
     */
    async dispatchBriefing(type = 'morning') {
        const text = this.generateBriefingText(type);
        const timeStr = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

        // Salva nas mensagens do chat e notificações internas do KIT OS
        dbService.addChatMessage({
            id: 'briefing-' + Date.now(),
            sender: 'advisor',
            advisorKey: 'arthur',
            text: text,
            time: timeStr,
            checks: 'read'
        });

        dbService.addNotification({
            title: type === 'morning' ? '🌅 Briefing Matinal Pronto' : '🌙 Fechamento Diário Concluído',
            message: type === 'morning' ? 'Seus compromissos e prioridades do dia foram compilados.' : 'Resumo das finanças e tarefas de hoje finalizado.',
            type: 'sistema',
            priority: 'normal',
            linkTab: 'overview'
        });

        let sentViaWhatsApp = false;
        if (this.whatsappService && this.whatsappService.isReady && this.whatsappService.isReady()) {
            try {
                const selfJid = this.whatsappService.sock?.user?.id?.split(':')[0] + '@s.whatsapp.net';
                if (selfJid) {
                    await this.whatsappService.sock.sendMessage(selfJid, { text });
                    sentViaWhatsApp = true;
                    console.log(`[CronService] Briefing (${type}) enviado para WhatsApp (${selfJid}).`);
                }
            } catch (err) {
                console.warn('[CronService] Não foi possível enviar briefing pelo WhatsApp:', err.message);
            }
        }

        return {
            success: true,
            type,
            sentViaWhatsApp,
            text
        };
    }
}

module.exports = new CronService();
