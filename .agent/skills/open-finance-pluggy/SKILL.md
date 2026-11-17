---
name: open-finance-pluggy
description: Integração de Open Finance via Pluggy API. Use ao trabalhar com sincronização bancária, agregação de contas, transações automáticas, conciliação e webhooks de conectores bancários.
---

# Open Finance Pluggy Integration

Diretrizes para integração de contas e extratos bancários via Pluggy no Meu Assessor OS.

---

## 🏦 Fluxo de Integração

1. **Autenticação**:
   - Obtenha o `apiKey` da Pluggy via variáveis de ambiente (`PLUGGY_CLIENT_ID` e `PLUGGY_CLIENT_SECRET`).
   - Gere o `connectToken` pelo backend para inicialização do Pluggy Connect Widget no frontend.

2. **Sincronização de Itens e Contas**:
   - Um **Item** representa a conexão com uma instituição financeira (ex.: Nubank, Itaú, Inter).
   - Para cada item, sincronize:
     - **Contas (`accounts`)**: saldo em tempo real, limite de crédito e tipo (corrente, poupança, investimento).
     - **Transações (`transactions`)**: histórico de lançamentos, descrição original, categoria e data de competência.

3. **Mapeamento e Conciliação**:
   - Converta transações bancárias da Pluggy para o formato nativo da tabela `transactions` do SQLite:
     - Lançamentos com valor negativo (`< 0`) são despesas (`type = 'despesa'`).
     - Lançamentos positivos (`> 0`) são receitas (`type = 'receita'`).
   - Aplique regras de categorização inteligente baseadas na descrição (ex.: Uber -> Transporte, iFood -> Alimentação).
   - Evite duplicidade registrando o `pluggyTransactionId` no banco local.
