/**
 * KIT OS · EXECUTIVE OVERVIEW MODULE (HOME BRIEFING)
 * Painel executivo unificado com resumo de finanças, agenda, tarefas e status de IA.
 */

class OverviewModule {
    constructor(store) {
        this.store = store;
        this.elements = {
            overviewGreeting: document.getElementById('overviewGreeting'),
            overviewDateDisplay: document.getElementById('overviewDateDisplay'),
            overviewKpiSaldo: document.getElementById('overviewKpiSaldo'),
            overviewKpiFluxo: document.getElementById('overviewKpiFluxo'),
            overviewKpiFluxoSub: document.getElementById('overviewKpiFluxoSub'),
            overviewKpiAgendaCount: document.getElementById('overviewKpiAgendaCount'),
            overviewKpiTarefasCount: document.getElementById('overviewKpiTarefasCount'),
            overviewTopCategoriesList: document.getElementById('overviewTopCategoriesList'),
            overviewProjectionVal: document.getElementById('overviewProjectionVal'),
            overviewAgendaList: document.getElementById('overviewAgendaList'),
            overviewTaskList: document.getElementById('overviewTaskList')
        };

        this.init();
    }

    init() {
        this.updateGreeting();
        this.render();
        this.store.subscribe(() => this.render());
    }

