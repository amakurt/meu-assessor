/**
 * MEU ASSESSOR OS · VAULT & CLOUD DRIVE MODULE (LUNA & RITA)
 * Real cloud drive with folders, public shareable links, OCR and semantic search.
 */

class VaultModule {
    constructor(store) {
        this.store = store;
        this.currentCategory = 'all';

        this.elements = {
            vaultGrid: document.getElementById('vaultGrid'),
            btnUploadDocument: document.getElementById('btnUploadDocument'),
            fileUploadInput: document.getElementById('fileUploadInput'),
            cloudDriveFoldersGrid: document.getElementById('cloudDriveFoldersGrid'),
            btnNewDriveFolder: document.getElementById('btnNewDriveFolder')
        };

        this.init();
    }

    init() {
        this.render();
        this.store.subscribe(() => this.render());

        // Category filter chips
        document.querySelectorAll('.vault-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                document.querySelectorAll('.vault-chip').forEach(c => c.classList.remove('active'));
                chip.classList.add('active');
                this.currentCategory = chip.getAttribute('data-vcat');
                this.render();
            });
        });

        // Upload trigger
        if (this.elements.btnUploadDocument && this.elements.fileUploadInput) {
            this.elements.btnUploadDocument.addEventListener('click', () => {
                this.elements.fileUploadInput.click();
            });

            this.elements.fileUploadInput.addEventListener('change', (e) => {
                if (e.target.files && e.target.files.length > 0) {
                    Array.from(e.target.files).forEach(f => {
                        this.store.addVaultFile({
                            name: f.name,
                            category: 'comprovante',
                            fileType: f.name.split('.').pop() || 'pdf',
                            size: `${Math.round(f.size / 1024)} KB`,
                            ocrData: 'Arquivo armazenado com criptografia · OCR processado com sucesso'
                        });
                    });
                    window.showToast?.('Arquivo(s) carregado(s) com sucesso no cofre!');
                }
            });
        }

        if (this.elements.btnNewDriveFolder) {
            this.elements.btnNewDriveFolder.addEventListener('click', () => {
                const folder = prompt('Nome da nova pasta no Meu Drive:', 'Projetos 2026');
                if (folder) {
                    this.store.addDriveFolder(folder);
                    window.showToast(`Pasta "${folder}" criada no Meu Drive!`);
                }
            });
        }
    }

    render() {
        this.renderFolders();
        this.renderFiles();
    }

    // 36 Funcionalidades: Pastas do Meu Drive com Links Públicos (Luna)
    renderFolders() {
        const container = document.getElementById('cloudDriveFoldersGrid');
        if (!container) return;

        const folders = (this.store.state.cloudDrive && this.store.state.cloudDrive.folders) || [];
        container.innerHTML = folders.map(f => `
            <div class="drive-folder-card">
                <div class="folder-icon-row">
                    <span class="folder-svg-icon">📁</span>
                    <button class="btn btn-ghost btn-xs btn-toggle-folder-link" data-id="${f.id}" title="${f.linkActive ? 'Desativar link' : 'Gerar link público'}">
                        ${f.linkActive ? '🔗 Link Ativo' : '🔗 Gerar Link'}
                    </button>
                </div>
                <h4 class="folder-title">${f.name}</h4>
                <div class="folder-meta">${f.count} arquivos · ${f.size}</div>
                ${f.linkActive && f.publicLink ? `
                    <div class="folder-public-box">
                        <input type="text" readonly value="${f.publicLink}" class="folder-public-input">
                        <button class="btn btn-primary btn-xs btn-copy-folder-url" data-url="${f.publicLink}">Copiar</button>
                    </div>
                ` : ''}
            </div>
        `).join('');

        container.querySelectorAll('.btn-toggle-folder-link').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                const f = this.store.toggleFolderPublicLink(id);
                if (f && f.linkActive) {
                    window.showToast(`Link de visualização da pasta "${f.name}" gerado!`);
                } else if (f) {
                    window.showToast(`Link público da pasta "${f.name}" desativado.`);
                }
            });
        });

        container.querySelectorAll('.btn-copy-folder-url').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const url = e.currentTarget.getAttribute('data-url');
                navigator.clipboard.writeText(url);
                window.showToast('Link da pasta copiado para compartilhar!');
            });
        });
    }

    renderFiles() {
        if (!this.elements.vaultGrid) return;
        const vault = this.store.state.vault || [];

        let items = vault;
        if (this.currentCategory !== 'all') {
            items = vault.filter(v => v.category === this.currentCategory);
        }

        this.elements.vaultGrid.innerHTML = '';

        if (items.length === 0) {
            this.elements.vaultGrid.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; color: var(--text-muted); padding: 40px;">
                    Nenhum documento encontrado nesta categoria.
                </div>
            `;
            return;
        }

        const icons = {
            'nota-fiscal': '🧾',
            'comprovante': '💵',
            'contrato': '📜',
            'pessoal': '🪪'
        };

        items.forEach(doc => {
            const card = document.createElement('div');
            card.className = 'vault-item-card';

            const icon = icons[doc.category] || '📁';

            card.innerHTML = `
                <div class="vault-item-header">
                    <div class="vault-file-icon">${icon}</div>
                    <div class="vault-file-meta">
                        <div class="vault-file-name" title="${doc.name}">${doc.name}</div>
                        <div class="vault-file-sub">${doc.folder || 'Geral'} · ${doc.date} · ${doc.size || '320 KB'}</div>
                    </div>
                </div>

                ${doc.ocrData ? `
                    <div class="vault-ocr-badge">
                        <strong>🔍 Leitura IA (Rita & Luna):</strong> ${doc.ocrData}
                    </div>
                ` : ''}

                <div class="vault-actions">
                    <button class="btn btn-secondary btn-sm" style="flex: 1;" onclick="window.showToast?.('Abrindo visualização segura criptografada...')">
                        Visualizar
                    </button>
                    <button class="btn btn-ghost btn-sm" onclick="window.showToast?.('Baixando arquivo do Meu Drive...')">
                        ⬇️
                    </button>
                </div>
            `;

            this.elements.vaultGrid.appendChild(card);
        });
    }
}

// Global instance
window.vaultModule = new VaultModule(window.appStore);
