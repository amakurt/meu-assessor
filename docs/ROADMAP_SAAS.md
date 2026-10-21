# 🗺️ Roadmap de Evolução Técnica: Transformando o KIT OS em SaaS Comercial

Este documento documenta os passos arquiteturais para escalar o **KIT OS** caso ele venha a ser comercializado como um SaaS (Software as a Service) com múltiplos clientes pagantes.

---

## 🏗️ 1. Camada de Banco de Dados: SQLite ➔ PostgreSQL 16 com Prisma ORM

### Por que migrar para SaaS?
- O **SQLite (WAL Mode)** atual é perfeito para 1 empresa, família e equipe com concorrência moderada.
- Quando centenas de empresas diferentes utilizam o sistema ao mesmo tempo, o SQLite possui uma fila de gravação (*single-writer lock*). O **PostgreSQL 16** suporta milhares de escritas simultâneas em paralelo com ACID e índices avançados JSONB.

### Como implementar:
1. **Modelagem com Prisma Schema (`prisma/schema.prisma`):**
   ```prisma
   model Tenant {
     id           String         @id @default(uuid())
     name         String
     cnpjCpf      String?
     plan         String         @default("pro")
     active       Boolean        @default(true)
     users        User[]
     transactions Transaction[]
     clients      Client[]
     createdAt    DateTime       @default(now())
   }
   ```
2. **Multi-tenancy:** Toda tabela conterá uma chave estrangeira `tenantId` com índices compostos (`@@index([tenantId, date])`), garantindo isolamento absoluto de dados entre empresas.

---

## 💎 2. Camada de Linguagem: JavaScript ➔ TypeScript Estrito

### Por que migrar?
- Evita erros de tipagem em regras financeiras complexas, cálculos de fluxo de caixa e respostas de IA.
- Contratos de API tipados entre o Frontend e o Backend.

### Passos de Execução:
1. Adicionar `tsconfig.json` e dependências:
   ```bash
   npm i -D typescript tsx @types/node @types/express
   ```
2. Criar diretório `src/` com tipagens explícitas:
   - `types/financial.ts`: Definições de transações, faturas, centros de custo.
   - `types/advisor.ts`: Tipos das 6 personas e das ações executivas (`KIT_ACTION`).

---

## 📱 3. Camada do WhatsApp: Multi-Sessão & Evolution API

### Cenário Atual:
- Conexão única direta via Baileys com QR Code para o número da sua empresa.

### Cenário SaaS:
- Cada empresa assinante terá seu próprio número ou subconta conectada.
- Utilizar a **Evolution API** (como no outro projeto) ou instâncias isoladas com Docker para gerenciar centenas de QR Codes de clientes em containers independentes.

---

## 💳 4. Faturamento Recorrente e Assinaturas (Stripe / Asaas)

- Webhook de cobrança automática:
  - Criação da conta ao confirmar pagamento via Pix ou Cartão.
  - Bloqueio automático de acesso e suspensão de bot caso a assinatura esteja inadimplente.

---

## 🔒 5. Segurança & HTTPS (Status Atual)

- **Nginx Proxy Reverso:** Já instalado e ativo na porta 80 e 443 da Oracle VM.
- **Certificado Let's Encrypt:** Já gerado e validado internamente para `137.131.160.171.nip.io`.
- **Passo Pendente de Rede na Oracle Cloud:**
  - Liberar a porta **443 (TCP)** nas *Ingress Rules* da *Security List* da VCN na console web da Oracle Cloud.
