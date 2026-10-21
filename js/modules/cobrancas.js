/**
 * MEU ASSESSOR OS · COBRANÇAS & QUEM TE DEVE (MARTIN)
 * Manages receivables, personal loans, billing links and payment settlements.
 */

class CobrancasModule {
    constructor(store) {
        this.store = store;

        this.elements = {
            modalDebt: document.getElementById('modalDebt'),
            modalDebtTitle: document.getElementById('modalDebtTitle'),
            formDebt: document.getElementById('formDebt'),
            btnNewDebtModal: document.getElementById('btnNewDebtModal'),
            modalCloseDebt: document.getElementById('modalCloseDebt'),
            btnCancelDebt: document.getElementById('btnCancelDebt'),
            debtEditId: document.getElementById('debtEditId')
        };

        this.init();
    }

    init() {
        this.bindEvents();
        this.render();

        this.store.subscribe(() => {
            this.render();
        });
    }

    bindEvents() {
        // Modal Nova Dívida/Cobrança
        if (this.elements.btnNewDebtModal && this.elements.modalDebt) {
            this.elements.btnNewDebtModal.addEventListener('click', () => {
                if (this.elements.debtEditId) this.elements.debtEditId.value = '';
                if (this.elements.modalDebtTitle) this.elements.modalDebtTitle.textContent = 'Nova Cobrança ou Dívida';
                if (this.elements.formDebt) this.elements.formDebt.reset();
                const dueDateInput = document.getElementById('debtDueDate');
                if (dueDateInput) dueDateInput.value = new Date().toISOString().split('T')[0];
                this.elements.modalDebt.showModal();
            });
        }

        if (this.elements.modalCloseDebt) {
            this.elements.modalCloseDebt.addEventListener('click', () => {
                this.elements.modalDebt.close();
            });
        }

        if (this.elements.btnCancelDebt) {
            this.elements.btnCancelDebt.addEventListener('click', () => {
                this.elements.modalDebt.close();
            });
        }

        if (this.elements.formDebt) {
            this.elements.formDebt.addEventListener('submit', (e) => {
                e.preventDefault();
                const editId = this.elements.debtEditId?.value;
                const type = document.getElementById('debtType').value;
                const person = document.getElementById('debtPerson').value;
                const amount = parseFloat(document.getElementById('debtAmount').value);
                const dueDate = document.getElementById('debtDueDate').value;
                const status = document.getElementById('debtStatus').value;
                const description = document.getElementById('debtDesc').value;

                if (editId) {
                    this.store.updateDebt(editId, {
                        type,
                        person,
                        amount,
                        dueDate,
                        status,
                        description
                    });
                    window.showToast?.('Registro de cobrança atualizado com sucesso!');
                } else {
                    this.store.addDebt({
                        type,
                        person,
                        amount,
                        dueDate,
                        status,
                        description
                    });
                    window.showToast?.('Cobrança registrada! Martin monitorará os prazos.');
                }

                this.elements.formDebt.reset();
                if (this.elements.debtEditId) this.elements.debtEditId.value = '';
                this.elements.modalDebt.close();
            });
        }

        // Modal Criar Link de Cobrança
        const btnNewLink = document.getElementById('btnCreateBillingLinkModal');
        if (btnNewLink) {
            btnNewLink.addEventListener('click', () => {
                const recipient = prompt('Nome do destinatário da cobrança:');
                if (!recipient) return;
                const valStr = prompt('Valor em R$:');
                if (!valStr) return;
                const val = parseFloat(valStr.replace(',', '.'));
                if (isNaN(val) || val <= 0) return alert('Valor inválido.');
                const desc = prompt('Motivo / Descrição:', 'Serviços prestados');

                this.store.addBillingLink({
                    recipient,
                    amount: val,
                    description: desc || 'Cobrança avulsa'
                });
                window.showToast?.(`Link de cobrança de R$ ${val.toFixed(2)} gerado para ${recipient}!`);
            });
        }
    }

