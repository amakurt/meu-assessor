/**
 * MEU ASSESSOR OS · COBRANÇAS & QUEM TE DEVE (MARTIN)
 * Manages receivables, personal loans, billing links and payment settlements.
 */

class CobrancasModule {
    constructor(store) {
        this.store = store;
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
        const btnNewLink = document.getElementById('btnCreateBillingLinkModal');
        if (btnNewLink) {
            btnNewLink.addEventListener('click', () => {
                const recipient = prompt('Nome do destinatário da cobrança:', 'Rafael Mendes');
                if (!recipient) return;
                const valStr = prompt('Valor em R$:', '250.00');
                if (!valStr) return;
                const val = parseFloat(valStr.replace(',', '.'));
                const desc = prompt('Motivo / Descrição:', 'Serviços prestados');

                this.store.addBillingLink({
                    recipient,
                    amount: val,
                    description: desc || 'Cobrança avulsa'
                });
                window.showToast(`Link de cobrança de R$ ${val.toFixed(2)} gerado para ${recipient}!`);
            });
        }
    }

    render() {
        this.renderDebts();
        this.renderBillingLinks();
    }

    renderDebts() {
        const container = document.getElementById('debtsListContainer');
        if (!container) return;

        const debts = this.store.state.debts;
        const totalReceber = debts.filter(d => d.type === 'receber' && d.status === 'pendente').reduce((a, b) => a + b.amount, 0);
        const totalPagar = debts.filter(d => d.type === 'pagar' && d.status === 'pendente').reduce((a, b) => a + b.amount, 0);

        const elTotalRec = document.getElementById('debtTotalReceber');
        if (elTotalRec) elTotalRec.textContent = totalReceber.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

        const elTotalPag = document.getElementById('debtTotalPagar');
        if (elTotalPag) elTotalPag.textContent = totalPagar.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

        if (!debts || debts.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; color: var(--text-muted); padding: 32px 16px;">
                    <span style="font-size: 28px; display: block; margin-bottom: 8px;">🤝</span>
                    <p style="font-size: 13px; margin: 0; font-weight: 500;">Nenhuma cobrança ou dívida pendente.</p>
                    <span style="font-size: 11px; opacity: 0.7;">Avise o <strong>Martin</strong> no WhatsApp se alguém te dever ou se tiver algo a pagar.</span>
                </div>
            `;
            return;
        }

        container.innerHTML = debts.map(d => `
            <div class="debt-card ${d.status === 'pago' ? 'is-settled' : ''}">
                <div class="debt-card-left">
                    <span class="debt-badge ${d.type === 'receber' ? 'badge-in' : 'badge-out'}">
                        ${d.type === 'receber' ? 'A Receber' : 'A Pagar'}
                    </span>
                    <div>
                        <h4 class="debt-person-name">${d.person}</h4>
                        <p class="debt-desc">${d.description} · Vence: <strong>${d.dueDate}</strong></p>
                    </div>
                </div>
                <div class="debt-card-right">
                    <span class="debt-amount ${d.type === 'receber' ? 'color-emerald' : 'color-rose'}">
                        ${d.type === 'receber' ? '+' : '-'} R$ ${d.amount.toFixed(2)}
                    </span>
                    ${d.status === 'pendente' ? `
                        <button class="btn btn-outline btn-xs btn-settle-debt" data-id="${d.id}">
                            ✓ Dar Baixa
                        </button>
                    ` : `
                        <span class="settled-tag">✓ Baixado</span>
                    `}
                </div>
            </div>
        `).join('');

        container.querySelectorAll('.btn-settle-debt').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                this.store.settleDebt(id);
                window.showToast('Baixa confirmada! Saldo atualizado com o Martin.');
            });
        });
    }

    renderBillingLinks() {
        const container = document.getElementById('billingLinksContainer');
        if (!container) return;

        const links = this.store.state.billingLinks;
        container.innerHTML = links.map(b => `
            <div class="billing-link-card">
                <div class="b-link-header">
                    <div>
                        <h4 class="b-link-recipient">${b.recipient}</h4>
                        <span class="b-link-sub">${b.description} · Gerado em ${b.createdAt}</span>
                    </div>
                    <span class="b-link-status status-${b.status}">${b.status === 'pago' ? '✓ Pago' : '⏳ Aguardando'}</span>
                </div>
                <div class="b-link-body">
                    <div class="b-link-url-box">
                        <input type="text" readonly value="${b.url}" class="b-link-input">
                        <button class="btn btn-primary btn-xs btn-copy-b-link" data-url="${b.url}">Copiar</button>
                    </div>
                    <div class="b-link-amount">R$ ${b.amount.toFixed(2)}</div>
                </div>
            </div>
        `).join('');

        container.querySelectorAll('.btn-copy-b-link').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const url = e.currentTarget.getAttribute('data-url');
                navigator.clipboard.writeText(url);
                window.showToast('Link de pagamento copiado!');
            });
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.cobrancasModule = new CobrancasModule(window.appStore);
});
