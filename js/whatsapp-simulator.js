/**
 * MEU ASSESSOR OS · WHATSAPP SIMULATOR CONTROLLER (EXPANDED)
 * Controls simulated WhatsApp chat with interactive receipts, buttons and audio/file triggers.
 */

class WhatsAppSimulator {
    constructor(store, aiEngine) {
        this.store = store;
        this.aiEngine = aiEngine;
        this.isTyping = false;

        this.elements = {
            messagesBody: document.getElementById('waMessagesBody'),
            textInput: document.getElementById('waTextInput'),
            btnSend: document.getElementById('waBtnSend'),
            btnAudio: document.getElementById('waBtnAudio'),
            btnAttach: document.getElementById('waBtnAttach'),
            fileInput: document.getElementById('waFileInput'),
            typingIndicator: document.getElementById('waTypingIndicator'),
            typingAdvisorName: document.getElementById('typingAdvisorName'),
            typingAvatar: document.getElementById('typingAvatar'),
            liveExecutionFeed: document.getElementById('liveExecutionFeed'),
            phoneLiveClock: document.getElementById('phoneLiveClock')
        };

        this.init();
    }

    init() {
        this.updateClock();
        setInterval(() => this.updateClock(), 60000);

        // Render initial messages
        this.renderMessages();
        this.renderExecutionFeed();

        // Listen for store changes
        this.store.subscribe((state) => {
            this.renderMessages();
            this.renderExecutionFeed();
        });

        // Event listeners
        if (this.elements.btnSend) {
            this.elements.btnSend.addEventListener('click', () => this.sendMessage());
        }

        if (this.elements.textInput) {
            this.elements.textInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.sendMessage();
                }
            });
        }

        if (this.elements.btnAudio) {
            this.elements.btnAudio.addEventListener('click', () => this.simulateAudioMessage());
        }

        if (this.elements.btnAttach && this.elements.fileInput) {
            this.elements.btnAttach.addEventListener('click', () => {
                this.elements.fileInput.click();
            });

            this.elements.fileInput.addEventListener('change', (e) => {
                if (e.target.files && e.target.files[0]) {
                    this.simulateFileAttachment(e.target.files[0]);
                }
            });
        }

        // Quick prompt chips
        document.querySelectorAll('.prompt-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                const prompt = chip.getAttribute('data-prompt');
                if (this.elements.textInput) {
                    this.elements.textInput.value = prompt;
                    this.sendMessage();
                }
            });
        });
    }

    updateClock() {
        if (!this.elements.phoneLiveClock) return;
        const now = new Date();
        const h = now.getHours().toString().padStart(2, '0');
        const m = now.getMinutes().toString().padStart(2, '0');
        this.elements.phoneLiveClock.textContent = `${h}:${m}`;
    }

    getCurrentTimeStr() {
        const now = new Date();
        return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    }

    renderMessages() {
        if (!this.elements.messagesBody) return;
        const messages = this.store.state.chatMessages;

        const notice = this.elements.messagesBody.querySelector('.wa-encryption-notice');
        this.elements.messagesBody.innerHTML = '';
        if (notice) this.elements.messagesBody.appendChild(notice);

        messages.forEach(msg => {
            const bubble = document.createElement('div');
            bubble.className = `wa-bubble ${msg.sender === 'user' ? 'bubble-user' : 'bubble-advisor'}`;

            if (msg.sender === 'advisor') {
                const advisor = this.store.state.advisors[msg.advisorKey] || this.store.state.advisors.arthur || this.store.state.advisors.theo;
                const header = document.createElement('div');
                header.className = 'advisor-bubble-header';
                header.innerHTML = `
                    <img src="${advisor.avatar}" alt="${advisor.name}" class="advisor-bubble-avatar">
                    <span class="advisor-bubble-name" style="color: ${advisor.color}">${advisor.name}</span>
                    <span class="advisor-bubble-role">· ${advisor.role}</span>
                `;
                bubble.appendChild(header);
            }

            // Message Body
            if (msg.isAudio) {
                const audioPlayer = document.createElement('div');
                audioPlayer.className = 'bubble-audio-player';
                audioPlayer.innerHTML = `
                    <button class="audio-play-btn" type="button" aria-label="Tocar áudio">▶</button>
                    <div class="audio-waveform">
                        <span class="audio-bar" style="height: 14px"></span>
                        <span class="audio-bar" style="height: 22px"></span>
                        <span class="audio-bar" style="height: 8px"></span>
                        <span class="audio-bar" style="height: 18px"></span>
                        <span class="audio-bar" style="height: 24px"></span>
                        <span class="audio-bar" style="height: 12px"></span>
                        <span class="audio-bar" style="height: 16px"></span>
                        <span class="audio-bar" style="height: 20px"></span>
                    </div>
                    <span class="audio-duration">${msg.audioDuration || '0:07'}</span>
                `;
                bubble.appendChild(audioPlayer);

                if (msg.audioTranscript) {
                    const trans = document.createElement('p');
                    trans.style.fontSize = '12px';
                    trans.style.marginTop = '6px';
                    trans.style.opacity = '0.9';
                    trans.innerHTML = `<em>"${msg.audioTranscript}"</em>`;
                    bubble.appendChild(trans);
                }
            } else {
                const textElem = document.createElement('p');
                textElem.textContent = msg.text;
                bubble.appendChild(textElem);
            }

            // Action Receipt with Interactive Buttons (24h)
            if (msg.receipt) {
                const receiptBox = document.createElement('div');
                receiptBox.className = 'bubble-action-receipt';
                let itemsHtml = msg.receipt.items.map(it => `<div class="receipt-item">• ${it}</div>`).join('');
                
                let buttonsHtml = '';
                if (msg.receipt.buttons && msg.receipt.buttons.length > 0) {
                    buttonsHtml = `
                        <div class="receipt-buttons">
                            ${msg.receipt.buttons.map(btn => `
                                <button class="receipt-btn" data-action="${btn.action}" data-url="${btn.url || ''}">
                                    ${btn.label}
                                </button>
                            `).join('')}
                        </div>
                    `;
                }

                receiptBox.innerHTML = `
                    <div class="receipt-header-row">
                        <span class="receipt-title">${msg.receipt.title}</span>
                        <span class="receipt-badge">24h ativo</span>
                    </div>
                    ${itemsHtml}
                    ${buttonsHtml}
                `;

                // Handle button clicks
                receiptBox.querySelectorAll('.receipt-btn').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        const action = e.currentTarget.getAttribute('data-action');
                        const url = e.currentTarget.getAttribute('data-url');

                        if (action === 'undo') {
                            if (this.elements.textInput) {
                                this.elements.textInput.value = 'Desfazer';
                                this.sendMessage();
                            }
                        } else if (action === 'edit') {
                            if (this.elements.textInput) {
                                this.elements.textInput.value = 'O valor é ';
                                this.elements.textInput.focus();
                            }
                        } else if (action === 'open-source') {
                            if (url) window.open(url, '_blank');
                        } else if (action === 'open-booking-modal') {
                            if (window.openBookingModal) window.openBookingModal();
                        } else if (action === 'download-report') {
                            if (window.triggerReportDownload) window.triggerReportDownload();
                        }
                    });
                });

                bubble.appendChild(receiptBox);
            }

            // Meta (time & double check)
            const meta = document.createElement('div');
            meta.className = 'bubble-meta';
            meta.innerHTML = `
                <span>${msg.time}</span>
                ${msg.sender === 'user' ? '<span class="bubble-checks">✓✓</span>' : ''}
            `;
            bubble.appendChild(meta);

            this.elements.messagesBody.appendChild(bubble);
        });

        this.scrollToBottom();
    }

    scrollToBottom() {
        if (!this.elements.messagesBody) return;
        this.elements.messagesBody.scrollTop = this.elements.messagesBody.scrollHeight;
    }

    showTyping(advisorKey = 'martin') {
        const advisor = this.store.state.advisors[advisorKey] || this.store.state.advisors.arthur || this.store.state.advisors.theo;
        if (this.elements.typingAdvisorName) {
            this.elements.typingAdvisorName.textContent = advisor.name;
        }
        if (this.elements.typingAvatar) {
            this.elements.typingAvatar.innerHTML = `<img src="${advisor.avatar}" alt="${advisor.name}">`;
        }
        if (this.elements.typingIndicator) {
            this.elements.typingIndicator.style.display = 'inline-flex';
        }
        this.scrollToBottom();
    }

    hideTyping() {
        if (this.elements.typingIndicator) {
            this.elements.typingIndicator.style.display = 'none';
        }
    }

    async sendMessage() {
        const text = this.elements.textInput.value.trim();
        if (!text) return;

        this.elements.textInput.value = '';

        // Add user message to store
        this.store.addChatMessage({
            id: 'm-' + Date.now(),
            sender: 'user',
            text: text,
            time: this.getCurrentTimeStr(),
            checks: 'read'
        });

        // Determine likely advisor for typing animation
        const lower = text.toLowerCase();
        let targetAdvisor = 'arthur';
        if (lower.startsWith('diego') || lower.startsWith('ítalo') || lower.includes('pesquisa') || lower.includes('cotação') || lower.includes('dólar')) {
            targetAdvisor = 'diego';
        } else if (lower.includes('gastei') || lower.includes('paguei') || lower.includes('recebi') || lower.includes('pix') || lower.includes('saldo') || lower.includes('orçamento') || lower.includes('devendo') || lower.includes('cliente') || lower.includes('fornecedor')) {
            targetAdvisor = 'bernardo';
        } else if (lower.includes('agenda') || lower.includes('marcar') || lower.includes('reunião') || lower.includes('dentista') || lower.includes('meet') || lower.includes('vaga') || lower.startsWith('clara')) {
            targetAdvisor = 'clara';
        } else if (lower.includes('tarefa') || lower.includes('projeto') || lower.includes('lista') || lower.includes('ideia') || lower.includes('pasta') || lower.startsWith('sara')) {
            targetAdvisor = 'sara';
        }

        this.showTyping(targetAdvisor);

        // Simulate natural response latency (400ms - 800ms)
        setTimeout(async () => {
            this.hideTyping();
            const replies = await this.aiEngine.processUserMessage(text);
            replies.forEach((reply, idx) => {
                setTimeout(() => {
                    this.store.addChatMessage({
                        id: 'm-reply-' + Date.now() + '-' + idx,
                        sender: 'advisor',
                        advisorKey: reply.advisorKey,
                        text: reply.text,
                        receipt: reply.receipt,
                        time: this.getCurrentTimeStr(),
                        checks: 'read'
                    });
                }, idx * 600);
            });
        }, 550);
    }

    simulateAudioMessage() {
        const sampleAudios = [
            'Almocei na Faria Lima e gastei 74 reais no cartão de crédito',
            'Sofi, marca reunião com a Ana Prado amanhã às 15 horas presencial',
            'Ítalo, pesquisa o preço médio do MacBook Pro M3 com fonte',
            'Lista de mercado: café em grãos, arroz e detergente',
            'Define um orçamento de 1500 por mês para alimentação'
        ];
        const audioText = sampleAudios[Math.floor(Math.random() * sampleAudios.length)];

        this.store.addChatMessage({
            id: 'm-audio-' + Date.now(),
            sender: 'user',
            isAudio: true,
            audioDuration: '0:06',
            audioTranscript: audioText,
            time: this.getCurrentTimeStr(),
            checks: 'read'
        });

        this.showTyping('arthur');
        setTimeout(async () => {
            this.hideTyping();
            const replies = await this.aiEngine.processUserMessage(audioText, { isAudio: true });
            replies.forEach(reply => {
                this.store.addChatMessage({
                    id: 'm-rep-audio-' + Date.now(),
                    sender: 'advisor',
                    advisorKey: reply.advisorKey,
                    text: reply.text,
                    receipt: reply.receipt,
                    time: this.getCurrentTimeStr(),
                    checks: 'read'
                });
            });
        }, 800);
    }

    simulateFileAttachment(file) {
        const fileName = file.name;
        this.store.addChatMessage({
            id: 'm-file-' + Date.now(),
            sender: 'user',
            text: `[Arquivo Enviado: ${fileName}] Guarda esse documento e confere o valor`,
            time: this.getCurrentTimeStr(),
            checks: 'read'
        });

        this.showTyping('rita');
        setTimeout(() => {
            this.hideTyping();
            this.store.addVaultFile({
                name: fileName,
                category: fileName.toLowerCase().includes('nfe') ? 'nota-fiscal' : 'comprovante',
                fileType: fileName.split('.').pop(),
                size: `${(file.size / 1024).toFixed(0)} KB`,
                ocrData: `Leitura OCR Rita: CNPJ e Código de Barras conferidos · Valor verificado · Guardado na pasta certa`
            });

            this.store.addChatMessage({
                id: 'm-rep-file-' + Date.now(),
                sender: 'advisor',
                advisorKey: 'rita',
                text: `Documento recebido! Fiz a leitura do arquivo "${fileName}", extraí os dados fiscais e a Luna já guardou na pasta correspondente no Meu Drive.`,
                receipt: {
                    title: 'Leitura OCR & Drive · Rita',
                    items: [
                        `Arquivo: ${fileName}`,
                        'Pasta: Notas Fiscais & Comprovantes',
                        'OCR: Dados tributários verificados',
                        'Status: Conciliado no painel'
                    ],
                    buttons: [
                        { action: 'edit', label: '✏️ Editar' },
                        { action: 'undo', label: '↩️ Desfazer' }
                    ]
                },
                time: this.getCurrentTimeStr(),
                checks: 'read'
            });
        }, 1000);
    }

    renderExecutionFeed() {
        if (!this.elements.liveExecutionFeed) return;
        const feed = this.store.state.executionFeed;
        this.elements.liveExecutionFeed.innerHTML = '';

        feed.slice(0, 5).forEach(item => {
            const advisor = this.store.state.advisors[item.advisor] || this.store.state.advisors.arthur || this.store.state.advisors.theo;
            const li = document.createElement('li');
            li.className = 'execution-feed-item';
            li.innerHTML = `
                <img src="${advisor.avatar}" alt="${advisor.name}" class="feed-item-avatar">
                <div class="feed-item-content">
                    <div class="feed-item-header">
                        <span class="feed-item-advisor" style="color: ${advisor.color}">${advisor.name}</span>
                        <span class="feed-item-time">${item.time}</span>
                    </div>
                    <div class="feed-item-title">${item.title}</div>
                    <div class="feed-item-sub">${item.sub}</div>
                </div>
            `;
            this.elements.liveExecutionFeed.appendChild(li);
        });
    }
}

// Global instance
window.whatsAppSimulator = new WhatsAppSimulator(window.appStore, window.aiEngine);