    editDebt(id) {
        const debts = this.store.state.debts || [];
        const d = debts.find(item => item.id === id);
        if (!d || !this.elements.modalDebt) return;

        if (this.elements.debtEditId) this.elements.debtEditId.value = d.id;
        if (this.elements.modalDebtTitle) this.elements.modalDebtTitle.textContent = 'Editar Cobrança / Dívida';

        const typeInput = document.getElementById('debtType');
        const personInput = document.getElementById('debtPerson');
        const amountInput = document.getElementById('debtAmount');
        const dueDateInput = document.getElementById('debtDueDate');
        const statusInput = document.getElementById('debtStatus');
        const descInput = document.getElementById('debtDesc');

        if (typeInput) typeInput.value = d.type || 'receber';
        if (personInput) personInput.value = d.person || '';
        if (amountInput) amountInput.value = d.amount || '';
        if (dueDateInput) dueDateInput.value = d.dueDate || '';
        if (statusInput) statusInput.value = d.status || 'pendente';
        if (descInput) descInput.value = d.description || '';

        this.elements.modalDebt.showModal();
    }

    deleteDebt(id) {
        if (!confirm('Deseja realmente excluir este registro de cobrança/dívida?')) return;
        this.store.deleteDebt(id);
        window.showToast?.('Registro de cobrança excluído.');
    }

    deleteBillingLink(id) {
        if (!confirm('Deseja excluir este link de cobrança?')) return;
        this.store.deleteBillingLink(id);
        window.showToast?.('Link de cobrança excluído.');
    }

    render() {
        this.renderDebts();
        this.renderBillingLinks();
    }

