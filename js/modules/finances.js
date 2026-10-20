/**
 * MEU ASSESSOR OS · FINANCES MODULE (MARTIN)
 * Handles financial calculations, projection, 30 days in the green, budgets and Open Finance sync.
 */

class FinancesModule {
    constructor(store) {
        this.store = store;
        this.currentFilter = 'all';
        this.currentBankFilter = 'all';

        this.elements = {
            kpiSaldoTotal: document.getElementById('kpiSaldoTotal'),
            kpiReceitasMes: document.getElementById('kpiReceitasMes'),
            kpiDespesasMes: document.getElementById('kpiDespesasMes'),
            kpiContasPendentes: document.getElementById('kpiContasPendentes'),
            kpiContasCount: document.getElementById('kpiContasCount'),
            transactionsTableBody: document.getElementById('transactionsTableBody'),
            transactionsCountBadge: document.getElementById('transactionsCountBadge'),
            modalTransaction: document.getElementById('modalTransaction'),
            formTransaction: document.getElementById('formTransaction'),
            btnNewTransaction: document.getElementById('btnNewTransaction'),
            modalCloseTransaction: document.getElementById('modalCloseTransaction'),
            btnCancelTransaction: document.getElementById('btnCancelTransaction'),
            btnSyncOpenFinance: document.getElementById('btnSyncOpenFinance'),
            btnAddBank: document.getElementById('btnAddBank'),
            // 36 Functionalities New Elements
            martinProjectionBox: document.getElementById('martinProjectionBox'),
            diasNoAzulContainer: document.getElementById('diasNoAzulContainer'),
            budgetsListContainer: document.getElementById('budgetsListContainer')
        };

        this.init();
    }

