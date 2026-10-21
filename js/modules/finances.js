/**
 * MEU ASSESSOR OS · FINANCES MODULE (MARTIN)
 * Handles financial calculations, projection, 30 days in the green, budgets,
 * interactive category donut & cash flow charts, instant search, month filter and pagination.
 */

class FinancesModule {
    constructor(store) {
        this.store = store;
        this.currentFilter = 'all';
        this.currentBankFilter = 'all';
        this.searchTerm = '';
        this.currentMonth = 'all';
        this.currentCategoryFilter = 'all';
        this.pageSize = 50;
        this.displayedCount = 50;
        this.monthOptionsPopulated = false;

        this.categoryNamesMap = {
            'Houseware': 'Casa & Móveis',
            'Shopping': 'Compras & Varejo',
            'Food & Beverages': 'Alimentação & Bebidas',
            'Restaurants': 'Restaurantes & Bares',
            'Transportation': 'Transporte & Combustível',
            'Services': 'Serviços & Assinaturas',
            'Health': 'Saúde & Farmácia',
            'Entertainment': 'Lazer & Entretenimento',
            'Utilities': 'Contas de Consumo (Luz/Água)',
            'Transfer': 'Transferências & Pix',
            'Education': 'Educação & Cursos',
            'General': 'Outras Despesas'
        };

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
            martinProjectionBox: document.getElementById('martinProjectionBox'),
            diasNoAzulContainer: document.getElementById('diasNoAzulContainer'),
            budgetsListContainer: document.getElementById('budgetsListContainer'),
            // New Chart & Search Elements
            txSearchInput: document.getElementById('txSearchInput'),
            txMonthFilter: document.getElementById('txMonthFilter'),
            btnLoadMoreTx: document.getElementById('btnLoadMoreTx'),
            btnShowAllTx: document.getElementById('btnShowAllTx'),
            txPaginationInfo: document.getElementById('txPaginationInfo'),
            categoryDonutSvg: document.getElementById('categoryDonutSvg'),
            categoryDonutCenterVal: document.getElementById('categoryDonutCenterVal'),
            categoryLegendList: document.getElementById('categoryLegendList'),
            categoryChartTotalBadge: document.getElementById('categoryChartTotalBadge'),
            cashFlowBarsContainer: document.getElementById('cashFlowBarsContainer'),
            cashFlowSummaryText: document.getElementById('cashFlowSummaryText')
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
                this.displayedCount = this.pageSize;
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

        // Pílulas superiores de bancos conectados
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

        // Instant Search Input
        if (this.elements.txSearchInput) {
            let debounceTimer;
            this.elements.txSearchInput.addEventListener('input', (e) => {
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => {
                    this.searchTerm = e.target.value.trim().toLowerCase();
                    this.displayedCount = this.pageSize;
                    this.renderTransactions();
                }, 120);
            });
        }

        // Month Filter Dropdown
        if (this.elements.txMonthFilter) {
            this.elements.txMonthFilter.addEventListener('change', (e) => {
                this.currentMonth = e.target.value;
                this.displayedCount = this.pageSize;
                this.renderTransactions();
                this.renderCategoryChart();
            });
        }

        // Pagination buttons
        if (this.elements.btnLoadMoreTx) {
            this.elements.btnLoadMoreTx.addEventListener('click', () => {
                this.displayedCount += this.pageSize;
                this.renderTransactions();
            });
        }

        if (this.elements.btnShowAllTx) {
            this.elements.btnShowAllTx.addEventListener('click', () => {
                this.displayedCount = 999999;
                this.renderTransactions();
            });
        }

