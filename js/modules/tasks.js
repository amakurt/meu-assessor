/**
 * MEU ASSESSOR OS · TASKS & PROJECTS MODULE (LUNA)
 * Interactive Kanban Board, Priority Pyramid & Auto-reordering Queue.
 */

class TasksModule {
    constructor(store) {
        this.store = store;
        this.selectedPriorityFilter = 'all';

        this.elements = {
            colBoxTodo: document.getElementById('colBoxTodo'),
            colBoxInProgress: document.getElementById('colBoxInProgress'),
            colBoxWaiting: document.getElementById('colBoxWaiting'),
            colBoxDone: document.getElementById('colBoxDone'),
            countColTodo: document.getElementById('countColTodo'),
            countColInProgress: document.getElementById('countColInProgress'),
            countColWaiting: document.getElementById('countColWaiting'),
            countColDone: document.getElementById('countColDone'),
            filterTaskProject: document.getElementById('filterTaskProject'),
            modalTask: document.getElementById('modalTask'),
            formTask: document.getElementById('formTask'),
            btnNewTask: document.getElementById('btnNewTask'),
            modalCloseTask: document.getElementById('modalCloseTask'),
            btnCancelTask: document.getElementById('btnCancelTask'),
            // 36 Functionalities New Elements
            priorityPyramidContainer: document.getElementById('priorityPyramidContainer')
        };

        this.init();
    }

    init() {
        this.render();
        this.store.subscribe(() => this.render());

        if (this.elements.filterTaskProject) {
            this.elements.filterTaskProject.addEventListener('change', () => {
                this.render();
            });
        }

        // Modal triggers
        if (this.elements.btnNewTask && this.elements.modalTask) {
            this.elements.btnNewTask.addEventListener('click', () => {
                this.elements.modalTask.showModal();
                const nextWeek = new Date();
                nextWeek.setDate(nextWeek.getDate() + 4);
                const dueInput = document.getElementById('taskDueDate');
                if (dueInput) dueInput.value = nextWeek.toISOString().split('T')[0];
            });
        }

        if (this.elements.modalCloseTask) {
            this.elements.modalCloseTask.addEventListener('click', () => {
                this.elements.modalTask.close();
            });
        }

        if (this.elements.btnCancelTask) {
            this.elements.btnCancelTask.addEventListener('click', () => {
                this.elements.modalTask.close();
            });
        }

        if (this.elements.formTask) {
            this.elements.formTask.addEventListener('submit', (e) => {
                e.preventDefault();
                const title = document.getElementById('taskTitle').value;
                const status = document.getElementById('taskStatus').value;
                const priority = document.getElementById('taskPriority').value;
                const dueDate = document.getElementById('taskDueDate').value;
                const project = document.getElementById('taskProject').value || 'Geral';

                this.store.addTask({
                    title,
                    status,
                    priority,
                    dueDate,
                    project,
                    assignedTo: 'Luna'
                });

                this.elements.formTask.reset();
                this.elements.modalTask.close();
                window.showToast?.('Tarefa criada e adicionada à pirâmide da Luna!');
            });
        }
    }

    render() {
        this.renderPyramid();
        this.renderKanban();
    }

    // 36 Funcionalidades: Pirâmide de Prioridade (Luna)
    renderPyramid() {
        const container = document.getElementById('priorityPyramidContainer');
        if (!container) return;

        const tasks = this.store.state.tasks || [];
        const countUrgente = tasks.filter(t => t.priority === 'urgente' && t.status !== 'done').length;
        const countAlta = tasks.filter(t => t.priority === 'alta' && t.status !== 'done').length;
        const countNormal = tasks.filter(t => (t.priority === 'media' || t.priority === 'baixa') && t.status !== 'done').length;

        container.innerHTML = `
            <div class="pyramid-wrapper">
                <div class="pyramid-tier tier-urgent ${this.selectedPriorityFilter === 'urgente' ? 'active' : ''}" data-prio="urgente">
                    <span class="tier-label">🔴 Urgente (Topo)</span>
                    <span class="tier-count">${countUrgente} tarefa(s)</span>
                </div>
                <div class="pyramid-tier tier-high ${this.selectedPriorityFilter === 'alta' ? 'active' : ''}" data-prio="alta">
                    <span class="tier-label">🟠 Alta (Meio)</span>
                    <span class="tier-count">${countAlta} tarefa(s)</span>
                </div>
                <div class="pyramid-tier tier-normal ${this.selectedPriorityFilter === 'normal' ? 'active' : ''}" data-prio="normal">
                    <span class="tier-label">🟢 Normal (Base)</span>
                    <span class="tier-count">${countNormal} tarefa(s)</span>
                </div>
            </div>
        `;

        container.querySelectorAll('.pyramid-tier').forEach(tier => {
            tier.addEventListener('click', (e) => {
                const prio = e.currentTarget.getAttribute('data-prio');
                if (this.selectedPriorityFilter === prio) {
                    this.selectedPriorityFilter = 'all';
                } else {
                    this.selectedPriorityFilter = prio;
                }
                this.render();
            });
        });
    }

