/**
 * MEU ASSESSOR OS · REMINDERS MODULE
 * Unlimited reminders engine with WhatsApp delivery and recurring rules.
 */

class RemindersModule {
    constructor(store) {
        this.store = store;

        this.elements = {
            remindersGrid: document.getElementById('remindersGrid'),
            modalReminder: document.getElementById('modalReminder'),
            formReminder: document.getElementById('formReminder'),
            btnNewReminder: document.getElementById('btnNewReminder'),
            modalCloseReminder: document.getElementById('modalCloseReminder'),
            btnCancelReminder: document.getElementById('btnCancelReminder')
        };

        this.init();
    }

    init() {
        this.render();
        this.store.subscribe(() => this.render());

        if (this.elements.btnNewReminder && this.elements.modalReminder) {
            this.elements.btnNewReminder.addEventListener('click', () => {
                this.elements.modalReminder.showModal();
                const today = new Date().toISOString().split('T')[0];
                const dateInput = document.getElementById('reminderDate');
                if (dateInput) dateInput.value = today;
            });
        }

        if (this.elements.modalCloseReminder) {
            this.elements.modalCloseReminder.addEventListener('click', () => {
                this.elements.modalReminder.close();
            });
        }

        if (this.elements.btnCancelReminder) {
            this.elements.btnCancelReminder.addEventListener('click', () => {
                this.elements.modalReminder.close();
            });
        }

        if (this.elements.formReminder) {
            this.elements.formReminder.addEventListener('submit', (e) => {
                e.preventDefault();
                const text = document.getElementById('reminderText').value;
                const date = document.getElementById('reminderDate').value;
                const time = document.getElementById('reminderTime').value;
                const recurrence = document.getElementById('reminderRecurrence').value;

                this.store.addReminder({
                    text,
                    date,
                    time,
                    recurrence,
                    status: 'active'
                });

                this.elements.formReminder.reset();
                this.elements.modalReminder.close();
                window.showToast?.('Lembrete ativado! Você receberá no WhatsApp.');
            });
        }
    }

    render() {
        if (!this.elements.remindersGrid) return;
        const reminders = this.store.state.reminders || [];

        this.elements.remindersGrid.innerHTML = '';

        const recurrenceLabels = {
            once: 'Uma única vez',
            daily: 'Todos os dias',
            weekly: 'Semanalmente',
            monthly: 'Mensalmente'
        };

        reminders.forEach(rem => {
            const card = document.createElement('div');
            card.className = 'reminder-card';

            let dateFormatted = rem.date;
            if (dateFormatted.includes('-')) {
                const parts = dateFormatted.split('-');
                dateFormatted = `${parts[2]}/${parts[1]}`;
            }

            card.innerHTML = `
                <div class="reminder-header">
                    <span class="reminder-time-badge">⏰ ${rem.time} · ${dateFormatted}</span>
                    <span class="status-badge-live">Ativo no WhatsApp</span>
                </div>
                <div class="reminder-body">
                    "${rem.text}"
                </div>
                <div class="reminder-footer">
                    <span>Recorrência: ${recurrenceLabels[rem.recurrence] || 'Pontual'}</span>
                    <span style="color: var(--brand-purple); font-weight: 600;">Equipe: ${rem.advisor || 'Arthur'}</span>
                </div>
            `;

            this.elements.remindersGrid.appendChild(card);
        });
    }
}

// Global instance
window.remindersModule = new RemindersModule(window.appStore);
