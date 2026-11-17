---
name: better-sqlite3
description: Padrões de banco de dados SQLite de alta performance usando better-sqlite3. Use para modelagem relacional, transações atômicas, prepared statements, WAL mode e consultas síncronas rápidas no Meu Assessor OS.
---

# Better-SQLite3 Database Patterns

Diretrizes de engenharia para o banco de dados principal do Meu Assessor OS (`data/kit.db`), utilizando `better-sqlite3`.

---

## ⚡ Configuração e Performance (WAL Mode)

1. **Pragmas Obrigatórios**:
   ```javascript
   this.sqlite = new Database(dbPath);
   this.sqlite.pragma('journal_mode = WAL');   // Write-Ahead Logging para concorrência
   this.sqlite.pragma('synchronous = NORMAL'); // Alta velocidade preservando durabilidade
   this.sqlite.pragma('foreign_keys = ON');    // Integridade referencial ativa
   ```

2. **Prepared Statements**:
   - Compile consultas repetitivas no início do serviço ou no construtor (`this.stmts = { ... }`).
   - Use `.run()` para mutations (`INSERT`, `UPDATE`, `DELETE`).
   - Use `.get()` para buscar um único registro (retorna objeto ou `undefined`).
   - Use `.all()` para buscar múltiplos registros (retorna array de objetos).

3. **Transações Atômicas**:
   - Sempre utilize `db.transaction(fn)` para operações multi-tabelas (ex.: criar lançamento financeiro + atualizar teto orçamentário + registrar notificação).
   ```javascript
   const insertTx = this.sqlite.transaction((txData, ceilingUpdate) => {
       this.stmts.insertTx.run(txData);
       this.stmts.updateCeiling.run(ceilingUpdate);
   });
   ```

4. **Tratamento de Datas e Tipos**:
   - Armazene timestamps em formato ISO 8601 UTC (`YYYY-MM-DDTHH:mm:ss.sssZ`) para consistência em buscas por período.
   - Valores monetários podem ser armazenados como `REAL` ou inteiros em centavos para evitar discrepâncias de arredondamento.
   - Arrays ou objetos estruturados (ex.: tags, metadados de Open Finance) devem ser serializados como strings JSON (`JSON.stringify` / `JSON.parse`).