    renderKanban() {
        const tasks = this.store.state.tasks || [];
        const projectFilter = this.elements.filterTaskProject ? this.elements.filterTaskProject.value : 'all';

        let filteredTasks = tasks;
        if (projectFilter !== 'all') {
            filteredTasks = filteredTasks.filter(t => (t.project || '').toLowerCase().includes(projectFilter.toLowerCase()));
        }

        // Apply pyramid filter
        if (this.selectedPriorityFilter === 'urgente') {
            filteredTasks = filteredTasks.filter(t => t.priority === 'urgente');
        } else if (this.selectedPriorityFilter === 'alta') {
            filteredTasks = filteredTasks.filter(t => t.priority === 'alta');
        } else if (this.selectedPriorityFilter === 'normal') {
            filteredTasks = filteredTasks.filter(t => t.priority === 'media' || t.priority === 'baixa');
        }

        // Clear columns
        if (this.elements.colBoxTodo) this.elements.colBoxTodo.innerHTML = '';
        if (this.elements.colBoxInProgress) this.elements.colBoxInProgress.innerHTML = '';
        if (this.elements.colBoxWaiting) this.elements.colBoxWaiting.innerHTML = '';
        if (this.elements.colBoxDone) this.elements.colBoxDone.innerHTML = '';

        let counts = { todo: 0, inprogress: 0, waiting: 0, done: 0 };

        filteredTasks.forEach(task => {
            counts[task.status] = (counts[task.status] || 0) + 1;
            const card = this.createTaskCard(task);

            if (task.status === 'todo' && this.elements.colBoxTodo) {
                this.elements.colBoxTodo.appendChild(card);
            } else if (task.status === 'inprogress' && this.elements.colBoxInProgress) {
                this.elements.colBoxInProgress.appendChild(card);
            } else if (task.status === 'waiting' && this.elements.colBoxWaiting) {
                this.elements.colBoxWaiting.appendChild(card);
            } else if (task.status === 'done' && this.elements.colBoxDone) {
                this.elements.colBoxDone.appendChild(card);
            }
        });

        if (this.elements.countColTodo) this.elements.countColTodo.textContent = counts.todo;
        if (this.elements.countColInProgress) this.elements.countColInProgress.textContent = counts.inprogress;
        if (this.elements.countColWaiting) this.elements.countColWaiting.textContent = counts.waiting;
        if (this.elements.countColDone) this.elements.countColDone.textContent = counts.done;
    }

    createTaskCard(task) {
        const div = document.createElement('div');
        div.className = 'task-card';

        let prioClass = 'priority-media';
        if (task.priority === 'urgente') prioClass = 'priority-urgente';
        if (task.priority === 'alta') prioClass = 'priority-alta';
        if (task.priority === 'baixa') prioClass = 'priority-baixa';

        let dueDateStr = task.dueDate || 'Sem prazo';
        if (dueDateStr.includes('-')) {
            const parts = dueDateStr.split('-');
            dueDateStr = `${parts[2]}/${parts[1]}`;
        }

        const nextStatusMap = {
            todo: 'inprogress',
            inprogress: 'done',
            waiting: 'inprogress',
            done: 'todo'
        };

        const nextStatusLabels = {
            todo: 'Iniciar ➔',
            inprogress: 'Concluir ✓',
            waiting: 'Retomar ➔',
            done: 'Reabrir ↺'
        };

        div.innerHTML = `
            <div class="task-card-header">
                <span class="task-priority-badge ${prioClass}">${task.priority}</span>
                <span class="task-project-tag">${task.project || 'Geral'}</span>
            </div>
            <div class="task-card-title">${task.title}</div>
            <div class="task-card-footer">
                <span class="task-due-date">📅 ${dueDateStr}</span>
                <button class="task-status-btn" data-id="${task.id}" data-next="${nextStatusMap[task.status]}">
                    ${nextStatusLabels[task.status]}
                </button>
            </div>
        `;

        const btnMove = div.querySelector('.task-status-btn');
        btnMove.addEventListener('click', () => {
            const nextStatus = btnMove.getAttribute('data-next');
            this.store.updateTaskStatus(task.id, nextStatus);
            window.showToast?.(`Tarefa movida para "${nextStatus}"`);
        });

        return div;
    }
}

// Global instance
window.tasksModule = new TasksModule(window.appStore);
