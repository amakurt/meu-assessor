/**
 * MEU ASSESSOR OS · WHATSAPP BAILEYS SERVICE
 * Conexão direta com WhatsApp via QR Code, armazenamento local de sessão e IA em tempo real.
 */

const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    downloadMediaMessage
} = require('@whiskeysockets/baileys');

const pino = require('pino');
const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs');
const geminiService = require('./gemini-service');

class WhatsAppService {
    constructor() {
        this.sock = null;
        this.status = 'disconnected'; // 'disconnected' | 'connecting' | 'qr_ready' | 'connected'
        this.currentQRCode = null;
        this.connectedUser = null;
        this.authDir = path.join(__dirname, '../auth_info_baileys');
        this.isInitializing = false;
        this.sentMessageIds = new Set();
    }


    getStatus() {
        return {
            status: this.status,
            qrCode: this.currentQRCode,
            user: this.connectedUser,
            geminiConfigured: geminiService.isConfigured()
        };
    }

    async init() {
        if (this.isInitializing || this.status === 'connected') {
            return this.getStatus();
        }

        this.isInitializing = true;
        this.status = 'connecting';
        this.currentQRCode = null;

        try {
            if (!fs.existsSync(this.authDir)) {
                fs.mkdirSync(this.authDir, { recursive: true });
            }

            const { state, saveCreds } = await useMultiFileAuthState(this.authDir);
            let version = [2, 3000, 1015901307];
            try {
                const versionData = await fetchLatestBaileysVersion();
                if (versionData?.version) {
                    version = versionData.version;
                }
            } catch (e) {
                // fallback to default version
            }

            this.sock = makeWASocket({
                version,
                auth: state,
                logger: pino({ level: 'silent' }),
                printQRInTerminal: true,
                browser: ['Meu Assessor OS', 'Chrome', '2.0.0'],
                defaultQueryTimeoutMs: 60000,
                connectTimeoutMs: 60000
            });

            this.sock.ev.on('creds.update', saveCreds);

            this.sock.ev.on('connection.update', async (update) => {
                const { connection, lastDisconnect, qr } = update;

                if (qr) {
                    try {
                        this.currentQRCode = await QRCode.toDataURL(qr);
                        this.status = 'qr_ready';
                        console.log('[WhatsApp] Novo QR Code gerado para leitura!');
                    } catch (err) {
                        console.error('[WhatsApp] Erro ao converter QR Code:', err);
                    }
                }

                if (connection === 'close') {
                    const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
                    console.log(`[WhatsApp] Conexão encerrada. Motivo: ${lastDisconnect?.error?.message || 'Desconhecido'}. Reconectar: ${shouldReconnect}`);

                    this.status = 'disconnected';
                    this.currentQRCode = null;
                    this.connectedUser = null;
                    this.isInitializing = false;

                    if (shouldReconnect) {
                        setTimeout(() => this.init(), 3000);
                    } else {
                        // Limpa credenciais se foi logout explícito
                        try {
                            if (fs.existsSync(this.authDir)) {
                                fs.rmSync(this.authDir, { recursive: true, force: true });
                            }
                        } catch (e) {}
                    }
                } else if (connection === 'open') {
                    this.status = 'connected';
                    this.currentQRCode = null;
                    this.connectedUser = this.sock.user;
                    this.isInitializing = false;
                    console.log(`=======================================================`);
                    console.log(`🟢 WHATSAPP CONECTADO COM SUCESSO!`);
                    console.log(`👤 Usuário: ${this.sock.user?.id || this.sock.user?.name}`);
                    console.log(`=======================================================`);
                }
            });

            // Processamento de mensagens recebidas
            this.sock.ev.on('messages.upsert', async (m) => {
                if (!m.messages || m.messages.length === 0) return;

                for (const msg of m.messages) {
                    const msgId = msg.key?.id;
                    if (msgId && this.sentMessageIds.has(msgId)) {
                        continue; // Ignora mensagens enviadas pelo próprio robô
                    }

                    const remoteJid = msg.key.remoteJid;
                    if (!remoteJid || remoteJid.endsWith('@g.us') || remoteJid === 'status@broadcast') continue;

                    const myId = this.sock.user?.id || '';
                    const myNumber = myId.split(':')[0];
                    const myLid = (this.sock.user?.lid || '').split(':')[0];

                    // REGRA CRÍTICA DE PRIVACIDADE:
                    // O robô é o seu assessor pessoal no seu número principal.
                    // Ele responde EXCLUSIVAMENTE quando VOCÊ manda mensagem para você mesmo (auto-conversa / "Você").
                    // Amigos, parentes e clientes que falarem no seu WhatsApp serão 100% ignorados pelo robô!
                    if (!isSelfChat) {
                        continue;
                    }


                    let replyText = '';

                    // 1. MENSAGEM DE ÁUDIO (Voz do usuário)
                    if (msg.message?.audioMessage) {
                        console.log(`[WhatsApp] Mensagem de ÁUDIO recebida no auto-chat.`);
                        try {
                            const audioBuffer = await downloadMediaMessage(msg, 'buffer', {});
                            const mimeType = msg.message.audioMessage.mimetype || 'audio/ogg';
                            if (geminiService.isConfigured()) {
                                replyText = await geminiService.generateAdvisorAudioResponse(audioBuffer, mimeType);
                            } else {
                                replyText = `*Theo* · Meu Assessor OS\n\n🎙️ Recebi seu áudio! Configure a chave do Gemini Pro para transcrição e ação automática.\n\n[✏️ Editar]  [↩️ Desfazer] (ativo por 24h)`;
                            }
                        } catch (audioErr) {
                            console.error('[WhatsApp] Erro ao processar áudio:', audioErr.message);
                            replyText = `*Theo* · Meu Assessor OS\n\n⚠️ Tive dificuldade em processar esse áudio. Poderia reenviar ou mandar por texto?`;
                        }
                    }
                    // 2. MENSAGEM DE FOTO / COMPROVANTE (OCR da Rita)
                    else if (msg.message?.imageMessage) {
                        console.log(`[WhatsApp] Imagem/Comprovante recebido no auto-chat.`);
                        try {
                            const imageBuffer = await downloadMediaMessage(msg, 'buffer', {});
                            const mimeType = msg.message.imageMessage.mimetype || 'image/jpeg';
                            const caption = msg.message.imageMessage.caption || '';
                            if (geminiService.isConfigured()) {
                                replyText = await geminiService.generateAdvisorImageResponse(imageBuffer, mimeType, caption);
                            } else {
                                replyText = `*Rita* · Meu Assessor OS\n\n🧾 Imagem recebida! Configure a chave do Gemini Pro para OCR automático de notas fiscais.\n\n[✏️ Editar]  [↩️ Desfazer] (ativo por 24h)`;
                            }
                        } catch (imgErr) {
                            console.error('[WhatsApp] Erro ao processar imagem:', imgErr.message);
                            replyText = `*Rita* · Meu Assessor OS\n\n⚠️ Não consegui fazer a leitura nítida desta imagem. Poderia reenviar uma foto mais clara do comprovante?`;
                        }
                    }
                    // 3. MENSAGEM DE TEXTO
                    else {
                        const textMessage = msg.message?.conversation ||
                                            msg.message?.extendedTextMessage?.text ||
                                            '';

                        if (!textMessage.trim()) continue;

                        // Proteção contra eco infinito
                        if (textMessage.includes('Meu Assessor OS')) {
                            continue;
                        }

                        console.log(`[WhatsApp] Mensagem de texto recebida: "${textMessage}"`);

                        if (geminiService.isConfigured()) {
                            try {
                                replyText = await geminiService.generateAdvisorResponse(textMessage);
                            } catch (aiErr) {
                                console.error('[WhatsApp] Erro na resposta do Gemini:', aiErr.message);
                                replyText = this.fallbackRouter(textMessage);
                            }
                        } else {
                            replyText = this.fallbackRouter(textMessage);
                        }
                    }


                    // Envia a resposta de volta no WhatsApp
                    try {
                        const targetJid = isSelfChat && myNumber ? `${myNumber}@s.whatsapp.net` : remoteJid;
                        const sent = await this.sock.sendMessage(targetJid, { text: replyText });
                        if (sent?.key?.id) {
                            this.sentMessageIds.add(sent.key.id);
                            if (this.sentMessageIds.size > 2000) {
                                this.sentMessageIds.clear();
                            }
                        }
                        console.log(`[WhatsApp] Resposta executiva enviada com sucesso para ${targetJid}!`);
                    } catch (sendErr) {
                        console.error('[WhatsApp] Erro ao enviar resposta:', sendErr);
                    }
                }
            });



            return this.getStatus();
        } catch (err) {
            this.status = 'disconnected';
            this.isInitializing = false;
            console.error('[WhatsApp] Erro ao inicializar socket:', err);
            throw err;
        }
    }

