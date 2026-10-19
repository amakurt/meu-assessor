/**
 * MEU ASSESSOR OS · TEAM / USERS MODULE
 * Unlimited family, partners, and team members on WhatsApp with unified database.
 */

class TeamModule {
    constructor(store) {
        this.store = store;

        this.elements = {
            teamMembersGrid: document.getElementById('teamMembersGrid'),
            modalTeam: document.getElementById('modalTeam'),
            formTeam: document.getElementById('formTeam'),
            btnNewTeamMember: document.getElementById('btnNewTeamMember'),
            modalCloseTeam: document.getElementById('modalCloseTeam'),
            btnCancelTeam: document.getElementById('btnCancelTeam')
        };

        this.init();
    }

    init() {
        this.render();
        this.store.subscribe(() => this.render());

        if (this.elements.btnNewTeamMember && this.elements.modalTeam) {
            this.elements.btnNewTeamMember.addEventListener('click', () => {
                this.elements.modalTeam.showModal();
            });
        }

        if (this.elements.modalCloseTeam) {
            this.elements.modalCloseTeam.addEventListener('click', () => {
                this.elements.modalTeam.close();
            });
        }

        if (this.elements.btnCancelTeam) {
            this.elements.btnCancelTeam.addEventListener('click', () => {
                this.elements.modalTeam.close();
            });
        }

        if (this.elements.formTeam) {
            this.elements.formTeam.addEventListener('submit', (e) => {
                e.preventDefault();
                const name = document.getElementById('teamMemberName').value;
                const phone = document.getElementById('teamMemberPhone').value;
                const role = document.getElementById('teamMemberRole').value;

                this.store.addTeamMember({
                    name,
                    phone,
                    role
                });

                this.elements.formTeam.reset();
                this.elements.modalTeam.close();
                window.showToast?.(`Membro ${name} conectado à equipe! Convite enviado.`);
            });
        }
    }

    render() {
        if (!this.elements.teamMembersGrid) return;
        const team = this.store.state.team || [];

        this.elements.teamMembersGrid.innerHTML = '';

        team.forEach(member => {
            const card = document.createElement('div');
            card.className = 'team-card';

            card.innerHTML = `
                <div class="team-card-header">
                    <div class="team-card-info">
                        <div class="team-avatar">${member.avatar || 'US'}</div>
                        <div>
                            <strong>${member.name}</strong>
                            <div style="font-size: 11.5px; color: var(--text-muted);">${member.phone}</div>
                        </div>
                    </div>
                    <span class="badge badge-subtle">${member.role}</span>
                </div>
                <div class="team-card-footer" style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--border-subtle); padding-top: 10px; font-size: 11.5px;">
                    <span style="color: var(--wa-green-light); font-weight: 600;">● ${member.status}</span>
                    <button class="btn btn-ghost btn-sm" onclick="window.showToast?.('Permissões de ${member.name} salvas')">Gerenciar</button>
                </div>
            `;

            this.elements.teamMembersGrid.appendChild(card);
        });
    }
}

// Global instance
window.teamModule = new TeamModule(window.appStore);