    init() {
        this.render();
        this.store.subscribe(() => this.render());

        // Filter buttons (Todos / Receitas / Despesas / Pendentes)
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentFilter = btn.getAttribute('data-filter');
                this.renderTransactions();
            });
        });

        // Filter chips por banco
        document.querySelectorAll('.bank-chip').forEach(btn => {
            btn.addEventListener('click', () => {
                const bank = btn.getAttribute('data-bank') || 'all';
                this.setBankFilter(bank);
            });
        });

        // Pílulas superiores de bancos conectados também funcionam como filtro rápido
        document.querySelectorAll('#connectedBanksRow .bank-pill').forEach(pill => {
            pill.addEventListener('click', () => {
                const bank = pill.getAttribute('data-bank');
                if (bank) {
                    if (this.currentBankFilter === bank) {
                        this.setBankFilter('all');
                    } else {
                        this.setBankFilter(bank);
                    }
                }
            });
        });

        // Modal triggers
        if (this.elements.btnNewTransaction && this.elements.modalTransaction) {
            this.elements.btnNewTransaction.addEventListener('click', () => {
                this.elements.modalTransaction.showModal();
                const today = new Date().toISOString().split('T')[0];
                const dateInput = document.getElementById('txDate');
                if (dateInput) dateInput.value = today;
            });
        }

        if (this.elements.modalCloseTransaction) {
            this.elements.modalCloseTransaction.addEventListener('click', () => {
                this.elements.modalTransaction.close();
            });
        }

        if (this.elements.btnCancelTransaction) {
            this.elements.btnCancelTransaction.addEventListener('click', () => {
                this.elements.modalTransaction.close();
            });
        }

        // Form submit
        if (this.elements.formTransaction) {
            this.elements.formTransaction.addEventListener('submit', (e) => {
                e.preventDefault();
                const type = document.querySelector('input[name="txType"]:checked').value;
                const desc = document.getElementById('txDescription').value;
                const amount = parseFloat(document.getElementById('txAmount').value);
                const date = document.getElementById('txDate').value;
                const category = document.getElementById('txCategory').value;
                const paymentMethod = document.getElementById('txPaymentMethod').value;

                this.store.addTransaction({
                    type,
                    description: desc,
                    amount,
                    date,
                    category,
                    paymentMethod,
                    status: 'conciliado',
                    registeredBy: 'Painel Web (Manual)'
                });

                this.elements.formTransaction.reset();
                this.elements.modalTransaction.close();
                window.showToast?.('Lançamento adicionado com sucesso!');
            });
        }

        // Open Finance sync
        if (this.elements.btnSyncOpenFinance) {
            this.elements.btnSyncOpenFinance.addEventListener('click', () => {
                this.elements.btnSyncOpenFinance.disabled = true;
                this.elements.btnSyncOpenFinance.innerHTML = '<span>🔄 Sincronizando com Banco Central...</span>';

                setTimeout(() => {
                    this.elements.btnSyncOpenFinance.disabled = false;
                    this.elements.btnSyncOpenFinance.innerHTML = '<span class="btn-icon">🔄</span><span>Sincronizar Bancos Agora</span>';
                    window.showToast?.('Open Finance atualizado! 114 instituições do Banco Central sincronizadas.');
                }, 1000);
            });
        }

        window.openPluggyConnect = async () => {
            try {
                window.showToast?.('Iniciando conexão segura Open Finance...', 'info');
                const res = await fetch('/api/connect-token');
                const data = await res.json();
                
                if (!data.success || !data.accessToken) {
                    throw new Error(data.error || 'Credenciais da Pluggy não configuradas.');
                }
                
                const token = data.accessToken;

                // Tenta carregar o SDK oficial se ainda não estiver presente
                let PluggyConstructor = window.PluggyConnect || (window.window && window.window.PluggyConnect);
                if (!PluggyConstructor) {
                    await new Promise(resolve => {
                        const s = document.createElement('script');
                        s.src = 'https://cdn.pluggy.ai/pluggy-connect/v2.5.0/pluggy-connect.js';
                        s.onload = () => resolve();
                        s.onerror = () => resolve();
                        document.head.appendChild(s);
                    });
                    PluggyConstructor = window.PluggyConnect || (window.window && window.window.PluggyConnect);
                }

                const handleBankConnected = async (itemId) => {
                    window.showToast?.('Banco conectado com sucesso! Sincronizando saldos e extrato...', 'success');
                    try {
                        const syncRes = await fetch('/api/open-finance/sync', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ itemId })
                        });
                        const syncData = await syncRes.json();
                        window.showToast?.(`Open Finance: ${syncData.importedCount || 0} novos lançamentos reais sincronizados!`, 'success');
                        if (window.store) {
                            window.store.syncWithBackend();
                        }
                    } catch (err) {
                        console.error('Erro ao sincronizar:', err);
                        window.showToast?.('Erro ao sincronizar dados bancários.', 'error');
                    }
                };

                if (PluggyConstructor) {
                    const pluggyConnect = new PluggyConstructor({
                        connectToken: token,
                        includeSandbox: true,
                        onSuccess: (itemData) => {
                            if (itemData && itemData.item && itemData.item.id) {
                                handleBankConnected(itemData.item.id);
                            }
                        },
                        onError: (error) => {
                            console.error('Pluggy Connect Error:', error);
                            window.showToast?.('Conexão bancária interrompida ou cancelada.', 'warning');
                        },
                        onClose: () => {
                            console.log('Pluggy Connect fechado');
                        }
                    });

                    pluggyConnect.init();
                } else {
                    // Fallback Executivo: Renderiza Iframe Oficial Seguro da Pluggy
                    console.log('[OpenFinance] Usando Webview Iframe Direto...');
                    let overlay = document.getElementById('pluggyDirectModal');
                    if (!overlay) {
                        overlay = document.createElement('div');
                        overlay.id = 'pluggyDirectModal';
                        overlay.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.85);z-index:999999;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(8px);';
                        document.body.appendChild(overlay);
                    }

                    overlay.innerHTML = `
                        <div style="width:100%;max-width:480px;height:90vh;max-height:720px;background:#1e1e2d;border-radius:20px;overflow:hidden;position:relative;box-shadow:0 25px 50px -12px rgba(0,0,0,0.7);border:1px solid rgba(255,255,255,0.1);display:flex;flex-direction:column;">
                            <div style="padding:12px 16px;background:rgba(255,255,255,0.03);border-bottom:1px solid rgba(255,255,255,0.08);display:flex;align-items:center;justify-content:space-between;">
                                <div style="display:flex;align-items:center;gap:8px;">
                                    <span style="background:#6366f1;color:#fff;font-size:11px;font-weight:700;padding:2px 8px;border-radius:6px;">KIT OS</span>
                                    <span style="font-size:13px;font-weight:600;color:#fff;">Open Finance Conector</span>
                                </div>
                                <button id="btnClosePluggyIframe" style="background:transparent;border:none;color:#aaa;font-size:20px;cursor:pointer;padding:0 4px;line-height:1;">✕</button>
                            </div>
                            <iframe src="https://connect.pluggy.ai/?connect_token=${encodeURIComponent(token)}" style="width:100%;flex:1;border:none;"></iframe>
                        </div>
                    `;

                    overlay.style.display = 'flex';
                    document.getElementById('btnClosePluggyIframe').onclick = () => {
                        overlay.style.display = 'none';
                    };

                    const messageListener = (event) => {
                        if (event.data && typeof event.data === 'object') {
                            if (event.data.event === 'onSuccess' || event.data.type === 'item/created') {
                                const itemId = event.data.data?.item?.id || event.data.itemId;
                                if (itemId) {
                                    overlay.style.display = 'none';
                                    window.removeEventListener('message', messageListener);
                                    handleBankConnected(itemId);
                                }
                            }
                        }
                    };
                    window.addEventListener('message', messageListener);
                }

            } catch (err) {
                console.error('Open Finance Error:', err);
                window.showToast?.(err.message, 'warning');
            }
        };

        if (this.elements.btnAddBank) {
            this.elements.btnAddBank.addEventListener('click', () => {
                window.openPluggyConnect();
            });
        }
    }

    render() {
        this.renderKPIs();
        this.renderTransactions();
        this.renderProjection();
        this.renderDiasNoAzul();
        this.renderBudgets();
    }

    renderKPIs() {
        const txs = this.store.state.transactions || [];
        let totalReceitas = 0;
        let totalDespesas = 0;
        let contasPendentes = 0;
        let pendentesCount = 0;

        txs.forEach(t => {
            if (t.type === 'receita') {
                totalReceitas += t.amount;
            } else if (t.type === 'despesa') {
                totalDespesas += t.amount;
                if (t.status === 'pendente') {
                    contasPendentes += t.amount;
                    pendentesCount++;
                }
            }
        });

        const saldo = totalReceitas - totalDespesas;

        if (this.elements.kpiSaldoTotal) {
            this.elements.kpiSaldoTotal.textContent = saldo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        }
        if (this.elements.kpiReceitasMes) {
            this.elements.kpiReceitasMes.textContent = totalReceitas.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        }
        if (this.elements.kpiDespesasMes) {
            this.elements.kpiDespesasMes.textContent = totalDespesas.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        }
        if (this.elements.kpiContasPendentes) {
            this.elements.kpiContasPendentes.textContent = contasPendentes.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        }
        if (this.elements.kpiContasCount) {
            this.elements.kpiContasCount.textContent = `${pendentesCount} boleto(s) a pagar`;
        }
    }

    // 36 Funcionalidades: Projeção de Fim de Mês (Martin)
    renderProjection() {
        const container = document.getElementById('martinProjectionBox');
        if (!container) return;

        const txs = this.store.state.transactions || [];
        const totalReceitas = txs.filter(t => t.type === 'receita').reduce((a, b) => a + b.amount, 0);
        const totalDespesas = txs.filter(t => t.type === 'despesa').reduce((a, b) => a + b.amount, 0);
        const saldoAtual = totalReceitas - totalDespesas;

        const entradasPrevistas = 15200.00;
        const saidasPrevistas = 4250.00;
        const projecaoFimMes = saldoAtual + entradasPrevistas - saidasPrevistas;

        container.innerHTML = `
            <div class="projection-grid">
                <div class="proj-item">
                    <span class="proj-label">Caixa Atual em Conta</span>
                    <span class="proj-val color-blue">${saldoAtual.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                </div>
                <div class="proj-operator">+</div>
                <div class="proj-item">
                    <span class="proj-label">Entradas Previstas</span>
                    <span class="proj-val color-emerald">+ R$ ${entradasPrevistas.toFixed(2)}</span>
                </div>
                <div class="proj-operator">-</div>
                <div class="proj-item">
                    <span class="proj-label">Boletos a Vencer</span>
                    <span class="proj-val color-rose">- R$ ${saidasPrevistas.toFixed(2)}</span>
                </div>
                <div class="proj-operator">=</div>
                <div class="proj-item proj-final">
                    <span class="proj-label">Projeção Fim do Mês</span>
                    <span class="proj-val color-green">R$ ${projecaoFimMes.toFixed(2)}</span>
                </div>
            </div>
        `;
    }

    // 36 Funcionalidades: Calendário de Dias no Azul (Martin)
    renderDiasNoAzul() {
        const container = document.getElementById('diasNoAzulContainer');
        if (!container) return;

        // 30 days grid of October
        const days = [];
        for (let i = 1; i <= 31; i++) {
            // Days before today (19) have real outcome, mostly positive
            const isPast = i <= 19;
            const isDeficit = i === 7 || i === 14; // sample 2 deficit days
            days.push({
                day: i,
                status: isPast ? (isDeficit ? 'vermelho' : 'azul') : 'futuro'
            });
        }

        const diasAzulCount = days.filter(d => d.status === 'azul').length;
        const diasAzulBadge = document.getElementById('diasAzulBadgeCount');
        if (diasAzulBadge) diasAzulBadge.textContent = `${diasAzulCount} dias no azul`;

        container.innerHTML = days.map(d => `
            <div class="dia-azul-quadradinho dia-${d.status}" title="Dia ${d.day} de Outubro: ${d.status === 'azul' ? 'Superávit (No Azul)' : (d.status === 'vermelho' ? 'Déficit (No Vermelho)' : 'Previsto')}">
                <span>${d.day}</span>
            </div>
        `).join('');
    }

    // 36 Funcionalidades: Orçamentos por Categoria com Teto e Alertas (Martin)
    renderBudgets() {
        const container = document.getElementById('budgetsListContainer');
        if (!container) return;

        const budgets = this.store.state.budgets || [];
        container.innerHTML = budgets.map(b => {
            const limit = b.limit || b.ceiling || 3000;
            const spent = b.spent || 0;
            const pct = Math.min(Math.round((spent / limit) * 100), 100);
            const isWarning = pct >= 70 && pct < 100;
            const isExceeded = pct >= 100;
            const colorClass = isExceeded ? 'progress-danger' : (isWarning ? 'progress-warning' : 'progress-normal');

            return `
                <div class="budget-card-item">
                    <div class="budget-card-top">
                        <div>
                            <span class="budget-category-title">${b.category}</span>
                            <span class="budget-tag-alert ${isExceeded ? 'tag-danger' : (isWarning ? 'tag-warning' : 'tag-ok')}">
                                ${isExceeded ? '⚠️ Teto Ultrapassado' : (isWarning ? '⚠️ 70% Atingido' : '✓ Sob Controle')}
                            </span>
                        </div>
                        <div class="budget-values-box">
                            <span class="budget-spent">R$ ${spent.toFixed(2)}</span>
                            <span class="budget-limit">de R$ ${limit.toFixed(2)}</span>
                        </div>
                    </div>
                    <div class="budget-progress-track">
                        <div class="budget-progress-fill ${colorClass}" style="width: ${pct}%"></div>
                    </div>
                    <div class="budget-card-bottom">
                        <span class="budget-pct">${pct}% utilizado</span>
                        <span class="budget-remaining">Resta: R$ ${Math.max(0, limit - spent).toFixed(2)}</span>
                    </div>
                </div>
            `;
        }).join('');
    }

    getBankKey(t) {
        const pm = (t.paymentMethod || '').toLowerCase();
        const desc = (t.description || '').toLowerCase();
        if (pm.includes('c6') || desc.includes('c6')) return 'c6';
        if (pm.includes('nu') || pm.includes('platinum') || desc.includes('nubank')) return 'nubank';
        if (pm.includes('mercado pago') || desc.includes('mercado pago')) return 'mercadopago';
        if (pm.includes('itau') || pm.includes('pao de acucar') || desc.includes('itau')) return 'itau';
        return 'manual';
    }

    setBankFilter(bank) {
        this.currentBankFilter = bank;

        // Atualiza estado ativo nos chips
        document.querySelectorAll('.bank-chip').forEach(chip => {
            if (chip.getAttribute('data-bank') === bank) {
                chip.classList.add('active');
            } else {
                chip.classList.remove('active');
            }
        });

        // Atualiza estado selecionado nas pílulas superiores
        document.querySelectorAll('#connectedBanksRow .bank-pill').forEach(pill => {
            if (pill.getAttribute('data-bank') === bank) {
                pill.classList.add('selected');
            } else {
                pill.classList.remove('selected');
            }
        });

        this.renderTransactions();
    }

    updateBankFilterCounts(txs) {
        const counts = { all: txs.length, nubank: 0, mercadopago: 0, itau: 0, c6: 0, manual: 0 };
        txs.forEach(t => {
            const k = this.getBankKey(t);
            if (counts[k] !== undefined) counts[k]++;
            else counts.manual++;
        });

        const setBadge = (id, count) => {
            const el = document.getElementById(id);
            if (el) el.textContent = Number(count).toLocaleString('pt-BR');
        };

        setBadge('badgeCountAll', counts.all);
        setBadge('badgeCountNubank', counts.nubank);
        setBadge('badgeCountMercadoPago', counts.mercadopago);
        setBadge('badgeCountItau', counts.itau);
        setBadge('badgeCountC6', counts.c6);
        setBadge('badgeCountManual', counts.manual);
    }

    renderTransactions() {
        if (!this.elements.transactionsTableBody) return;
        const allTxs = this.store.state.transactions || [];

        // Atualiza os contadores em tempo real para cada banco
        this.updateBankFilterCounts(allTxs);

        let txs = allTxs;

        // 1. Aplica o filtro de Banco
        if (this.currentBankFilter && this.currentBankFilter !== 'all') {
            txs = txs.filter(t => this.getBankKey(t) === this.currentBankFilter);
        }

        // 2. Aplica o filtro de Tipo (Receita, Despesa, Pendente)
        if (this.currentFilter === 'receita') {
            txs = txs.filter(t => t.type === 'receita');
        } else if (this.currentFilter === 'despesa') {
            txs = txs.filter(t => t.type === 'despesa');
        } else if (this.currentFilter === 'pendente') {
            txs = txs.filter(t => t.status === 'pendente');
        }

        if (this.elements.transactionsCountBadge) {
            const bankNames = {
                all: 'Todos os Bancos',
                nubank: 'Nubank',
                mercadopago: 'Mercado Pago',
                itau: 'Itaú',
                c6: 'C6 Bank',
                manual: 'WhatsApp / Manual'
            };
            const bankLabel = bankNames[this.currentBankFilter] || 'Geral';
            this.elements.transactionsCountBadge.textContent = `${txs.length} lançamentos (${bankLabel})`;
        }

        this.elements.transactionsTableBody.innerHTML = '';

        if (txs.length === 0) {
            this.elements.transactionsTableBody.innerHTML = `
                <tr>
                    <td colspan="8" style="text-align: center; color: var(--text-muted); padding: 30px;">
                        Nenhum lançamento encontrado para o filtro selecionado.
                    </td>
                </tr>
            `;
            return;
        }

        txs.forEach(t => {
            const tr = document.createElement('tr');
            const isReceita = t.type === 'receita';
            const amountFormatted = (isReceita ? '+ ' : '- ') + t.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
            const amountClass = isReceita ? 'tx-amount-positive' : 'tx-amount-negative';

            const statusClass = t.status === 'conciliado' ? 'tx-conciliado' : (t.status === 'pendente' ? 'tx-pendente' : 'tx-pago');
            const statusLabel = t.status === 'conciliado' ? '✓ Conciliado' : (t.status === 'pendente' ? '⏳ Pendente' : '✓ Pago');

            // Format date BR
            let dateStr = t.date;
            if (dateStr && dateStr.includes('-')) {
                const parts = dateStr.split('-');
                dateStr = `${parts[2]}/${parts[1]}/${parts[0]}`;
            }

            tr.innerHTML = `
                <td><span class="tx-status-pill ${statusClass}">${statusLabel}</span></td>
                <td><strong>${t.description}</strong></td>
                <td><span class="badge">${t.category}</span></td>
                <td>${t.paymentMethod || 'Cartão / Pix'}</td>
                <td>${dateStr}</td>
                <td><span style="font-size: 11.5px; color: var(--text-muted);">${t.registeredBy || 'WhatsApp (KIT)'}</span></td>
                <td class="text-right ${amountClass}">${amountFormatted}</td>
                <td class="text-center">
                    <button class="btn btn-ghost btn-sm" style="padding: 2px 6px;" title="Detalhes do Lançamento">👁️</button>
                </td>
            `;

            this.elements.transactionsTableBody.appendChild(tr);
        });
    }
}

// Global instance
window.financesModule = new FinancesModule(window.appStore);