    updateGreeting() {
        if (!this.elements.overviewGreeting) return;
        const now = new Date();
        const hour = now.getHours();
        let greeting = 'Bom dia';
        if (hour >= 12 && hour < 18) greeting = 'Boa tarde';
        else if (hour >= 18 || hour < 5) greeting = 'Boa noite';

        this.elements.overviewGreeting.textContent = `${greeting}, Amauri`;

        if (this.elements.overviewDateDisplay) {
            const options = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
            const formattedDate = now.toLocaleDateString('pt-BR', options);
            // Capitaliza a primeira letra do dia da semana
            this.elements.overviewDateDisplay.textContent = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);
        }
    }

    render() {
        this.renderKPIs();
        this.renderTopCategories();
        this.renderUpcomingAgenda();
        this.renderUrgentTasks();
    }

    renderKPIs() {
        const txs = this.store.state.transactions || [];
        const nowMonth = new Date().toISOString().substring(0, 7);
        let saldoTotal = 0;
        let mesReceitas = 0;
        let mesDespesas = 0;

        txs.forEach(t => {
            const isReceita = t.type === 'receita';
            const isDespesa = t.type === 'despesa';
            const isCurrentMonth = t.date && t.date.startsWith(nowMonth);

            if (isReceita) {
                saldoTotal += t.amount;
                if (isCurrentMonth) mesReceitas += t.amount;
            } else if (isDespesa) {
                saldoTotal -= t.amount;
                if (isCurrentMonth) mesDespesas += t.amount;
            }
        });

        const liquidoMes = mesReceitas - mesDespesas;

        if (this.elements.overviewKpiSaldo) {
            this.elements.overviewKpiSaldo.textContent = saldoTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        }

        if (this.elements.overviewKpiFluxo) {
            const isPositive = liquidoMes >= 0;
            this.elements.overviewKpiFluxo.textContent = (isPositive ? '+ ' : '') + liquidoMes.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
            this.elements.overviewKpiFluxo.className = 'kpi-value ' + (isPositive ? 'text-emerald' : 'text-rose');
        }

        if (this.elements.overviewKpiFluxoSub) {
            this.elements.overviewKpiFluxoSub.textContent = `Entradas Mês: ${mesReceitas.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} · Saídas Mês: ${mesDespesas.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`;
        }

        // Agenda Count
        const events = this.store.state.calendarEvents || [];
        if (this.elements.overviewKpiAgendaCount) {
            this.elements.overviewKpiAgendaCount.textContent = events.length.toString();
        }

        // Tasks Count
        const tasks = this.store.state.tasks || [];
        const urgentCount = tasks.filter(t => !t.completed && (t.priority === 'urgente' || t.priority === 'alta')).length;
        if (this.elements.overviewKpiTarefasCount) {
            this.elements.overviewKpiTarefasCount.textContent = urgentCount.toString();
        }

        // Projeção
        const entradasPrevistas = 15200.00;
        const saidasPrevistas = 4250.00;
        const projecaoFimMes = saldoTotal + entradasPrevistas - saidasPrevistas;
        if (this.elements.overviewProjectionVal) {
            this.elements.overviewProjectionVal.textContent = projecaoFimMes.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        }
    }

    renderTopCategories() {
        if (!this.elements.overviewTopCategoriesList) return;
        const txs = this.store.state.transactions || [];
        const nowMonth = new Date().toISOString().substring(0, 7);
        const expenses = txs.filter(t => t.type === 'despesa' && t.date && t.date.startsWith(nowMonth));

        const catMap = {};
        let totalExp = 0;

        expenses.forEach(t => {
            const cat = t.category || 'Geral';
            catMap[cat] = (catMap[cat] || 0) + t.amount;
            totalExp += t.amount;
        });

        const sortedCats = Object.entries(catMap)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 4);

        if (sortedCats.length === 0) {
            this.elements.overviewTopCategoriesList.innerHTML = '<span class="text-muted text-xs">Nenhuma despesa registrada.</span>';
            return;
        }

        const colors = ['#10b981', '#3b82f6', '#f59e0b', '#ec4899'];

        this.elements.overviewTopCategoriesList.innerHTML = sortedCats.map(([cat, val], idx) => {
            const pct = totalExp > 0 ? Math.round((val / totalExp) * 100) : 0;
            const color = colors[idx % colors.length];
            return `
                <div style="display: flex; flex-direction: column; gap: 4px;">
                    <div style="display: flex; justify-content: space-between; font-size: 0.82rem;">
                        <span style="color: #fff; font-weight: 500; display: flex; align-items: center; gap: 6px;">
                            <span style="width: 8px; height: 8px; border-radius: 50%; background: ${color};"></span>
                            ${cat}
                        </span>
                        <span style="color: var(--text-secondary); font-weight: 600;">
                            ${val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            <span style="font-size: 0.72rem; color: var(--text-muted); margin-left: 4px;">(${pct}%)</span>
                        </span>
                    </div>
                    <div style="height: 5px; width: 100%; background: rgba(255,255,255,0.06); border-radius: 3px; overflow: hidden;">
                        <div style="width: ${pct}%; height: 100%; background: ${color}; border-radius: 3px;"></div>
                    </div>
                </div>
            `;
        }).join('');
    }

    renderUpcomingAgenda() {
        if (!this.elements.overviewAgendaList) return;
        const events = this.store.state.calendarEvents || [];
        const upcoming = events.slice(0, 3);

        if (upcoming.length === 0) {
            this.elements.overviewAgendaList.innerHTML = `
                <div class="text-muted text-xs p-3 text-center">Nenhum compromisso agendado para hoje.</div>
            `;
            return;
        }

        this.elements.overviewAgendaList.innerHTML = upcoming.map(ev => `
            <div class="overview-agenda-item">
                <span class="overview-item-time">${ev.time || 'Hoje'}</span>
                <div class="overview-item-info">
                    <div class="overview-item-title">${ev.title || 'Reunião'}</div>
                    <div class="overview-item-sub">${ev.location || 'Google Meet'} · ${ev.participants || 'Equipe'}</div>
                </div>
                <button class="btn btn-ghost btn-sm" onclick="window.switchTab('agenda')" title="Ver detalhes">➔</button>
            </div>
        `).join('');
    }

    renderUrgentTasks() {
        if (!this.elements.overviewTaskList) return;
        const tasks = this.store.state.tasks || [];
        const urgent = tasks.slice(0, 3);

        if (urgent.length === 0) {
            this.elements.overviewTaskList.innerHTML = `
                <div class="text-muted text-xs p-3 text-center">Todas as tarefas em dia!</div>
            `;
            return;
        }

        this.elements.overviewTaskList.innerHTML = urgent.map(t => {
            const isCompleted = t.completed || t.status === 'concluida';
            const isUrgent = t.priority === 'urgente';
            return `
                <div class="overview-task-item ${isCompleted ? 'completed' : ''}" data-task-id="${t.id}">
                    <div class="overview-task-cb" onclick="window.toggleOverviewTask('${t.id}')">
                        ${isCompleted ? '<span style="color:#fff;font-size:11px;">✓</span>' : ''}
                    </div>
                    <span class="overview-task-text" onclick="window.toggleOverviewTask('${t.id}')">${t.title || t.text}</span>
                    <span class="overview-task-tag ${isUrgent ? 'tag-urgent' : 'tag-high'}">
                        ${isUrgent ? 'Urgente' : 'Alta'}
                    </span>
                </div>
            `;
        }).join('');
    }
}

// Global shortcut para marcar tarefa direto na Visão Geral
window.toggleOverviewTask = function(taskId) {
    if (!window.appStore) return;
    const tasks = window.appStore.state.tasks || [];
    const task = tasks.find(t => t.id === taskId);
    if (task) {
        task.completed = !task.completed;
        window.appStore.notify();
        window.showToast?.(`Tarefa "${task.title || task.text}" ${task.completed ? 'concluída! ✓' : 'reaberta.'}`);
    }
};

window.OverviewModule = OverviewModule;
