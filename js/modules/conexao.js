/**
 * MEU ASSESSOR OS · MÓDULO DE CONEXÃO WHATSAPP & GEMINI PRO
 * Controla o pareamento via QR Code (Baileys), status em tempo real e chave do Gemini.
 */

(function () {
    let pollInterval = null;

    function initConexaoModule() {
        const btnConnect = document.getElementById('btnConnectWa');
        const btnDisconnect = document.getElementById('btnDisconnectWa');
        const btnSendTest = document.getElementById('btnSendTestWa');
        const btnSaveGemini = document.getElementById('btnSaveGeminiKey');
        const waStatusCard = document.getElementById('whatsappStatusCard');
        const waConnectedNumber = document.getElementById('waConnectedNumber');

        if (btnConnect) {
            btnConnect.addEventListener('click', async () => {
                btnConnect.disabled = true;
                btnConnect.innerHTML = '<span>⏳ Inicializando...</span>';
                try {
                    const res = await fetch('/api/whatsapp/connect', { method: 'POST' });
                    const data = await res.json();
                    updateStatusUI(data);
                } catch (e) {
                    console.error('Erro ao conectar WhatsApp:', e);
                    alert('Erro ao iniciar conexão com WhatsApp');
                } finally {
                    btnConnect.disabled = false;
                    btnConnect.innerHTML = '<span>⚡ Gerar Novo QR Code</span>';
                }
            });
        }

        if (btnDisconnect) {
            btnDisconnect.addEventListener('click', async () => {
                if (!confirm('Deseja realmente desconectar o WhatsApp? Será necessário ler o QR Code novamente para reconectar.')) return;
                try {
                    const res = await fetch('/api/whatsapp/disconnect', { method: 'POST' });
                    const data = await res.json();
                    updateStatusUI(data);
                } catch (e) {
                    console.error('Erro ao desconectar:', e);
                }
            });
        }

        if (btnSendTest) {
            btnSendTest.addEventListener('click', async () => {
                const phoneInput = document.getElementById('testWaPhone');
                const msgInput = document.getElementById('testWaMessage');
                const phone = phoneInput?.value?.trim();
                const message = msgInput?.value?.trim();

                if (!phone || !message) {
                    alert('Informe o telefone com DDD (ex: 11987654321) e a mensagem.');
                    return;
                }

                btnSendTest.disabled = true;
                btnSendTest.textContent = 'Enviando...';
                try {
                    const res = await fetch('/api/whatsapp/test', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ phone, message })
                    });
                    const data = await res.json();
                    if (data.success) {
                        alert('✅ Mensagem enviada com sucesso no WhatsApp!');
                    } else {
                        alert('Erro ao enviar: ' + (data.error || 'Falha no envio'));
                    }
                } catch (e) {
                    alert('Erro na requisição: ' + e.message);
                } finally {
                    btnSendTest.disabled = false;
                    btnSendTest.textContent = 'Enviar Mensagem de Teste';
                }
            });
        }

        if (btnSaveGemini) {
            btnSaveGemini.addEventListener('click', async () => {
                const keyInput = document.getElementById('geminiApiKeyInput');
                const apiKey = keyInput?.value?.trim();
                if (!apiKey) {
                    alert('Informe uma chave válida do Google Gemini.');
                    return;
                }

                btnSaveGemini.disabled = true;
                btnSaveGemini.textContent = 'Salvando...';
                try {
                    const res = await fetch('/api/config/gemini', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ apiKey })
                    });
                    const data = await res.json();
                    if (data.success) {
                        alert('✅ Chave do Google Gemini Pro salva e ativada com sucesso!');
                        fetchStatus();
                    }
                } catch (e) {
                    alert('Erro ao salvar chave: ' + e.message);
                } finally {
                    btnSaveGemini.disabled = false;
                    btnSaveGemini.textContent = 'Salvar Chave Gemini';
                }
            });
        }

        // Inicia polling de status
        fetchStatus();
        if (!pollInterval) {
            pollInterval = setInterval(fetchStatus, 3000);
        }
    }

    async function fetchStatus() {
        try {
            const res = await fetch('/api/whatsapp/status');
            if (res.ok) {
                const data = await res.json();
                updateStatusUI(data);
            }
        } catch (e) {
            // Silencioso se servidor offline
        }
    }

    function updateStatusUI(data) {
        const badge = document.getElementById('waLiveStatusBadge');
        const qrImage = document.getElementById('waQrImage');
        const qrPlaceholder = document.getElementById('waQrPlaceholder');
        const statusMsg = document.getElementById('waStatusMessage');
        const btnConnect = document.getElementById('btnConnectWa');
        const btnDisconnect = document.getElementById('btnDisconnectWa');
        const connectedBox = document.getElementById('waConnectedBox');
        const connectedNumberDisplay = document.getElementById('waConnectedNumberDisplay');
        const waConnectedNumberSidebar = document.getElementById('waConnectedNumber');
        const geminiBadge = document.getElementById('geminiStatusBadge');

        // Gemini Status
        if (geminiBadge) {
            if (data.geminiConfigured) {
                geminiBadge.className = 'connection-status-pill pill-success';
                geminiBadge.innerHTML = '<span class="pulse-dot"></span><span>Google Gemini Pro/Flash Ativo (3.5)</span>';
            } else {
                geminiBadge.className = 'connection-status-pill pill-warning';
                geminiBadge.innerHTML = '<span>⚠️ Chave Gemini Não Configurada</span>';
            }
        }

        // WhatsApp Status
        if (data.status === 'connected') {
            if (badge) {
                badge.className = 'connection-status-pill pill-success';
                badge.innerHTML = '<span class="pulse-dot"></span><span>Conectado e Operando 24/7</span>';
            }
            if (qrImage) qrImage.style.display = 'none';
            if (qrPlaceholder) qrPlaceholder.style.display = 'none';
            if (statusMsg) statusMsg.textContent = 'WhatsApp conectado! Os assessores estão prontos para receber mensagens.';
            if (btnConnect) btnConnect.style.display = 'none';
            if (btnDisconnect) btnDisconnect.style.display = 'inline-block';
            if (connectedBox) connectedBox.style.display = 'block';

            const userNumber = data.user?.id ? data.user.id.split(':')[0] : 'Conectado';
            if (connectedNumberDisplay) connectedNumberDisplay.textContent = `+${userNumber}`;
            if (waConnectedNumberSidebar) waConnectedNumberSidebar.textContent = `+${userNumber}`;
        } else if (data.status === 'qr_ready' && data.qrCode) {
            if (badge) {
                badge.className = 'connection-status-pill pill-warning';
                badge.innerHTML = '<span class="pulse-dot pulse-warning"></span><span>Aguardando Leitura do QR Code</span>';
            }
            if (qrImage) {
                qrImage.src = data.qrCode;
                qrImage.style.display = 'block';
            }
            if (qrPlaceholder) qrPlaceholder.style.display = 'none';
            if (statusMsg) statusMsg.textContent = 'Abra o WhatsApp no seu celular ➔ Aparelhos Conectados ➔ Conectar Aparelho e aponte para o código abaixo:';
            if (btnConnect) {
                btnConnect.style.display = 'inline-block';
                btnConnect.innerHTML = '<span>🔄 Atualizar QR Code</span>';
            }
            if (btnDisconnect) btnDisconnect.style.display = 'none';
            if (connectedBox) connectedBox.style.display = 'none';
            if (waConnectedNumberSidebar) waConnectedNumberSidebar.textContent = 'Aguardando QR Code';
        } else if (data.status === 'connecting') {
            if (badge) {
                badge.className = 'connection-status-pill pill-warning';
                badge.innerHTML = '<span class="pulse-dot pulse-warning"></span><span>Iniciando WhatsApp Engine...</span>';
            }
            if (statusMsg) statusMsg.textContent = 'Gerando chaves de segurança e QR Code...';
            if (btnConnect) btnConnect.style.display = 'none';
            if (btnDisconnect) btnDisconnect.style.display = 'none';
        } else {
            // disconnected
            if (badge) {
                badge.className = 'connection-status-pill pill-danger';
                badge.innerHTML = '<span>🔴 Desconectado</span>';
            }
            if (qrImage) qrImage.style.display = 'none';
            if (qrPlaceholder) qrPlaceholder.style.display = 'flex';
            if (statusMsg) statusMsg.textContent = 'Clique no botão abaixo para gerar o QR Code e conectar o seu número.';
            if (btnConnect) {
                btnConnect.style.display = 'inline-block';
                btnConnect.innerHTML = '<span>⚡ Conectar WhatsApp (Gerar QR Code)</span>';
            }
            if (btnDisconnect) btnDisconnect.style.display = 'none';
            if (connectedBox) connectedBox.style.display = 'none';
            if (waConnectedNumberSidebar) waConnectedNumberSidebar.textContent = 'Desconectado';
        }
    }

    document.addEventListener('DOMContentLoaded', initConexaoModule);
})();
