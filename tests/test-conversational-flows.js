/**
 * TEST SUITE: CONVERSATIONAL FLOWS VALIDATION
 * Validação rigorosa dos fluxos conversacionais no WhatsApp, Groq, Gemini e SQLite.
 */

require('dotenv').config();
const path = require('path');
const fs = require('fs');
const assert = require('assert');

const whatsappService = require('../js/whatsapp-service');
const geminiService = require('../js/gemini-service');
const groqService = require('../js/groq-service');
const { DbService } = require('../js/db-service');

const TEST_DB_PATH = path.join(__dirname, 'test_kit.db');

async function runTests() {
    console.log('===============================================================');
    console.log('🧪 INICIANDO BATERIA DE TESTES DOS FLUXOS CONVERSACIONAIS');
    console.log('===============================================================');

    // 0. Limpeza prévia do banco de teste
    if (fs.existsSync(TEST_DB_PATH)) {
        try { fs.unlinkSync(TEST_DB_PATH); } catch (e) {}
    }

    const testDb = new DbService(TEST_DB_PATH);
    let passedCount = 0;
    let failedCount = 0;

    function test(name, fn) {
        try {
            fn();
            console.log(`✅ [PASSOU] ${name}`);
            passedCount++;
        } catch (err) {
            console.error(`❌ [FALHOU] ${name}:`, err.message);
            failedCount++;
        }
    }

    async function asyncTest(name, fn) {
        try {
            await fn();
            console.log(`✅ [PASSOU] ${name}`);
            passedCount++;
        } catch (err) {
            console.error(`❌ [FALHOU] ${name}:`, err.message);
            failedCount++;
        }
    }

    console.log('\n--- 1. TESTE DE MÉTODOS E MÓDULOS BÁSICOS ---');

    test('whatsappService.isReady() deve existir e retornar booleano', () => {
        assert(typeof whatsappService.isReady === 'function', 'isReady não é função');
        const ready = whatsappService.isReady();
        assert(typeof ready === 'boolean', 'isReady deve retornar booleano');
        assert.strictEqual(ready, false, 'Deveria ser false quando não conectado');
    });

    test('geminiService.isConfigured() deve estar configurado com chave válida', () => {
        assert.strictEqual(geminiService.isConfigured(), true, 'Gemini deve estar configurado no .env');
    });

    test('groqService.isConfigured() deve estar configurado com chave válida', () => {
        assert.strictEqual(groqService.isConfigured(), true, 'Groq deve estar configurado no .env');
    });

    console.log('\n--- 2. TESTES DE AÇÕES NO SQLITE (TRANSAÇÕES, CORREÇÕES, AGENDA, TAREFAS, CLIENTES) ---');

    const initialTxCount = testDb.sqlite.prepare('SELECT COUNT(*) as total FROM transactions').get().total;

    test('Criar transação de despesa via applyAction', () => {
        const action = {
            type: 'transaction',
            data: {
                id: 'tx-test-1',
                type: 'despesa',
                description: 'Almoço Executivo',
                amount: 60.0,
                category: 'Alimentação',
                profile: 'personal'
            }
        };
        const applied = testDb.applyAction(action);
        assert(applied, 'Lançamento não foi aplicado');
        assert.strictEqual(applied.amount, 60.0);

        const row = testDb.stmtGetTxById.get('tx-test-1');
        assert(row, 'Transação não encontrada no SQLite');
        assert.strictEqual(row.description, 'Almoço Executivo');

        const budget = testDb.sqlite.prepare('SELECT spent FROM budgets WHERE LOWER(category) = LOWER(?)').get('Alimentação');
        assert.strictEqual(budget.spent, 60.0, 'Orçamento não foi atualizado');
    });

    test('Corrigir valor da transação anterior via update_transaction (sem duplicar)', () => {
        const updateAction = {
            type: 'update_transaction',
            data: {
                amount: 45.0,
                description: 'Almoço Executivo (com desconto)'
            }
        };
        const updated = testDb.applyAction(updateAction);
        assert(updated, 'Atualização falhou');
        assert.strictEqual(updated.id, 'tx-test-1', 'ID deve ser o mesmo do anterior');
        assert.strictEqual(updated.amount, 45.0, 'Novo valor deve ser 45.0');

        // Verifica que o número total de transações continua SENDO initialTxCount + 1 (SEM DUPLICATA)
        const count = testDb.sqlite.prepare('SELECT COUNT(*) as total FROM transactions').get().total;
        assert.strictEqual(count, initialTxCount + 1, 'Houve duplicação indevida na correção!');

        // Verifica ajuste no orçamento (deve ser 45.0, e não 60 + 45)
        const budget = testDb.sqlite.prepare('SELECT spent FROM budgets WHERE LOWER(category) = LOWER(?)').get('Alimentação');
        assert.strictEqual(budget.spent, 45.0, 'Orçamento não foi reajustado corretamente após update');
    });

    test('Cancelar/Desfazer transação via delete_transaction', () => {
        const deleteAction = {
            type: 'delete_transaction'
        };
        const deleted = testDb.applyAction(deleteAction);
        assert(deleted, 'Exclusão falhou');
        assert.strictEqual(deleted.deleted, true);

        const count = testDb.sqlite.prepare('SELECT COUNT(*) as total FROM transactions').get().total;
        assert.strictEqual(count, initialTxCount, 'Transação deveria ter sido removida do SQLite');

        const budget = testDb.sqlite.prepare('SELECT spent FROM budgets WHERE LOWER(category) = LOWER(?)').get('Alimentação');
        assert.strictEqual(budget.spent, 0.0, 'Orçamento não foi zerado após exclusão');
    });

    test('Criar evento na agenda via applyAction', () => {
        const eventAction = {
            type: 'event',
            data: {
                title: 'Alinhamento Estratégico',
                date: '2026-10-25',
                startTime: '14:00',
                endTime: '15:00',
                hasMeet: true
            }
        };
        const applied = testDb.applyAction(eventAction);
        assert(applied && applied.id, 'Evento não foi criado');
        assert(applied.meetUrl && applied.meetUrl.includes('meet.google.com'), 'Link do Meet não foi gerado');

        const ev = testDb.sqlite.prepare('SELECT * FROM events WHERE id = ?').get(applied.id);
        assert(ev, 'Evento não encontrado no SQLite');
    });

    test('Criar tarefa via applyAction', () => {
        const taskAction = {
            type: 'task',
            data: {
                title: 'Enviar relatório mensal de métricas',
                priority: 'alta'
            }
        };
        const applied = testDb.applyAction(taskAction);
        assert(applied && applied.id, 'Tarefa não foi criada');
        assert.strictEqual(applied.priority, 'alta');

        const tk = testDb.sqlite.prepare('SELECT * FROM tasks WHERE id = ?').get(applied.id);
        assert(tk, 'Tarefa não encontrada no SQLite');
    });

    test('Cadastrar cliente via applyAction', () => {
        const clientAction = {
            type: 'create_client',
            data: {
                name: 'Drogaria Pacheco',
                type: 'cliente'
            }
        };
        const applied = testDb.applyAction(clientAction);
        assert(applied && applied.id, 'Cliente não foi cadastrado');

        const client = testDb.sqlite.prepare('SELECT * FROM clients WHERE name = ?').get('Drogaria Pacheco');
        assert(client, 'Cliente não salvo na tabela clients');
    });

    test('Validar e conectar membro via Código de Convite da Conta Compartilhada', () => {
        const activeCode = testDb.getActiveInviteCode();
        assert(activeCode && activeCode.startsWith('COD-CONVITE-'), 'Código de convite inválido');

        const regResult = testDb.validateAndRegisterTeamMember(activeCode, '+5585999998888', 'Bruna');
        assert.strictEqual(regResult.success, true, 'Falha ao validar código de convite');

        const members = testDb.getTeamMembers();
        const found = members.find(m => m.name === 'Bruna');
        assert(found, 'Membro não encontrado na lista de membros conectados');
    });

    console.log('\n--- 3. TESTES DO FALLBACK ROUTER (RESPOSTAS OFFLINE / RESILIENTES) ---');

    test('Fallback Router: Registro de despesa', () => {
        const res = whatsappService.fallbackRouter('Gastei 50 no posto de gasolina');
        assert(res.includes('*KIT*'), 'Não contém cabeçalho do KIT');
        assert(res.includes('R$ 50.00'), 'Não detectou valor 50');
        assert(res.includes('KIT_ACTION:{"type":"transaction"'), 'Não gerou KIT_ACTION de transação');
    });

    test('Fallback Router: Correção de valor', () => {
        const res = whatsappService.fallbackRouter('corrige o valor para 75 reais');
        assert(res.includes('Lançamento corrigido com sucesso'), 'Não detectou intenção de correção');
        assert(res.includes('KIT_ACTION:{"type":"update_transaction","data":{"amount":75}}'), 'Tag de correção errada');
    });

    test('Fallback Router: Desfazer / Cancelar', () => {
        const res = whatsappService.fallbackRouter('apaga a última despesa');
        assert(res.includes('Lançamento cancelado com sucesso'), 'Não detectou cancelamento');
        assert(res.includes('KIT_ACTION:{"type":"delete_transaction"}'), 'Tag de delete_transaction ausente');
    });

    test('Fallback Router: Cadastro de cliente', () => {
        const res = whatsappService.fallbackRouter('salva a Mecânica Silva como cliente');
        assert(res.includes('*Bernardo* · Gestor Financeiro'), 'Deveria rotear para Bernardo');
        assert(res.includes('Cliente cadastrado, Mecânica Silva'), 'Não confirmou cadastro');
        assert(res.includes('<!--KIT_ACTION:{"type":"create_client","data":{"name":"Mecânica Silva","type":"cliente"}}-->'), 'Tag incorreta');
    });

    console.log('\n--- 4. TESTES REAIS COM O MOTOR GEMINI PRO (NLP & CONTEXTO) ---');

    await asyncTest('Gemini Pro: Registro de despesa com contexto de assessores', async () => {
        const userMsg = 'Coloquei 100 reais de gasolina aditivada no Shell';
        const reply = await geminiService.generateAdvisorResponse(userMsg);
        console.log(`   🤖 Resposta Gemini: ${reply.split('\n')[0]} ...`);
        assert(reply.includes('100') || reply.includes('100,00'), 'Não mencionou o valor de 100');
        assert(reply.includes('KIT_ACTION'), 'Não gerou a tag KIT_ACTION oculta');
        assert(reply.includes('"type":"transaction"') || reply.includes('"transaction"'), 'Tag de transação ausente');
    });

    await asyncTest('Gemini Pro: Correção imediata sem duplicata (com memória de curto prazo)', async () => {
        const mockContext = {
            lastActionSummary: 'Última transação registrada: [DESPESA] R$ 100.00 - "gasolina aditivada no Shell" (Categoria: Transporte & Viagens) - ID: tx-shell-999',
            chatSummary: 'Usuário: "Coloquei 100 reais de gasolina aditivada no Shell"\nKIT: "Recibo gerado: R$ 100,00 no Shell."'
        };
        const userCorrection = 'KIT, errou o valor, na verdade foram 80 reais e não 100, corrige aí!';
        const reply = await geminiService.generateAdvisorResponse(userCorrection, mockContext);
        console.log(`   🤖 Resposta Gemini: ${reply.split('\n')[0]} ...`);

        // Deve conter a tag de UPDATE, e NÃO uma nova transação!
        assert(reply.includes('update_transaction'), 'O Gemini gerou transação nova em vez de update_transaction!');
        assert(!reply.includes('<!--KIT_ACTION:{"type":"transaction"'), 'Não deve emitir nova transação duplicada!');
    });

    await asyncTest('Gemini Pro: Cancelamento com delete_transaction', async () => {
        const mockContext = {
            lastActionSummary: 'Última transação registrada: [DESPESA] R$ 80.00 - "gasolina Shell" - ID: tx-shell-999',
            chatSummary: 'Usuário: "corrige para 80"\nKIT: "Valor ajustado para R$ 80,00."'
        };
        const userCancel = 'Cancela e apaga isso que eu passei no cartão corporativo da firma';
        const reply = await geminiService.generateAdvisorResponse(userCancel, mockContext);
        console.log(`   🤖 Resposta Gemini: ${reply.split('\n')[0]} ...`);
        assert(reply.includes('delete_transaction'), 'O Gemini deveria emitir delete_transaction!');
    });

    await asyncTest('Gemini Pro: Agendamento com Clara', async () => {
        const userMsg = 'Clara, marca reunião de diretoria amanhã às 16h com o Pedro';
        const reply = await geminiService.generateAdvisorResponse(userMsg);
        console.log(`   🤖 Resposta Gemini: ${reply.split('\n')[0]} ...`);
        assert(reply.includes('KIT_ACTION'), 'Deveria gerar KIT_ACTION');
        assert(reply.includes('"type":"event"') || reply.includes('event'), 'Deveria ser ação do tipo event');
    });

    await asyncTest('Gemini Pro: Cadastro de novo cliente', async () => {
        const userMsg = 'Salva a Construtora Alfa como cliente';
        const reply = await geminiService.generateAdvisorResponse(userMsg);
        console.log(`   🤖 Resposta Gemini: ${reply.split('\n')[0]} ...`);
        assert(reply.includes('KIT_ACTION'), 'Deveria gerar KIT_ACTION');
        assert(reply.includes('create_client'), 'Deveria ser ação create_client');
        assert(reply.includes('Construtora Alfa'), 'Deveria conter nome da construtora');
    });

    console.log('\n--- 5. TESTE DE TRANSCRIÇÃO REAL COM GROQ WHISPER (LPU) ---');

    await asyncTest('Groq Whisper: Transcrição de áudio em alta velocidade (< 1s)', async () => {
        // Gera buffer WAV válido de 1 segundo de silêncio (44.1kHz, 16-bit mono)
        const sampleRate = 44100;
        const numSamples = sampleRate;
        const wavBuffer = Buffer.alloc(44 + numSamples * 2);
        wavBuffer.write('RIFF', 0);
        wavBuffer.writeUInt32LE(36 + numSamples * 2, 4);
        wavBuffer.write('WAVE', 8);
        wavBuffer.write('fmt ', 12);
        wavBuffer.writeUInt32LE(16, 16);
        wavBuffer.writeUInt16LE(1, 20); // PCM
        wavBuffer.writeUInt16LE(1, 22); // Mono
        wavBuffer.writeUInt32LE(sampleRate, 24);
        wavBuffer.writeUInt32LE(sampleRate * 2, 28);
        wavBuffer.writeUInt16LE(2, 32);
        wavBuffer.writeUInt16LE(16, 34);
        wavBuffer.write('data', 36);
        wavBuffer.writeUInt32LE(numSamples * 2, 40);

        const result = await groqService.transcribeAudio(wavBuffer, 'audio/wav');
        console.log(`   ⚡ Transcrição Groq concluída em ${result.durationMs}ms: "${result.text}"`);
        assert(typeof result.durationMs === 'number', 'Duração deve ser um número');
        assert(result.durationMs < 3000, 'Transcrição demorou mais que 3s');
    });

    // Limpeza final do banco de teste
    try {
        testDb.sqlite.close();
        if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);
        const walPath = TEST_DB_PATH + '-wal';
        const shmPath = TEST_DB_PATH + '-shm';
        if (fs.existsSync(walPath)) fs.unlinkSync(walPath);
        if (fs.existsSync(shmPath)) fs.unlinkSync(shmPath);
    } catch (e) {}

    console.log('\n===============================================================');
    console.log(`🏁 RESULTADO FINAL: ${passedCount} PASSARAM | ${failedCount} FALHARAM`);
    console.log('===============================================================');

    if (failedCount > 0) {
        process.exit(1);
    }
}

runTests().catch(err => {
    console.error('Erro fatal nos testes:', err);
    process.exit(1);
});
