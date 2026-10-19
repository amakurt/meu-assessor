/**
 * MEU ASSESSOR OS · MESA DE PESQUISAS (ÍTALO)
 * Live research feed with verified sources, status filtering and real-time execution.
 */

class ResearchesModule {
    constructor(store) {
        this.store = store;
        this.filter = 'all'; // 'all', 'entregue', 'andamento', 'falha'
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
        const filterBtns = document.querySelectorAll('.research-filter-pill');
        filterBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                filterBtns.forEach(b => b.classList.remove('active'));
                e.currentTarget.classList.add('active');
                this.filter = e.currentTarget.getAttribute('data-status') || 'all';
                this.render();
            });
        });

        const btnNewSearch = document.getElementById('btnNewSearchTrigger');
        if (btnNewSearch) {
            btnNewSearch.addEventListener('click', () => {
                const queryInput = document.getElementById('researchQueryInput');
                if (queryInput && queryInput.value.trim()) {
                    const q = queryInput.value.trim();
                    queryInput.value = '';

                    // Trigger research through AI Engine
                    window.appStore.addChatMessage({
                        id: 'm-' + Date.now(),
                        sender: 'user',
                        text: `Ítalo, pesquisa: ${q}`,
                        time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
                        checks: 'read'
                    });

                    window.aiEngine.processUserMessage(`Ítalo, pesquisa ${q}`).then(replies => {
                        replies.forEach(rep => {
                            window.appStore.addChatMessage({
                                id: 'm-rep-' + Date.now(),
                                sender: 'advisor',
                                advisorKey: rep.advisorKey,
                                text: rep.text,
                                receipt: rep.receipt,
                                time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
                                checks: 'read'
                            });
                        });
                    });

                    window.showToast('Pesquisa enviada ao Ítalo! Resposta pronta com fonte verificada.');
                }
            });
        }
    }

    render() {
        const container = document.getElementById('researchFeedList');
        if (!container) return;

        let list = this.store.state.researches;
        if (this.filter !== 'all') {
            list = list.filter(r => r.status === this.filter);
        }

        if (list.length === 0) {
            container.innerHTML = `
                <div class="empty-state-card">
                    <span class="empty-icon">🔍</span>
                    <h3>Nenhuma pesquisa nessa categoria</h3>
                    <p>Peça ao Ítalo para pesquisar preços, cotações de moedas ou regras na internet.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = list.map(item => `
            <div class="research-card">
                <div class="research-card-header">
                    <div class="research-advisor-badge">
                        <img src="images/italo_otim.jpg" alt="Ítalo" class="research-avatar">
                        <div>
                            <span class="research-name">Ítalo · Estagiário de Pesquisas</span>
                            <span class="research-time">${item.date} às ${item.time}</span>
                        </div>
                    </div>
                    <span class="research-status-pill status-${item.status}">
                        ${item.status === 'entregue' ? '✓ Entregue com Fonte' : 'Em Andamento'}
                    </span>
                </div>
                <h3 class="research-query-title">"${item.query}"</h3>
                <p class="research-summary-text">${item.summary}</p>
                <div class="research-card-footer">
                    <div class="research-source-info">
                        <span class="source-label">Fonte verificada:</span>
                        <span class="source-name">${item.sourceName}</span>
                    </div>
                    <a href="${item.sourceUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-outline btn-xs">
                        <span>Ver fonte original</span>
                        <span class="btn-icon">↗</span>
                    </a>
                </div>
            </div>
        `).join('');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.researchesModule = new ResearchesModule(window.appStore);
});
