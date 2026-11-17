---
name: baileys-whatsapp
description: Padrões de desenvolvimento e melhores práticas para automação de WhatsApp com @whiskeysockets/baileys. Use ao trabalhar com conexão de socket, QR Code, eventos de mensagens, recibos interativos, áudio e reconexões.
---

# Baileys WhatsApp Service Patterns

Este módulo define as diretrizes de desenvolvimento para o serviço WhatsApp do Meu Assessor OS / KIT OS, utilizando `@whiskeysockets/baileys`.

---

## 🏗️ Princípios de Arquitetura

1. **Ciclo de Conexão Resiliente**:
   - Utilize `useMultiFileAuthState(authDir)` para persistência descentralizada de credenciais.
   - Trate `connection.update`:
     - `update.qr`: Gere o QR Code com `qrcode.toDataURL(qr)` e emita para o painel web/SSE.
     - `connection === 'close'`: Verifique `lastDisconnect?.error?.output?.statusCode`. Reconecte automaticamente para status transitórios (ex.: `DisconnectReason.restartRequired` ou rede). Se `loggedOut`, limpe o diretório de autenticação antes de tentar novo pareamento.
     - `connection === 'open'`: Armazene o usuário conectado (`sock.user`) e configure status como `connected`.

2. **Deduplicação e Janela de Interação**:
   - Mantenha um cache ou Set (`sentMessageIds`) para evitar respostas duplicadas causadas por retransmissões do protocolo.
   - Respeite a janela interativa de 24 horas: botões de ação (`[✏️ Editar]`, `[↩️ Desfazer]`) operam com recibos idempotentes vinculados ao ID do lançamento no SQLite.

3. **Processamento de Áudio e Mídia**:
   - Mensagens de voz (`audioMessage` / PTT): use `downloadMediaMessage` para buffer em memória ou arquivo temporário.
   - Envie para o serviço de transcrição (Groq Whisper / Gemini Multimodal) e repasse o texto transcrito para o fluxo de IA correspondente.

4. **Boas Práticas e Anti-Ban**:
   - Simule presença humana com `sendPresenceUpdate('composing', jid)` antes de disparar respostas.
   - Utilize delays naturais (300ms a 1200ms) entre mensagens sequenciais.
   - Nunca faça broadcasts em massa sem intervalo; o Meu Assessor opera como assistente executivo 1:1.
