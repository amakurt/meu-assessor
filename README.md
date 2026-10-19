# Meu Assessor OS · Plataforma de Assessoria com IA no WhatsApp

Plataforma completa de assessoria pessoal e executiva por Inteligência Artificial integrada ao WhatsApp, com painel web executivo para controle total de finanças, agenda, tarefas, projetos, cofre de documentos e equipe.

---

## 🚀 Como Iniciar o Projeto

1. Abra o terminal na pasta do projeto:
   ```bash
   cd /Users/amauri/meu-assessor
   ```

2. Instale as dependências (caso necessário):
   ```bash
   npm install
   ```

3. Inicie o servidor:
   ```bash
   npm start
   ```

4. Acesse no navegador:
   👉 **[http://localhost:3000](http://localhost:3000)**

---

## 👥 A Equipe de Assessores Conectada

* **Theo** (Diretor de Operações / Geral): Orquestrador central, briefings executivos e envio de lembretes pontuais e recorrentes.
* **Martin** (Gerente Financeiro): Gestão de receitas, despesas, contas a pagar/receber e integração com Open Finance Brasil (Itaú, Nubank, Inter, Bradesco, XP, etc.).
* **Sofi** (Secretária Executiva): Gestão de agenda diária/semanal sincronizada com Google Agenda, estimativa de rotas e prevenção de atrasos.
* **Luna** (Organização & Tarefas): Quadro Kanban com 4 colunas dinâmicas (*A Fazer*, *Em Andamento*, *Aguardando Terceiros*, *Concluído*).
* **Ítalo** (Pesquisas & Comparações): Inteligência de mercado e cotações.
* **Rita** (Assistente Fiscal): Emissão de notas fiscais, conferência de tributos e leitura de comprovantes por OCR.

---

## ⚡ Integração com WhatsApp (Meta Cloud API / Evolution API)

* **Webhook Endpoint:** `http://localhost:3000/api/whatsapp/webhook`
* **Métodos Suportados:**
  * `GET` (Verificação do token de webhook pela Meta)
  * `POST` (Recebimento de mensagens, áudios e comprovantes em tempo real)
* **Token padrão:** `meu_assessor_secret_token_live_2026`

---

## 📁 Estrutura do Código

```
/Users/amauri/meu-assessor
├── index.html                   # Interface principal da plataforma executiva
├── server.js                    # Servidor Express com REST API e Webhooks do WhatsApp
├── package.json                 # Dependências e scripts
├── styles/
│   └── main.css                 # Design System Dark Mode Glassmorphism & Responsivo
├── js/
│   ├── app.js                   # Controlador geral da aplicação
│   ├── store.js                 # Gerenciamento de estado reativo & persistência local
│   ├── ai-engine.js             # Motor NLP de roteamento de comandos em português
│   ├── whatsapp-simulator.js    # Simulador interativo do WhatsApp
│   └── modules/
│       ├── finances.js          # Módulo Financeiro & Open Finance (Martin)
│       ├── agenda.js            # Módulo Agenda & Google Calendar (Sofi)
│       ├── tasks.js             # Módulo Kanban de Tarefas (Luna)
│       ├── vault.js             # Cofre de Documentos & OCR (Rita)
│       ├── reminders.js         # Lembretes Ilimitados (Theo)
│       └── team.js              # Usuários & Equipe Ilimitada
└── images/                      # Avatares em alta definição, logos e vetores de bancos
```
