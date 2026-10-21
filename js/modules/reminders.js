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
            modalReminderTitle: document.getElementById('modalReminderTitle'),
            formReminder: document.getElementById('formReminder'),
            btnNewReminder: document.getElementById('btnNewReminder'),
            modalCloseReminder: document.getElementById('modalCloseReminder'),
            btnCancelReminder: document.getElementById('btnCancelReminder'),
            reminderEditId: document.getElementById('reminderEditId')
        };

        this.init();
    }

    init() {
        this.render();
        this.store.subscribe(() => this.render());

        if (this.elements.btnNewReminder && this.elements.modalReminder) {
            this.elements.btnNewReminder.addEventListener('click', () => {
                if (this.elements.reminderEditId) this.elements.reminderEditId.value = '';
                if (this.elements.modalReminderTitle) this.elements.modalReminderTitle.textContent = 'Programar Novo Lembrete no WhatsApp';
                if (this.elements.formReminder) this.elements.formReminder.reset();
                const today = new Date().toISOString().split('T')[0];
                const dateInput = document.getElementById('reminderDate');
                if (dateInput) dateInput.value = today;
                this.elements.modalReminder.showModal();
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
                const editId = this.elements.reminderEditId?.value;
                const text = document.getElementById('reminderText').value;
                const date = document.getElementById('reminderDate').value;
                const time = document.getElementById('reminderTime').value;
                const recurrence = document.getElementById('reminderRecurrence').value;

                if (editId) {
                    this.store.updateReminder(editId, {
                        text,
                        date,
                        time,
                        recurrence
                    });
                    window.showToast?.('Lembrete atualizado com sucesso!');
                } else {
                    this.store.addReminder({
                        text,
                        date,
                        time,
                        recurrence,
                        status: 'active'
                    });
                    window.showToast?.('Lembrete ativado! Você receberá no WhatsApp.');
                }

                this.elements.formReminder.reset();
                if (this.elements.reminderEditId) this.elements.reminderEditId.value = '';
                this.elements.modalReminder.close();
            });
        }
    }

    editReminder(id) {
        const reminders = this.store.state.reminders || [];
        const rem = reminders.find(r => r.id === id);
        if (!rem || !this.elements.modalReminder) return;

        if (this.elements.reminderEditId) this.elements.reminderEditId.value = rem.id;
        if (this.elements.modalReminderTitle) this.elements.modalReminderTitle.textContent = 'Editar Lembrete do WhatsApp';

        const textInput = document.getElementById('reminderText');
        const dateInput = document.getElementById('reminderDate');
        const timeInput = document.getElementById('reminderTime');
        const recurrenceInput = document.getElementById('reminderRecurrence');

        if (textInput) textInput.value = rem.text || '';
        if (dateInput) dateInput.value = rem.date || '';
        if (timeInput) timeInput.value = rem.time || '09:00';
        if (recurrenceInput) recurrenceInput.value = rem.recurrence || 'once';

        this.elements.modalReminder.showModal();
    }

    deleteReminder(id) {
        if (!confirm('Deseja realmente excluir este lembrete do WhatsApp?')) return;
        this.store.deleteReminder(id);
        window.showToast?.('Lembrete removido.');
    }

    render() {
        if (!this.elements.remindersGrid) return;
        const reminders = this.store.state.reminders || [];

        this.elements.remindersGrid.innerHTML = '';

        if (reminders.length === 0) {
            this.elements.remindersGrid.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; color: var(--text-muted); padding: 48px 16px;">
                    <span style="font-size: 32px; display: block; margin-bottom: 8px;">⏰</span>
                    <p style="font-size: 14px; margin: 0; font-weight: 500;">Nenhum lembrete programado no momento.</p>
                    <span style="font-size: 12px; opacity: 0.7;">Clique em <strong>+ Novo Lembrete</strong> acima ou envie uma mensagem no WhatsApp.</span>
                </div>
            `;
            return;
        }

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
            if (dateFormatted && dateFormatted.includes('-')) {
                const parts = dateFormatted.split('-');
                dateFormatted = `${parts[2]}/${parts[1]}`;
            }

            card.innerHTML = `
                <div class="reminder-header" style="display: flex; justify-content: space-between; align-items: center;">
                    <span class="reminder-time-badge">⏰ ${rem.time} · ${dateFormatted}</span>
                    <div style="display: flex; align-items: center; gap: 6px;">
                        <span class="status-badge-live">Ativo no WhatsApp</span>
                        <button class="btn-action-icon btn-edit-reminder" data-id="${rem.id}" title="Editar Lembrete" style="background: none; border: 1px solid var(--border-color); border-radius: 4px; padding: 2px 6px; cursor: pointer; font-size: 12px;">✏️</button>
                        <button class="btn-action-icon btn-del-reminder" data-id="${rem.id}" title="Excluir Lembrete" style="background: none; border: 1px solid var(--border-color); border-radius: 4px; padding: 2px 6px; cursor: pointer; font-size: 12px; color: #ef4444;">🗑️</button>
                    </div>
                </div>
                <div class="reminder-body" style="margin: 12px 0; font-size: 14px; line-height: 1.4;">
                    "${rem.text}"
                </div>
                <div class="reminder-footer" style="display: flex; justify-content: space-between; font-size: 12px; color: var(--text-muted); border-top: 1px solid var(--border-color); padding-top: 8px;">
                    <span>Recorrência: ${recurrenceLabels[rem.recurrence] || 'Pontual'}</span>
                    <span style="color: var(--primary-accent); font-weight: 600;">Equipe: ${rem.advisor || 'Arthur'}</span>
                </div>
            `;

            card.querySelector('.btn-edit-reminder')?.addEventListener('click', () => this.editReminder(rem.id));
            card.querySelector('.btn-del-reminder')?.addEventListener('click', () => this.deleteReminder(rem.id));

            this.elements.remindersGrid.appendChild(card);
        });
    }
}

// Global instance
window.remindersModule = new RemindersModule(window.appStore);