    renderDebts() {
        const container = document.getElementById('debtsListContainer');
        if (!container) return;

        const debts = this.store.state.debts || [];
        const totalReceber = debts.filter(d => d.type === 'receber' && d.status === 'pendente').reduce((a, b) => a + (parseFloat(b.amount) || 0), 0);
        const totalPagar = debts.filter(d => d.type === 'pagar' && d.status === 'pendente').reduce((a, b) => a + (parseFloat(b.amount) || 0), 0);

        const elTotalRec = document.getElementById('debtTotalReceber');
        if (elTotalRec) elTotalRec.textContent = totalReceber.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

        const elTotalPag = document.getElementById('debtTotalPagar');
        if (elTotalPag) elTotalPag.textContent = totalPagar.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

        if (debts.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; color: var(--text-muted); padding: 32px 16px;">
                    <span style="font-size: 28px; display: block; margin-bottom: 8px;">🤝</span>
                    <p style="font-size: 13px; margin: 0; font-weight: 500;">Nenhuma cobrança ou dívida pendente.</p>
                    <span style="font-size: 11px; opacity: 0.7;">Clique em <strong>+ Nova Cobrança / Dívida</strong> para cadastrar ou avise os assessores no WhatsApp.</span>
                </div>
            `;
            return;
        }

        container.innerHTML = debts.map(d => `
            <div class="debt-card ${d.status === 'pago' ? 'is-settled' : ''}" style="display: flex; justify-content: space-between; align-items: center; padding: 12px; border: 1px solid var(--border-color); border-radius: 8px; margin-bottom: 8px; background: var(--bg-surface);">
                <div class="debt-card-left" style="display: flex; align-items: center; gap: 10px;">
                    <span class="debt-badge ${d.type === 'receber' ? 'badge-in' : 'badge-out'}">
                        ${d.type === 'receber' ? 'A Receber' : 'A Pagar'}
                    </span>
                    <div>
                        <h4 class="debt-person-name" style="margin: 0; font-size: 14px;">${d.person}</h4>
                        <p class="debt-desc" style="margin: 2px 0 0; font-size: 12px; color: var(--text-muted);">${d.description} · Vence: <strong>${d.dueDate}</strong></p>
                    </div>
                </div>
                <div class="debt-card-right" style="display: flex; align-items: center; gap: 8px;">
                    <span class="debt-amount ${d.type === 'receber' ? 'color-emerald' : 'color-rose'}" style="font-weight: 700; font-size: 14px;">
                        ${d.type === 'receber' ? '+' : '-'} R$ ${(parseFloat(d.amount) || 0).toFixed(2)}
                    </span>
                    ${d.status === 'pendente' ? `
                        <button class="btn btn-outline btn-xs btn-settle-debt" data-id="${d.id}" title="Marcar como Pago">
                            ✓ Dar Baixa
                        </button>
                    ` : `
                        <span class="settled-tag" style="font-size: 11px; color: var(--text-muted); font-weight: 600;">✓ Baixado</span>
                    `}
                    <button class="btn-action-icon btn-edit-debt" data-id="${d.id}" title="Editar Cobrança" style="background: none; border: 1px solid var(--border-color); border-radius: 4px; padding: 2px 6px; cursor: pointer; font-size: 12px;">✏️</button>
                    <button class="btn-action-icon btn-del-debt" data-id="${d.id}" title="Excluir Cobrança" style="background: none; border: 1px solid var(--border-color); border-radius: 4px; padding: 2px 6px; cursor: pointer; font-size: 12px; color: #ef4444;">🗑️</button>
                </div>
            </div>
        `).join('');

        container.querySelectorAll('.btn-settle-debt').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                this.store.settleDebt(id);
                window.showToast?.('Baixa confirmada! Saldo atualizado com os assessores.');
            });
        });

        container.querySelectorAll('.btn-edit-debt').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                this.editDebt(id);
            });
        });

        container.querySelectorAll('.btn-del-debt').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                this.deleteDebt(id);
            });
        });
    }

    renderBillingLinks() {
        const container = document.getElementById('billingLinksContainer');
        if (!container) return;

        const links = this.store.state.billingLinks || [];
        if (links.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; color: var(--text-muted); padding: 32px 16px;">
                    <span style="font-size: 28px; display: block; margin-bottom: 8px;">🔗</span>
                    <p style="font-size: 13px; margin: 0; font-weight: 500;">Nenhum link de cobrança ativo.</p>
                    <span style="font-size: 11px; opacity: 0.7;">Clique em <strong>+ Gerar Link de Cobrança</strong> para criar um link instantâneo com PIX.</span>
                </div>
            `;
            return;
        }

        container.innerHTML = links.map(b => `
            <div class="billing-link-card" style="padding: 12px; border: 1px solid var(--border-color); border-radius: 8px; margin-bottom: 8px; background: var(--bg-surface);">
                <div class="b-link-header" style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <h4 class="b-link-recipient" style="margin: 0; font-size: 14px;">${b.recipient}</h4>
                        <span class="b-link-sub" style="font-size: 11px; color: var(--text-muted);">${b.description} · Gerado em ${b.createdAt}</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 6px;">
                        <span class="b-link-status status-${b.status}">${b.status === 'pago' ? '✓ Pago' : '⏳ Aguardando'}</span>
                        <button class="btn-action-icon btn-del-b-link" data-id="${b.id}" title="Excluir Link" style="background: none; border: 1px solid var(--border-color); border-radius: 4px; padding: 2px 6px; cursor: pointer; font-size: 12px; color: #ef4444;">🗑️</button>
                    </div>
                </div>
                <div class="b-link-body" style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px; gap: 8px;">
                    <div class="b-link-url-box" style="display: flex; gap: 6px; flex: 1;">
                        <input type="text" readonly value="${b.url}" class="b-link-input form-control form-control-sm" style="font-size: 12px; height: 32px;">
                        <button class="btn btn-primary btn-xs btn-copy-b-link" data-url="${b.url}">Copiar</button>
                    </div>
                    <div class="b-link-amount" style="font-weight: 700; font-size: 14px; white-space: nowrap;">R$ ${(parseFloat(b.amount) || 0).toFixed(2)}</div>
                </div>
            </div>
        `).join('');

        container.querySelectorAll('.btn-copy-b-link').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const url = e.currentTarget.getAttribute('data-url');
                navigator.clipboard.writeText(url);
                window.showToast?.('Link de pagamento copiado!');
            });
        });

        container.querySelectorAll('.btn-del-b-link').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                this.deleteBillingLink(id);
            });
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.cobrancasModule = new CobrancasModule(window.appStore);
});