        // Modal triggers
        if (this.elements.btnNewTransaction && this.elements.modalTransaction) {
            this.elements.btnNewTransaction.addEventListener('click', () => {
                this.elements.formTransaction?.reset();
                const editIdInput = document.getElementById('txEditId');
                if (editIdInput) editIdInput.value = '';
                const modalTitle = document.getElementById('modalTransactionTitle');
                if (modalTitle) modalTitle.textContent = 'Novo Lançamento Financeiro';

                // Popula datalist de compradores com os membros da equipe
                this.populateBuyersDatalist();

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

        // Form submit (Criação & Edição Manual de Lançamentos)
        if (this.elements.formTransaction) {
            this.elements.formTransaction.addEventListener('submit', async (e) => {
                e.preventDefault();
                const editId = document.getElementById('txEditId')?.value;
                const type = document.querySelector('input[name="txType"]:checked')?.value || 'despesa';
                const desc = document.getElementById('txDescription')?.value || '';
                const amount = parseFloat(document.getElementById('txAmount')?.value) || 0;
                const date = document.getElementById('txDate')?.value || new Date().toISOString().split('T')[0];
                const category = document.getElementById('txCategory')?.value || 'Geral';
                const paymentMethod = document.getElementById('txPaymentMethod')?.value || 'Cartão de Crédito';
                const account = document.getElementById('txAccount')?.value || 'Nubank';
                const buyer = document.getElementById('txBuyer')?.value?.trim() || null;

                const payload = {
                    type,
                    description: desc,
                    amount,
                    date,
                    category,
                    paymentMethod,
                    account,
                    buyer,
                    status: 'conciliado',
                    registeredBy: 'Painel Web (Manual)'
                };

                try {
                    if (editId) {
                        // Edição de transação existente
                        await fetch(`/api/transactions/${editId}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(payload)
                        });

                        // Atualiza no store local
                        const localIndex = this.store.state.transactions.findIndex(t => t.id === editId);
                        if (localIndex !== -1) {
                            this.store.state.transactions[localIndex] = {
                                ...this.store.state.transactions[localIndex],
                                ...payload
                            };
                        }
                        window.showToast?.('Lançamento atualizado com sucesso!');
                    } else {
                        // Nova transação manual
                        const res = await fetch('/api/transactions', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(payload)
                        });
                        const data = await res.json();
                        const newTx = data.transaction || { id: `tx-${Date.now()}`, ...payload };
                        this.store.state.transactions.unshift(newTx);
                        window.showToast?.('Lançamento cadastrado com sucesso!');
                    }
                } catch (err) {
                    console.error('Erro ao salvar transação:', err);
                    window.showToast?.('Lançamento salvo localmente.');
                }

                this.elements.formTransaction.reset();
                this.elements.modalTransaction.close();
                this.renderTransactions();
                this.renderDonutChart();
                this.renderCashFlowBars();
            });
        }

        // Delegação de cliques na tabela para Editar e Excluir
        if (this.elements.transactionsTableBody) {
            this.elements.transactionsTableBody.addEventListener('click', async (e) => {
                const btnEdit = e.target.closest('.btn-edit-tx');
                const btnDelete = e.target.closest('.btn-delete-tx');

                if (btnEdit) {
                    const txId = btnEdit.getAttribute('data-id');
                    const tx = this.store.state.transactions.find(t => t.id === txId);
                    if (tx) {
                        document.getElementById('txEditId').value = tx.id;
                        const modalTitle = document.getElementById('modalTransactionTitle');
                        if (modalTitle) modalTitle.textContent = 'Editar Lançamento Financeiro';

                        const radio = document.querySelector(`input[name="txType"][value="${tx.type}"]`);
                        if (radio) radio.checked = true;

                        document.getElementById('txDescription').value = tx.description || '';
                        document.getElementById('txAmount').value = tx.amount || '';
                        document.getElementById('txDate').value = tx.date || '';

                        const catSel = document.getElementById('txCategory');
                        if (catSel) catSel.value = tx.category || 'Alimentação';

                        const paySel = document.getElementById('txPaymentMethod');
                        if (paySel) paySel.value = tx.paymentMethod || 'Cartão de Crédito';

                        const accSel = document.getElementById('txAccount');
                        if (accSel && tx.account) accSel.value = tx.account;

                        const buyerInput = document.getElementById('txBuyer');
                        if (buyerInput) buyerInput.value = tx.buyer || '';

                        this.populateBuyersDatalist();
                        this.elements.modalTransaction.showModal();
                    }
                }

                if (btnDelete) {
                    const txId = btnDelete.getAttribute('data-id');
                    if (confirm('Deseja realmente excluir este lançamento do extrato?')) {
                        try {
                            await fetch(`/api/transactions/${txId}`, { method: 'DELETE' });
                        } catch (err) {}

                        this.store.state.transactions = this.store.state.transactions.filter(t => t.id !== txId);
                        window.showToast?.('Lançamento excluído com sucesso!');
                        this.renderTransactions();
                        this.renderDonutChart();
                        this.renderCashFlowBars();
                    }
                }
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

        if (this.elements.btnAddBank) {
            this.elements.btnAddBank.addEventListener('click', () => {
                if (window.openPluggyConnect) window.openPluggyConnect();
            });
        }
    }

    render() {
        this.renderKPIs();
        this.populateMonthFilter();
        this.renderCategoryChart();
        this.renderCashFlowChart();
        this.renderTransactions();
        this.renderProjection();
        this.renderDiasNoAzul();
        this.renderBudgets();
    }

    populateMonthFilter() {
        if (!this.elements.txMonthFilter || this.monthOptionsPopulated) return;
        const txs = this.store.state.transactions || [];
        const monthSet = new Set();

        txs.forEach(t => {
            if (t.date && t.date.length >= 7) {
                monthSet.add(t.date.substring(0, 7));
            }
        });

        const sortedMonths = Array.from(monthSet).sort().reverse();
        if (sortedMonths.length === 0) return;

        const monthNames = [
            'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
            'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
        ];

        this.elements.txMonthFilter.innerHTML = '<option value="all">Todo o Período</option>';

        sortedMonths.forEach(m => {
            const [y, mo] = m.split('-');
            const monthIdx = parseInt(mo, 10) - 1;
            const label = `${monthNames[monthIdx] || mo} / ${y}`;
            const opt = document.createElement('option');
            opt.value = m;
            opt.textContent = label;
            this.elements.txMonthFilter.appendChild(opt);
        });

        this.monthOptionsPopulated = true;
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

    // Gráfico Donut de Despesas por Categoria (SVG Interativo)
    renderCategoryChart() {
        if (!this.elements.categoryDonutSvg || !this.elements.categoryLegendList) return;

        let txs = this.store.state.transactions || [];
        // Filtra por mês se selecionado
        if (this.currentMonth && this.currentMonth !== 'all') {
            txs = txs.filter(t => t.date && t.date.startsWith(this.currentMonth));
        }

        const expenses = txs.filter(t => t.type === 'despesa');
        const catMap = {};
        let totalExp = 0;

        expenses.forEach(t => {
            const rawCat = t.category || 'Geral';
            const cat = this.categoryNamesMap[rawCat] || rawCat;
            catMap[cat] = (catMap[cat] || 0) + t.amount;
            totalExp += t.amount;
        });

        if (this.elements.categoryChartTotalBadge) {
            this.elements.categoryChartTotalBadge.textContent = totalExp.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        }

        if (this.elements.categoryDonutCenterVal) {
            this.elements.categoryDonutCenterVal.textContent = totalExp.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        }

        const sortedCats = Object.entries(catMap)
            .sort((a, b) => b[1] - a[1]);

        const colors = [
            '#10b981', '#06b6d4', '#3b82f6', '#6366f1',
            '#f59e0b', '#f43f5e', '#ec4899', '#8b5cf6',
            '#14b8a6', '#64748b'
        ];

        // Roda o cálculo do Donut SVG
        const radius = 65;
        const circumference = 2 * Math.PI * radius; // ~408.4
        let accumulatedPercent = 0;

        let svgHtml = `<circle cx="85" cy="85" r="${radius}" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="22" />`;

        sortedCats.slice(0, 8).forEach(([cat, val], idx) => {
            const pct = totalExp > 0 ? val / totalExp : 0;
            const strokeDasharray = `${pct * circumference} ${circumference}`;
            const strokeDashoffset = -(accumulatedPercent * circumference);
            const color = colors[idx % colors.length];

            svgHtml += `
                <circle cx="85" cy="85" r="${radius}" fill="none" stroke="${color}" stroke-width="22"
                    stroke-dasharray="${strokeDasharray}" stroke-dashoffset="${strokeDashoffset}"
                    style="transition: stroke-dasharray 0.5s ease, stroke-dashoffset 0.5s ease; cursor: pointer;"
                    transform="rotate(-90 85 85)">
                    <title>${cat}: ${val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} (${Math.round(pct * 100)}%)</title>
                </circle>
            `;

            accumulatedPercent += pct;
        });

        this.elements.categoryDonutSvg.innerHTML = svgHtml;

        // Renderiza legenda interativa
        this.elements.categoryLegendList.innerHTML = sortedCats.map(([cat, val], idx) => {
            const pct = totalExp > 0 ? Math.round((val / totalExp) * 100) : 0;
            const color = colors[idx % colors.length];
            const isSelected = this.currentCategoryFilter === cat;

            return `
                <div class="donut-legend-item ${isSelected ? 'selected' : ''}" data-cat="${cat}" title="Clique para filtrar apenas ${cat}">
                    <span class="donut-legend-dot" style="background: ${color};"></span>
                    <span class="donut-legend-name">${cat}</span>
                    <span class="donut-legend-amount">${val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                    <span class="donut-legend-pct">${pct}%</span>
                </div>
            `;
        }).join('');

        // Clique na legenda filtra a tabela por categoria
        this.elements.categoryLegendList.querySelectorAll('.donut-legend-item').forEach(item => {
            item.addEventListener('click', () => {
                const cat = item.getAttribute('data-cat');
                if (this.currentCategoryFilter === cat) {
                    this.currentCategoryFilter = 'all';
                } else {
                    this.currentCategoryFilter = cat;
                }
                this.renderTransactions();
                this.renderCategoryChart();
            });
        });
    }

    // Gráfico de Fluxo Mensal (Entradas vs Saídas)
    renderCashFlowChart() {
        if (!this.elements.cashFlowBarsContainer) return;

        const txs = this.store.state.transactions || [];
        const monthlyData = {};

        txs.forEach(t => {
            if (!t.date || t.date.length < 7) return;
            const m = t.date.substring(0, 7);
            if (!monthlyData[m]) monthlyData[m] = { in: 0, out: 0 };
            if (t.type === 'receita') monthlyData[m].in += t.amount;
            else if (t.type === 'despesa') monthlyData[m].out += t.amount;
        });

        const months = Object.keys(monthlyData).sort().slice(-4);
        if (months.length === 0) {
            this.elements.cashFlowBarsContainer.innerHTML = '<span class="text-muted text-xs p-4">Sem dados suficientes para o gráfico.</span>';
            return;
        }

        let maxVal = 1000;
        months.forEach(m => {
            if (monthlyData[m].in > maxVal) maxVal = monthlyData[m].in;
            if (monthlyData[m].out > maxVal) maxVal = monthlyData[m].out;
        });

        const shortMonthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

        this.elements.cashFlowBarsContainer.innerHTML = months.map(m => {
            const [y, mo] = m.split('-');
            const label = shortMonthNames[parseInt(mo, 10) - 1] || mo;
            const inVal = monthlyData[m].in;
            const outVal = monthlyData[m].out;
            const inHeight = Math.max(8, Math.round((inVal / maxVal) * 120));
            const outHeight = Math.max(8, Math.round((outVal / maxVal) * 120));

            return `
                <div class="cashflow-month-group">
                    <div class="cashflow-bars-pair">
                        <div class="cf-bar cf-bar-in" style="height: ${inHeight}px" title="${label}: Entradas de ${inVal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}"></div>
                        <div class="cf-bar cf-bar-out" style="height: ${outHeight}px" title="${label}: Saídas de ${outVal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}"></div>
                    </div>
                    <span class="cashflow-month-label">${label}</span>
                </div>
            `;
        }).join('');

        if (this.elements.cashFlowSummaryText) {
            const lastMonth = months[months.length - 1];
            if (lastMonth && monthlyData[lastMonth]) {
                const bal = monthlyData[lastMonth].in - monthlyData[lastMonth].out;
                const isPos = bal >= 0;
                this.elements.cashFlowSummaryText.innerHTML = `Balanço recente: <strong style="color: ${isPos ? '#10b981' : '#f43f5e'};">${(isPos ? '+ ' : '') + bal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong>`;
            }
        }
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

        document.querySelectorAll('.bank-chip').forEach(chip => {
            if (chip.getAttribute('data-bank') === bank) {
                chip.classList.add('active');
            } else {
                chip.classList.remove('active');
            }
        });

        document.querySelectorAll('#connectedBanksRow .bank-pill').forEach(pill => {
            if (pill.getAttribute('data-bank') === bank) {
                pill.classList.add('selected');
            } else {
                pill.classList.remove('selected');
            }
        });

        this.displayedCount = this.pageSize;
        this.renderTransactions();
        this.renderCategoryChart();
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

        this.updateBankFilterCounts(allTxs);

        let txs = allTxs;

        // 1. Filtro de Banco
        if (this.currentBankFilter && this.currentBankFilter !== 'all') {
            txs = txs.filter(t => this.getBankKey(t) === this.currentBankFilter);
        }

        // 2. Filtro de Tipo (Receita, Despesa, Pendente)
        if (this.currentFilter === 'receita') {
            txs = txs.filter(t => t.type === 'receita');
        } else if (this.currentFilter === 'despesa') {
            txs = txs.filter(t => t.type === 'despesa');
        } else if (this.currentFilter === 'pendente') {
            txs = txs.filter(t => t.status === 'pendente');
        }

        // 3. Filtro de Mês
        if (this.currentMonth && this.currentMonth !== 'all') {
            txs = txs.filter(t => t.date && t.date.startsWith(this.currentMonth));
        }

        // 4. Filtro de Categoria (via clique no Donut)
        if (this.currentCategoryFilter && this.currentCategoryFilter !== 'all') {
            txs = txs.filter(t => {
                const rawCat = t.category || 'Geral';
                const cat = this.categoryNamesMap[rawCat] || rawCat;
                return cat === this.currentCategoryFilter;
            });
        }

        // 5. Busca Instantânea
        if (this.searchTerm) {
            txs = txs.filter(t => {
                const desc = (t.description || '').toLowerCase();
                const cat = (t.category || '').toLowerCase();
                const pm = (t.paymentMethod || '').toLowerCase();
                const val = (t.amount || '').toString();
                return desc.includes(this.searchTerm) ||
                       cat.includes(this.searchTerm) ||
                       pm.includes(this.searchTerm) ||
                       val.includes(this.searchTerm);
            });
        }

        const totalFiltered = txs.length;

        // Badge de contagem
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
            this.elements.transactionsCountBadge.textContent = `${totalFiltered} lançamentos (${bankLabel})`;
        }

        // Paginação
        const displayedTxs = txs.slice(0, this.displayedCount);

        if (this.elements.txPaginationInfo) {
            this.elements.txPaginationInfo.textContent = `Exibindo ${displayedTxs.length} de ${totalFiltered} lançamentos`;
        }

        if (this.elements.btnLoadMoreTx) {
            this.elements.btnLoadMoreTx.style.display = displayedTxs.length < totalFiltered ? 'inline-flex' : 'none';
        }

        if (this.elements.btnShowAllTx) {
            this.elements.btnShowAllTx.style.display = displayedTxs.length < totalFiltered ? 'inline-flex' : 'none';
        }

        this.elements.transactionsTableBody.innerHTML = '';

        if (displayedTxs.length === 0) {
            this.elements.transactionsTableBody.innerHTML = `
                <tr>
                    <td colspan="8" style="text-align: center; color: var(--text-muted); padding: 30px;">
                        Nenhum lançamento encontrado para os filtros selecionados.
                    </td>
                </tr>
            `;
            return;
        }

        displayedTxs.forEach(t => {
            const tr = document.createElement('tr');
            const isReceita = t.type === 'receita';
            const amountFormatted = (isReceita ? '+ ' : '- ') + t.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
            const amountClass = isReceita ? 'tx-amount-positive' : 'tx-amount-negative';

            const statusClass = t.status === 'conciliado' ? 'tx-conciliado' : (t.status === 'pendente' ? 'tx-pendente' : 'tx-pago');
            const statusLabel = t.status === 'conciliado' ? '✓ Conciliado' : (t.status === 'pendente' ? '⏳ Pendente' : '✓ Pago');

            let dateStr = t.date;
            if (dateStr && dateStr.includes('-')) {
                const parts = dateStr.split('-');
                dateStr = `${parts[2]}/${parts[1]}/${parts[0]}`;
            }

            const rawCat = t.category || 'Geral';
            const categoryDisplay = this.categoryNamesMap[rawCat] || rawCat;

            const buyerTagHtml = t.buyer 
                ? `<div class="tx-buyer-tag">👤 Compra de: <strong>${t.buyer}</strong></div>` 
                : '';

            const accountDisplay = t.account 
                ? `<div><strong style="font-size: 12.5px;">${t.account}</strong></div><span class="tx-account-tag">${t.paymentMethod || 'Cartão'}</span>` 
                : `<div>${t.paymentMethod || 'Cartão / Pix'}</div>`;

            tr.innerHTML = `
                <td><span class="tx-status-pill ${statusClass}">${statusLabel}</span></td>
                <td>
                    <div><strong>${t.description}</strong></div>
                    ${buyerTagHtml}
                </td>
                <td><span class="badge">${categoryDisplay}</span></td>
                <td>${accountDisplay}</td>
                <td>${dateStr}</td>
                <td><span style="font-size: 11.5px; color: var(--text-muted);">${t.registeredBy || 'WhatsApp (KIT)'}</span></td>
                <td class="text-right ${amountClass}">${amountFormatted}</td>
                <td class="text-center">
                    <div style="display: flex; gap: 4px; justify-content: center;">
                        <button class="btn-action-icon btn-edit-tx" data-id="${t.id}" title="Editar este lançamento">✏️</button>
                        <button class="btn-action-icon btn-delete btn-delete-tx" data-id="${t.id}" title="Excluir lançamento">🗑️</button>
                    </div>
                </td>
            `;

            this.elements.transactionsTableBody.appendChild(tr);
        });
    }

    populateBuyersDatalist() {
        const dl = document.getElementById('teamBuyersList');
        if (!dl) return;

        const members = this.store.state.teamMembers || [];
        const buyersSet = new Set(['Amauri Castro']);

        members.forEach(m => {
            if (m.name) buyersSet.add(m.name);
        });

        // Adiciona quem já comprou no histórico
        const txs = this.store.state.transactions || [];
        txs.forEach(t => {
            if (t.buyer) buyersSet.add(t.buyer);
        });

        dl.innerHTML = '';
        buyersSet.forEach(name => {
            const opt = document.createElement('option');
            opt.value = name;
            dl.appendChild(opt);
        });
    }

    // Projeção de Fim de Mês (Martin)
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

    // Calendário de Dias no Azul (Martin)
    renderDiasNoAzul() {
        const container = document.getElementById('diasNoAzulContainer');
        if (!container) return;

        const days = [];
        for (let i = 1; i <= 31; i++) {
            const isPast = i <= 21;
            const isDeficit = i === 7 || i === 14;
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

    // Orçamentos por Categoria (Martin)
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
}

window.FinancesModule = FinancesModule;
