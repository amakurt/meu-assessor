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
const googleCalendarService = require('../js/google-calendar-service');
const dbService = require('../js/db-service');
const { DbService } = dbService;
const cronService = require('../js/cron-service');

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

    test('googleCalendarService.getStatus() deve retornar formato padronizado', () => {
        const status = googleCalendarService.getStatus();
        assert(typeof status === 'object', 'Status deve ser um objeto');
        assert('configured' in status, 'Campo configured ausente');
        assert('connected' in status, 'Campo connected ausente');
    });

    test('googleCalendarService.getAuthUrl() deve validar credenciais', () => {
        if (!googleCalendarService.isConfigured()) {
            assert.throws(() => {
                googleCalendarService.getAuthUrl('http://localhost:3000/callback');
            }, /não configuradas/);
        } else {
            const url = googleCalendarService.getAuthUrl('http://localhost:3000/callback');
            assert(url.includes('accounts.google.com'), 'URL de auth inválida');
        }
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

    test('Conciliação Inteligente: Lançamento do WhatsApp conciliado com Open Finance sem duplicar', () => {
        // 1. Usuário envia no WhatsApp: Gastei 50 no Cartão C6
        const manualTx = testDb.applyAction({
            type: 'transaction',
            data: {
                id: 'tx-manual-whatsapp-50',
                type: 'despesa',
                description: 'Gasolina no Cartão C6',
                amount: 50.0,
                category: 'Transporte & Viagens',
                profile: 'personal',
                date: '2026-10-22',
                pluggyId: null,
                account: 'C6 Bank'
            }
        });
        assert(manualTx, 'Falha ao criar transação manual');
        const countBefore = testDb.sqlite.prepare('SELECT COUNT(*) as total FROM transactions').get().total;

        // 2. Open Finance sincroniza posteriormente com o ID oficial do banco
        const reconciled = testDb.reconcileTransaction(manualTx.id, {
            id: 'pluggy-tx-c6-999',
            account: 'BANDEIRADO (Cartão C6)'
        });
        assert(reconciled, 'Falha ao reconciliar');
        assert.strictEqual(reconciled.pluggyId, 'pluggy-tx-c6-999', 'pluggyId deve ter sido associado');
        assert.strictEqual(reconciled.status, 'conciliado', 'Status deve ser conciliado');

        // 3. Garante que NÃO houve aumento de transações (Zero Duplicação)
        const countAfter = testDb.sqlite.prepare('SELECT COUNT(*) as total FROM transactions').get().total;
        assert.strictEqual(countAfter, countBefore, 'Houve duplicação indevida na conciliação!');

        // Limpa a transação de teste
        testDb.sqlite.prepare('DELETE FROM transactions WHERE id = ?').run(manualTx.id);
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

        // Teste de vinculação com Google Event ID
        testDb.updateEventGoogleId(applied.id, 'g-event-test-456', 'https://meet.google.com/real-meet-link');
        const foundByGoogle = testDb.findEventByGoogleId('g-event-test-456');
        assert(foundByGoogle, 'Evento não localizado pelo googleEventId');
        assert.strictEqual(foundByGoogle.meetUrl, 'https://meet.google.com/real-meet-link');
    });

    test('Corrigir horário do evento via update_event (sem duplicar)', () => {
        const updateAction = {
            type: 'update_event',
            data: {
                startTime: '16:00',
                endTime: '17:00'
            }
        };
        const updated = testDb.applyAction(updateAction);
        assert(updated && updated.startTime === '16:00', 'Horário não foi atualizado');

        const eventsCount = testDb.sqlite.prepare('SELECT count(*) as count FROM events').get().count;
        assert.strictEqual(eventsCount, 1, 'Não deveria ter duplicado o evento ao corrigir');
    });

    test('Deduplicação de agendamento: nova ação event recebida logo após atualiza evento recente', () => {
        const reEventAction = {
            type: 'event',
            data: {
                title: 'Alinhamento Estratégico',
                startTime: '17:30'
            }
        };
        const updated = testDb.applyAction(reEventAction);
        assert(updated && updated.startTime === '17:30', 'Horário não foi ajustado via deduplicação');

        const eventsCount = testDb.sqlite.prepare('SELECT count(*) as count FROM events').get().count;
        assert.strictEqual(eventsCount, 1, 'Deduplicação falhou: gerou dois agendamentos no banco');
    });

    test('Cancelar/Desmarcar evento via delete_event', () => {
        const deleteAction = { type: 'delete_event' };
        const deleted = testDb.applyAction(deleteAction);
        assert(deleted && deleted.deleted, 'Evento não foi marcado como excluído');

        const eventsCount = testDb.sqlite.prepare('SELECT count(*) as count FROM events').get().count;
        assert.strictEqual(eventsCount, 0, 'Evento não foi removido do SQLite');
    });

    test('Salvar, recuperar e remover credenciais OAuth2 do Google no SQLite', () => {
        testDb.saveGoogleAuth({
            accessToken: 'mock-access-token-123',
            refreshToken: 'mock-refresh-token-456',
            expiresAt: Date.now() + 3600000,
            userEmail: 'teste@gmail.com',
            scope: 'calendar.events'
        });

        const auth = testDb.getGoogleAuth();
        assert(auth, 'Auth do Google não foi salva');
        assert.strictEqual(auth.userEmail, 'teste@gmail.com');
        assert.strictEqual(auth.accessToken, 'mock-access-token-123');

        testDb.deleteGoogleAuth();
        const deletedAuth = testDb.getGoogleAuth();
        assert.strictEqual(deletedAuth, undefined, 'Auth do Google deveria ter sido removida');
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

    test('Fallback Router: Correção de horário de reunião (Clara)', () => {
        const origLastAction = dbService.lastAction;
        dbService.lastAction = {
            type: 'event',
            item: { id: 'ev-test-fallback', title: 'Reunião com Arquiteto', startTime: '14:00' },
            timestamp: Date.now()
        };

        const res = whatsappService.fallbackRouter('corrige o horário para as 16h');
        assert(res.includes('*Clara* · Secretária Executiva'), 'Deveria rotear para Clara');
        assert(res.includes('Compromisso reagendado com sucesso'), 'Não detectou intenção de reagendamento');
        assert(res.includes('update_event'), 'Deveria gerar KIT_ACTION do tipo update_event');
        assert(res.includes('16:00'), 'Não ajustou para 16:00');

        dbService.lastAction = origLastAction;
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

    await asyncTest('Gemini Pro: Reagendamento / Correção de horário com Clara (sem duplicar)', async () => {
        const mockContext = {
            lastActionSummary: 'Último compromisso agendado: "Reunião de Diretoria" em 2026-10-25 às 16:00 - ID: ev-test-123',
            chatSummary: 'Usuário: "Clara, marca reunião de diretoria amanhã às 16h com o Pedro"\nClara: "Compromisso agendado para às 16:00."'
        };
        const userMsg = 'Clara, na verdade corrige o horário para as 17h';
        const reply = await geminiService.generateAdvisorResponse(userMsg, mockContext);
        console.log(`   🤖 Resposta Gemini: ${reply.split('\n')[0]} ...`);
        assert(reply.includes('update_event'), 'O Gemini gerou evento novo em vez de update_event!');
        assert(!reply.includes('<!--KIT_ACTION:{"type":"event"'), 'Não deve emitir novo evento duplicado!');
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

    console.log('\n--- 6. TESTES DAS 5 NOVAS FUNÇÕES EXECUTIVAS REFINADAS ---');

    test('1. Briefing Automático: Geração de texto matinal e noturno via Arthur & Clara', () => {
        const morningText = cronService.generateBriefingText('morning');
        assert(morningText.includes('Arthur'), 'Briefing matinal deve ser assinado por Arthur');
        assert(morningText.includes('Briefing Matinal'), 'Deve conter título de Briefing Matinal');
        assert(morningText.includes('Clara') || morningText.includes('Agenda'), 'Deve conter seção de agenda');

        const eveningText = cronService.generateBriefingText('evening');
        assert(eveningText.includes('Arthur'), 'Briefing noturno deve ser assinado por Arthur');
        assert(eveningText.includes('Fechamento do Dia'), 'Deve conter título de Fechamento do Dia');
        assert(eveningText.includes('Bernardo') || eveningText.includes('Balanço'), 'Deve conter balanço financeiro');
    });

    test('2. Multi-Intenção: _extractAndApplyAction executando múltiplas tags de ação na mesma resposta', () => {
        const u = Date.now();
        const txId = 'tx-multi-' + u;
        const evId = 'ev-multi-' + u;
        const multiTagResponse = `*KIT* · Seu Assessor Pessoal\n\nPronto! Lancei seu almoço e agendei a reunião.\n\n<!--KIT_ACTION:{"type":"transaction","data":{"id":"${txId}","type":"despesa","description":"Almoço Rápido","amount":42.50,"category":"Alimentação"}}-->\n<!--KIT_ACTION:{"type":"event","data":{"id":"${evId}","title":"Reunião Multi ${u}","date":"2026-10-24","startTime":"15:00","endTime":"16:00"}}-->`;

        const cleaned = whatsappService._extractAndApplyAction(multiTagResponse);
        assert(!cleaned.includes('<!--KIT_ACTION'), 'Tags ocultas devem ser removidas da resposta visível');
        assert(cleaned.includes('Pronto! Lancei seu almoço'), 'Mensagem limpa deve ser preservada');

        const allData = dbService.getAll();
        const txFound = (allData.transactions || []).find(t => t.id === txId);
        assert(txFound, 'Transação multi-tag deve ter sido salva no SQLite');
        assert.strictEqual(txFound.amount, 42.5);

        const evFound = (allData.events || []).find(e => e.id === evId);
        assert(evFound, 'Evento multi-tag deve ter sido salvo no SQLite');
        assert.strictEqual(evFound.title, `Reunião Multi ${u}`);
    });

    test('3. 1-Click Liquidação: dbService.settleDebt dá baixa e lança receita correspondente no caixa', () => {
        const u = Date.now();
        const debtId = 'debt-test-liq-' + u;
        // Cria dívida pendente
        dbService.applyAction({
            type: 'create_debt',
            data: {
                id: debtId,
                name: 'Dr. Roberto',
                amount: 450.0,
                reason: 'Honorários de Consultoria',
                status: 'pendente'
            }
        });

        // 1-Click Liquidação
        const result = dbService.settleDebt(debtId, 'Pix');
        assert(result, 'Liquidação deve retornar resultado');
        assert.strictEqual(result.status, 'pago');

        // Verifica que dívida está paga no SQLite
        const debtInDb = dbService.sqlite.prepare('SELECT * FROM debts WHERE id = ?').get(debtId);
        assert.strictEqual(debtInDb.status, 'pago');

        // Verifica que a receita foi lançada no fluxo de caixa
        const revenueTx = dbService.sqlite.prepare(`SELECT * FROM transactions WHERE id = 'tx-settle-${debtId}-${result.settledAt}'`).get()
            || dbService.sqlite.prepare("SELECT * FROM transactions WHERE description LIKE '%Liquidação de Cobrança: Dr. Roberto%' ORDER BY createdAt DESC").get();
        assert(revenueTx, 'Receita correspondente deve ter sido lançada automaticamente no caixa');
        assert.strictEqual(revenueTx.amount, 450.0);
        assert.strictEqual(revenueTx.type, 'receita');
    });

    test('4. Gerador de Mensagem de Cobrança com Chave Pix (Bernardo)', () => {
        const u = Date.now();
        const debtId = 'debt-test-pix-' + u;
        dbService.applyAction({
            type: 'create_debt',
            data: {
                id: debtId,
                name: 'Camila Torres',
                amount: 280.0,
                reason: 'Projeto de Design',
                pixKey: 'pix.camila@meuassessor.com'
            }
        });

        const msg = dbService.generateDebtMessage(debtId);
        assert(msg.includes('Bernardo'), 'Mensagem deve ser do Bernardo');
        assert(msg.includes('Camila Torres'), 'Deve conter nome do devedor');
        assert(msg.includes('280,00'), 'Deve conter valor formatado');
        assert(msg.includes('pix.camila@meuassessor.com') || msg.includes('Chave Pix'), 'Deve conter Chave Pix');
    });

    test('5. OCR & Fallback Router: Linha digitável de Boleto reconhecida pela Elisa', () => {
        const boletoLine = '34191.79001 01043.510047 91020.150008 8 9100000018450';
        const reply = whatsappService.fallbackRouter(`Segue o boleto para pagar: ${boletoLine}`);
        assert(reply.includes('Elisa'), 'Elisa deve processar o boleto');
        assert(reply.includes('Boleto Bancário Identificado'), 'Deve acusar identificação do boleto');
        assert(reply.includes('Contas & Boletos'), 'Deve conter tag de despesa em Contas & Boletos');
    });

    test('6. Fallback Router: Liquidação de cobrança via texto conversacional', () => {
        const reply = whatsappService.fallbackRouter('o Dr. Roberto pagou a cobrança de 450 reais');
        assert(reply.includes('Bernardo'), 'Bernardo deve responder');
        assert(reply.includes('Baixa de cobrança confirmada'), 'Deve confirmar a baixa');
        assert(reply.includes('settle_debt'), 'Deve conter ação settle_debt');
    });

    test('7. Auto-Healing de Datas: _normalizeDate corrige anos passados, termos relativos e formato brasileiro', () => {
        const currentYear = new Date().getFullYear();
        // Ano no passado deve ser trazido para o ano atual
        const fixedPastYear = testDb._normalizeDate('2025-10-25');
        assert.strictEqual(fixedPastYear, `${currentYear}-10-25`, 'Ano de 2025 deve ser corrigido para o ano atual');

        // Formato com barra (DD/MM/YYYY)
        const fixedSlash = testDb._normalizeDate('25/10/2026');
        assert.strictEqual(fixedSlash, '2026-10-25', 'Formato DD/MM/YYYY deve virar YYYY-MM-DD');

        // Termo relativo 'amanhã'
        const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const fixedTomorrow = testDb._normalizeDate('amanhã');
        assert.strictEqual(fixedTomorrow, tomorrow, 'Amanhã deve calcular a data de amanhã corretamente');
    });

    test('8. Fallback Router: Agendamento com Clara extrai data amanhã, horário 16h e título limpo', () => {
        const reply = whatsappService.fallbackRouter('Agenda uma reunião para mim amanhã às 16 horas com a cliente Sara.');
        assert(reply.includes('Clara'), 'Clara deve ser a assessora responsável');
        assert(reply.includes('16:00'), 'Deve conter horário inicial 16:00');
        assert(reply.includes('17:00'), 'Deve conter horário final 17:00');
        assert(reply.includes('Reunião com a cliente Sara'), 'Título deve ser limpo e contextualizado');
        assert(reply.includes('"hasMeet":true'), 'Deve conter Google Meet');
        assert(reply.includes('<!--KIT_ACTION:{"type":"event"'), 'Deve emitir ação do tipo event');
    });

    console.log('\n--- 7. TESTES DE NOTIFICAÇÕES PUSH MOBILE (W3C PUSH API) ---');

    test('1. PushService: Inicialização, VAPID Keys e status', () => {
        const pushService = require('../js/push-service');
        pushService.init();
        const status = pushService.getStatus();
        assert(status.hasKeys, 'Deve possuir chaves VAPID');
        assert(typeof status.publicKey === 'string' && status.publicKey.length > 20, 'Chave pública VAPID deve ser válida');
        assert.strictEqual(typeof status.subscriptionsCount, 'number', 'Deve retornar contagem de inscrições');
    });

    test('2. SQLite & DbService: Persistência e remoção de Push Subscription', () => {
        const mockSub = {
            endpoint: 'https://fcm.googleapis.com/fcm/send/test-endpoint-' + Date.now(),
            keys: {
                p256dh: 'BNcRdreALRFXTkOOUHK18WK25ypqU2TtxSulSNWhCGtfKDyPvILAbZL',
                auth: 'tBHItJI5svbpqpuD'
            }
        };

        const saved = testDb.savePushSubscription(mockSub, 'iPhone / Safari 17.2 PWA');
        assert(saved && saved.id, 'Deve retornar registro com ID criado');
        assert.strictEqual(saved.endpoint, mockSub.endpoint, 'Endpoint deve corresponder');

        const allSubs = testDb.getAllPushSubscriptions();
        const found = allSubs.find(s => s.endpoint === mockSub.endpoint);
        assert(found, 'Subscription deve ser encontrada no SQLite');
        assert.strictEqual(found.userAgent, 'iPhone / Safari 17.2 PWA', 'UserAgent deve ser persistido');

        // Remoção
        const removed = testDb.removePushSubscription(mockSub.endpoint);
        assert.strictEqual(removed, true, 'Deve remover com sucesso');
        const afterSubs = testDb.getAllPushSubscriptions();
        assert(!afterSubs.some(s => s.endpoint === mockSub.endpoint), 'Não deve mais existir no banco');
    });

    test('3. Integração Automática: addNotification dispara push para o PushService', async () => {
        let pushPayloadReceived = null;
        const mockPushService = {
            sendPushToAll: async (payload) => {
                pushPayloadReceived = payload;
                return { sent: 1, failed: 0, cleaned: 0 };
            }
        };

        testDb.setPushService(mockPushService);

        const notif = testDb.addNotification({
            title: '⚡ Boleto a Vencer Hoje',
            message: 'Aluguel do Escritório vence hoje (R$ 2.500)',
            type: 'financeiro',
            linkTab: 'financas'
        });

        assert(notif && notif.id, 'Notificação deve ser salva');
        assert(pushPayloadReceived, 'pushService.sendPushToAll deve ter sido acionado');
        assert.strictEqual(pushPayloadReceived.title, '⚡ Boleto a Vencer Hoje');
        assert.strictEqual(pushPayloadReceived.data.tab, 'financas');
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
