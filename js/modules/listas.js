/**
 * MEU ASSESSOR OS · LISTAS DINÂMICAS & BANCO DE IDEIAS (LUNA)
 * Interactive checklist lists and idea vault with contextual tagging.
 */

class ListasModule {
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
        const btnNewList = document.getElementById('btnCreateListTrigger');
        if (btnNewList) {
            btnNewList.addEventListener('click', () => {
                const title = prompt('Nome da nova lista:', 'Lista de Compras');
                if (!title) return;
                this.store.addList(title, []);
                window.showToast(`Lista "${title}" criada com sucesso!`);
            });
        }

        const btnNewIdea = document.getElementById('btnCreateIdeaTrigger');
        if (btnNewIdea) {
            btnNewIdea.addEventListener('click', () => {
                const title = prompt('Título da ideia:', 'Nova estratégia de vendas');
                if (!title) return;
                const desc = prompt('Detalhes da ideia:');
                this.store.addIdea({
                    title,
                    description: desc || 'Registrado via painel web',
                    tags: ['Estratégia']
                });
                window.showToast('Ideia guardada no cofre da Luna!');
            });
        }
    }

    render() {
        this.renderLists();
        this.renderIdeas();
    }

    renderLists() {
        const container = document.getElementById('dynamicListsContainer');
        if (!container) return;

        const lists = this.store.state.lists || [];
        if (!lists || lists.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; color: var(--text-muted); padding: 32px 16px;">
                    <span style="font-size: 28px; display: block; margin-bottom: 8px;">📝</span>
                    <p style="font-size: 13px; margin: 0; font-weight: 500;">Nenhuma lista ou checklist ativo.</p>
                    <span style="font-size: 11px; opacity: 0.7;">Diga para a <strong>Luna</strong> no WhatsApp: "Crie uma lista de compras" ou "Anote esses itens".</span>
                </div>
            `;
            return;
        }

        container.innerHTML = lists.map(list => `
            <div class="list-card" data-list-id="${list.id}">
                <div class="list-card-header">
                    <div>
                        <h3 class="list-title">${list.title}</h3>
                        <span class="list-updated">Atualizada: ${list.updatedAt}</span>
                    </div>
                    <button class="btn btn-outline btn-xs btn-add-list-item" data-list-title="${list.title}">+ Item</button>
                </div>
                <div class="list-items-body">
                    ${list.items.map(it => `
                        <label class="list-item-row ${it.done ? 'is-done' : ''}">
                            <input type="checkbox" class="list-checkbox" data-list-id="${list.id}" data-item-id="${it.id}" ${it.done ? 'checked' : ''}>
                            <span class="list-item-text">${it.text}</span>
                        </label>
                    `).join('')}
                </div>
            </div>
        `).join('');

        // Event for checkboxes
        container.querySelectorAll('.list-checkbox').forEach(cb => {
            cb.addEventListener('change', (e) => {
                const lId = e.currentTarget.getAttribute('data-list-id');
                const iId = e.currentTarget.getAttribute('data-item-id');
                this.store.toggleListItem(lId, iId);
            });
        });

        // Event for adding item to list
        container.querySelectorAll('.btn-add-list-item').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const title = e.currentTarget.getAttribute('data-list-title');
                const item = prompt(`Novo item para "${title}":`);
                if (item) {
                    this.store.addListItem(title, item);
                    window.showToast(`Item adicionado na ${title}!`);
                }
            });
        });
    }

    renderIdeas() {
        const container = document.getElementById('ideasVaultContainer');
        if (!container) return;

        const ideas = this.store.state.ideas || [];
        container.innerHTML = ideas.map(idea => `
            <div class="idea-card">
                <div class="idea-card-header">
                    <span class="idea-icon">💡</span>
                    <span class="idea-date">${idea.date}</span>
                </div>
                <h4 class="idea-title">${idea.title}</h4>
                <p class="idea-desc">${idea.description}</p>
                <div class="idea-tags">
                    ${(idea.tags || []).map(t => `<span class="idea-tag">${t}</span>`).join('')}
                </div>
            </div>
        `).join('');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.listasModule = new ListasModule(window.appStore);
});