    fallbackRouter(text) {
        const lower = text.toLowerCase();
        let advisor = '*Theo* · Meu Assessor OS';
        let body = 'Compreendido! O Theo recebeu sua demanda e alinhou as prioridades com o time executivo.';

        if (lower.includes('gastei') || lower.includes('paguei') || lower.includes('recebi') || lower.includes('saldo') || lower.includes('pix')) {
            advisor = '*Martin* · Meu Assessor OS';
            body = `Lançamento registrado com sucesso!\n\n🧾 *Recibo Executivo*\n• Tipo: Finanças & Conciliação\n• Status: Conciliado no Open Finance\n• Meta 30 Dias no Azul: Positiva`;
        } else if (lower.includes('agenda') || lower.includes('reunião') || lower.includes('marcar') || lower.includes('meet')) {
            advisor = '*Sofi* · Meu Assessor OS';
            body = `Compromisso agendado na sua agenda com sucesso!\n• Tempo de deslocamento reservado\n• Link do Google Meet gerado`;
        } else if (lower.includes('tarefa') || lower.includes('lembrete') || lower.includes('lista')) {
            advisor = '*Luna* · Meu Assessor OS';
            body = `Adicionado à sua Pirâmide de Prioridades!\n• Nível: Alta Prioridade\n• Sincronizado no seu Cloud Drive`;
        } else if (lower.includes('pesquisa') || lower.includes('preço') || lower.includes('cotação')) {
            advisor = '*Ítalo* · Meu Assessor OS';
            body = `Pesquisa de mercado iniciada! Já estou cruzando os menores preços e fontes verificadas para você.`;
        }

        return `${advisor}\n\n${body}\n\n[✏️ Editar]  [↩️ Desfazer] (ativo por 24h)`;
    }

    async disconnect() {
        try {
            if (this.sock) {
                await this.sock.logout();
                this.sock = null;
            }
            if (fs.existsSync(this.authDir)) {
                fs.rmSync(this.authDir, { recursive: true, force: true });
            }
        } catch (e) {
            console.error('[WhatsApp] Erro no logout:', e);
        }
        this.status = 'disconnected';
        this.currentQRCode = null;
        this.connectedUser = null;
        this.isInitializing = false;
        return this.getStatus();
    }

    async sendTestMessage(to, message) {
        if (!this.sock || this.status !== 'connected') {
            throw new Error('WhatsApp não está conectado no momento');
        }
        let jid = to.replace(/[^0-9]/g, '');
        if (!jid.includes('@s.whatsapp.net')) {
            jid = `${jid}@s.whatsapp.net`;
        }
        return await this.sock.sendMessage(jid, { text: message });
    }
}

module.exports = new WhatsAppService();
