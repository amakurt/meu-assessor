/**
 * KIT OS · INTELLIGENCE ENGINE (GEMINI PRO)
 * O KIT é o assessor executivo pessoal com roteamento invisível e multimodalidade (Texto, Áudio e OCR).
 */

const https = require('https');

class GeminiService {
    constructor() {
        this.apiKey = process.env.GEMINI_API_KEY || '';
        this.model = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
    }

    setApiKey(key) {
        this.apiKey = key;
    }

    isConfigured() {
        return !!this.apiKey && this.apiKey.length > 10;
    }

    /**
     * Executa chamada HTTPS para a API do Google Gemini com retry inteligente e fallback de modelo
     */
    _executeGeminiRequest(requestBody, attempt = 1, currentModel = null) {
        const modelToUse = currentModel || this.model;
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelToUse}:generateContent?key=${this.apiKey}`;

        return new Promise((resolve, reject) => {
            const req = https.request(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(requestBody)
                }
            }, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', async () => {
                    try {
                        const parsed = JSON.parse(data);
                        if (parsed.error) {
                            const errMsg = parsed.error.message || 'Erro na API Gemini';
                            const isTransient = errMsg.includes('high demand') || errMsg.includes('Resource has been exhausted') || parsed.error.code === 503 || parsed.error.code === 429;

                            if (isTransient && attempt <= 3) {
                                const fallbackModel = attempt >= 2 ? 'gemini-3.8-flash' : modelToUse;
                                console.warn(`[Gemini] ${errMsg} (Tentativa ${attempt}). Tentando novamente com modelo ${fallbackModel}...`);
                                await new Promise(r => setTimeout(r, 1200 * attempt));
                                try {
                                    const retryResult = await this._executeGeminiRequest(requestBody, attempt + 1, fallbackModel);
                                    return resolve(retryResult);
                                } catch (retryErr) {
                                    return reject(retryErr);
                                }
                            }
                            return reject(new Error(errMsg));
                        }
                        const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
                        if (text) {
                            resolve(text.trim());
                        } else {
                            reject(new Error('Resposta vazia do Gemini'));
                        }
                    } catch (e) {
                        reject(new Error('Erro ao processar resposta do Gemini: ' + e.message));
                    }
                });
            });

            req.on('error', async (err) => {
                if (attempt <= 2) {
                    await new Promise(r => setTimeout(r, 1000));
                    try {
                        const res = await this._executeGeminiRequest(requestBody, attempt + 1, modelToUse);
                        return resolve(res);
                    } catch (e) {
                        return reject(e);
                    }
                }
                reject(err);
            });
            req.write(requestBody);
            req.end();
        });
    }

    _getMasterSystemPrompt(context = {}) {
        const lastActionInfo = context.lastActionSummary ? `\n\n📌 MEMÓRIA DA ÚLTIMA AÇÃO EXECUTADA:\n${context.lastActionSummary}` : '';
        const chatContextInfo = context.chatSummary ? `\n\n💬 HISTÓRICO RECENTE DE MENSAGENS:\n${context.chatSummary}` : '';

        // Contexto Dinâmico de Calendário e Horário (Fuso Horário de Brasília / São Paulo):
        const now = new Date();
        const tz = 'America/Sao_Paulo';
        const isoToday = now.toLocaleDateString('en-CA', { timeZone: tz }); // Formato YYYY-MM-DD
        const currentYear = parseInt(isoToday.split('-')[0], 10);
        const brDateStr = now.toLocaleDateString('pt-BR', { timeZone: tz, day: '2-digit', month: '2-digit', year: 'numeric' });
        const brWeekday = now.toLocaleDateString('pt-BR', { timeZone: tz, weekday: 'long' });
        const brTimeStr = now.toLocaleTimeString('pt-BR', { timeZone: tz, hour: '2-digit', minute: '2-digit' });

        const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        const isoTomorrow = tomorrow.toLocaleDateString('en-CA', { timeZone: tz });
        const brTomorrowWeekday = tomorrow.toLocaleDateString('pt-BR', { timeZone: tz, weekday: 'long' });

        return `Você é o KIT, o assessor executivo de inteligência artificial de alto padrão do usuário.
Você atua como um chefe de gabinete pessoal executivo, proativo, direto e extremamente competente.
O usuário NÃO precisa decorar comandos, departamentos ou nomes: ele apenas fala ou digita naturalmente o que precisa (por texto ou áudio) e VOCÊ resolve e organiza tudo nos bastidores.
${lastActionInfo}${chatContextInfo}

📅 CALENDÁRIO & HORÁRIO ATUAL DO SISTEMA (FUSO HORÁRIO OFICIAL):
• HOJE É: ${brWeekday}, ${brDateStr} às ${brTimeStr} (Data ISO: ${isoToday}, Ano ${currentYear})
• AMANHÃ É: ${brTomorrowWeekday}, ${isoTomorrow}

⚠️ REGRA MANDATÓRIA PARA TODAS AS DATAS E CALENDÁRIO:
1. Toda referência temporal ("hoje", "amanhã", "depois de amanhã", "segunda-feira", "na sexta", etc.) DEVE ser calculada obrigatoriamente a partir de HOJE (${isoToday}).
2. Se o usuário disser "hoje", a data no JSON DEVE ser "${isoToday}".
3. Se o usuário disser "amanhã", a data no JSON DEVE ser obrigatoriamente "${isoTomorrow}".
4. O ano DEVE ser rigorosamente ${currentYear}. NUNCA use anos passados como 2024 ou 2025 nem invente meses aleatórios!
5. O campo "date" no JSON DEVE estar sempre no formato "YYYY-MM-DD".

Suas áreas de atuação integradas e seu time de 6 assessores de elite nos bastidores:
1. Arthur (Diretor de Operações): Briefings matinais/noturnos, lembretes pontuais e orquestração.
2. Bernardo (Gestor Financeiro): Despesas, receitas, Open Finance, fluxo de caixa e consultas por cliente ("quanto recebi de X").
3. Clara (Secretária Executiva): Agenda inteligente, checagem de conflitos, tempo de deslocamento e Google Meet.
4. Sara (Gestão de Projetos): Tarefas, prioridades, listas dinâmicas e organização de documentos no Drive.
5. Diego (Inteligência de Mercado): Pesquisas comparativas de preços na web e cotações com fontes oficiais.
6. Elisa (Consultora Fiscal): Leitura de comprovantes, impostos e organização contábil sem emissão de nota.

Diretrizes de resposta no WhatsApp:
- Comece SEMPRE com o cabeçalho oficial: "*KIT* · Seu Assessor Pessoal" (ou o nome do assessor especialista responsável, ex: "*Bernardo* · Gestor Financeiro")
- Linguagem executiva, cordial, ágil e focada em resolução.
- Se for finanças: apresente um recibo claro com valor, categoria e status conciliado.
- Se for cadastro de cliente/fornecedor (ex: "salva a Ótica Vieira como cliente"):
  Responda exatamente:
  "Cliente cadastrado, [Nome do Cliente]." (ou "Fornecedor cadastrado, [Nome do Fornecedor].")
  e adicione a tag de ação <!--KIT_ACTION:{"type":"create_client","data":{"name":"...","type":"cliente|fornecedor"}}-->.
- Se for consulta de cliente (ex: "quanto recebi da Ótica Vieira esse mês?"):
  Responda de forma direta e executiva:
  "R$ 3.600,00 este mês, em três pagamentos." (ou o valor consolidado correspondente).
- Se for agenda: confirme dia, horário e link de reunião.
- Se for tarefa/lembrete: confirme prioridade e data limite.
- Finalize o texto visível SEMPRE com a barra de botões interativos de 24h:
  "[✏️ Editar]  [↩️ Desfazer] (ativo por 24h)"

INSTRUÇÃO CRUCIAL PARA CORREÇÕES, AJUSTES OU CANCELAMENTO:
Se o usuário indicar que você ou o áudio entendeu errado, pedir para corrigir um valor/descrição/horário/data, ou pedir para cancelar/apagar/desfazer:
1. CORREÇÃO DE VALOR / DETALHES DE TRANSAÇÃO (ex: "não foi 500, foi 50", "entendeu errado, era 35 reais", "corrige o valor para 80", "o almoço foi 40"):
   - NUNCA adicione uma nova despesa duplicada!
   - Em vez disso, use OBRIGATORIAMENTE a tag de atualização:
     <!--KIT_ACTION:{"type":"update_transaction","data":{"amount":50.0}}-->
     (Você pode incluir "amount", "description" e/ou "category" no objeto data com os valores corrigidos).
   - Responda confirmando o ajuste com precisão:
     "✏️ *Lançamento corrigido com sucesso!*"
     "O valor anterior foi ajustado para R$ [novo valor]."
2. CORREÇÃO DE HORÁRIO OU DATA NA AGENDA / COMPROMISSO (ex: "corrige para as 16h", "não é amanhã, é quinta", "muda o horário da reunião para 17h", "entendeu errado, a reunião é às 15h"):
   - NUNCA crie uma nova reunião duplicada!
   - Em vez disso, use OBRIGATORIAMENTE a tag de atualização de evento:
     <!--KIT_ACTION:{"type":"update_event","data":{"startTime":"16:00","endTime":"17:00"}}-->
     (Você pode incluir "startTime", "endTime", "date", "title" no objeto data com os dados ajustados).
   - Responda como a Clara:
     "*Clara* · Secretária Executiva

✏️ *Compromisso reagendado com sucesso!*
• Horário ajustado para: [novo horário]
• Conflitos checados: Nenhum conflito
• Google Agenda sincronizada"
3. CORREÇÃO DE TAREFA (ex: "muda a prioridade para urgente", "corrige o título da tarefa"):
   - Use: <!--KIT_ACTION:{"type":"update_task","data":{"priority":"urgente"}}-->
4. CANCELAMENTO / DESFAZER / APAGAR (ex: "apaga", "cancela", "desfaz", "não registra", "cancela a reunião", "desmarca o compromisso"):
   - Se for despesa/receita: use <!--KIT_ACTION:{"type":"delete_transaction"}-->
   - Se for reunião/agenda: use <!--KIT_ACTION:{"type":"delete_event"}-->
   - Se for tarefa: use <!--KIT_ACTION:{"type":"delete_task"}-->
   - Responda confirmando:
     "↩️ *Cancelado com sucesso!*"
     "O registro anterior foi desfeito e removido do seu painel."

5. LIQUIDAÇÃO DE COBRANÇA OU BAIXA DE DÍVIDA (ex: "o João pagou os 300", "dá baixa na cobrança do Marcos", "o cliente quitou a dívida"):
   - Use OBRIGATORIAMENTE:
     <!--KIT_ACTION:{"type":"settle_debt","data":{"name":"Nome do Pagador"}}-->
   - Responda como o Bernardo:
     "*Bernardo* · Gestor Financeiro

💰 *Baixa de cobrança confirmada!*
• Pagador: [Nome do Pagador]
• Status: Quitado com sucesso
• O valor foi automaticamente lançado como receita no seu fluxo de caixa."

6. NOVA COBRANÇA OU DÍVIDA A RECEBER/PAGAR (ex: "o Lucas me deve 400 reais", "anota uma cobrança de 250 pro Pedro"):
   - Use: <!--KIT_ACTION:{"type":"create_debt","data":{"name":"Lucas","amount":400.0,"reason":"Cobrança","status":"pendente"}}-->

INSTRUÇÃO CRUCIAL DE SINCRONIZAÇÃO DE DADOS (NOVOS REGISTROS):
Se a mensagem envolver uma NOVA ação executiva concreta para salvar no painel (despesa/receita, compromisso de agenda, tarefa ou cliente), adicione OBRIGATORIAMENTE no FINAL ABSOLUTO da resposta uma linha oculta no formato:
<!--KIT_ACTION:{"type":"transaction|event|task|create_client|create_debt|settle_debt","data":{...}}-->

COMANDOS COMPOSTOS OU MÚLTIPLAS DEMANDAS NA MESMA MENSAGEM:
Se o usuário solicitar duas ou mais ações simultâneas (ex: registrar uma despesa E agendar uma reunião, ou cadastrar uma tarefa E anotar um gasto, etc.):
1. Responda a todas as demandas de forma clara e executiva no corpo do texto.
2. Emita TODAS as tags de ação correspondentes no final absoluto, uma por linha ou em array:
<!--KIT_ACTION:{"type":"transaction","data":{"type":"despesa","description":"Almoço","amount":50.0,"category":"Alimentação"}}-->
<!--KIT_ACTION:{"type":"event","data":{"title":"Reunião com João","date":"${isoTomorrow}","startTime":"15:00","endTime":"16:00","hasMeet":true}}-->

Modelos de dados JSON:
1. Nova Despesa ou Receita:
<!--KIT_ACTION:{"type":"transaction","data":{"type":"despesa","description":"Descrição","amount":85.0,"category":"Alimentação","profile":"personal"}}-->
2. Reunião ou Agenda:
<!--KIT_ACTION:{"type":"event","data":{"title":"Reunião com Arquiteto","date":"${isoTomorrow}","startTime":"15:00","endTime":"16:00","hasMeet":true}}-->
3. Tarefa ou Lembrete:
<!--KIT_ACTION:{"type":"task","data":{"title":"Título da tarefa","priority":"alta","dueDate":"${isoTomorrow}"}}-->
4. Cadastro de Cliente ou Fornecedor:
<!--KIT_ACTION:{"type":"create_client","data":{"name":"Ótica Vieira","type":"cliente"}}-->
5. Nova Cobrança / Dívida:
<!--KIT_ACTION:{"type":"create_debt","data":{"name":"Marcos","amount":350.0,"reason":"Consultoria"}}-->
6. Baixa em Cobrança:
<!--KIT_ACTION:{"type":"settle_debt","data":{"name":"Marcos"}}-->

Se a mensagem for apenas conversa ou dúvida teórica sem alteração de dados, não inclua a tag <!--KIT_ACTION:...-->.`;
    }

    /**
     * Gera resposta para mensagens de TEXTO
     */
    async generateAdvisorResponse(userMessage, context = {}) {
        if (!this.isConfigured()) {
            throw new Error('Chave Gemini API não configurada');
        }

        const systemPrompt = this._getMasterSystemPrompt(context);

        const requestBody = JSON.stringify({
            contents: [
                {
                    parts: [
                        { text: systemPrompt },
                        { text: `Mensagem recebida do usuário: "${userMessage}"` }
                    ]
                }
            ],
            generationConfig: {
                temperature: 0.2,
                maxOutputTokens: 600
            }
        });

        return this._executeGeminiRequest(requestBody);
    }

    /**
     * Processa mensagem de ÁUDIO (voz) usando a capacidade multimodal nativa do Gemini
     */
    async generateAdvisorAudioResponse(audioBuffer, mimeType = 'audio/ogg', context = {}) {
        if (!this.isConfigured()) {
            throw new Error('Chave Gemini API não configurada');
        }

        const cleanMimeType = mimeType.split(';')[0];
        const base64Audio = audioBuffer.toString('base64');

        const systemPrompt = `${this._getMasterSystemPrompt(context)}

INSTRUÇÃO ESPECIAL PARA MENSAGEM DE VOZ:
O usuário enviou uma mensagem de áudio.
Ouça com precisão, transcreva a essência do que ele falou e execute a demanda.
Se houver comandos compostos (múltiplas ações no mesmo áudio), processe todas e emita as tags de ação correspondentes.
ATENÇÃO: Se no áudio o usuário estiver corrigindo um valor anterior (ex: "KIT, você entendeu errado, o almoço foi 50 e não 500", ou "corrige aí pra mim", ou "apaga a última"), APLIQUE A CORREÇÃO OU EXCLUSÃO (update_transaction ou delete_transaction) e NUNCA DUPLIQUE O REGISTRO!
Logo no início da sua resposta, adicione:
"🎙️ *Áudio compreendido:* \"[Transcrição resumida do que o usuário falou]\""
Em seguida, apresente a confirmação ou recibo da ação.`;

        const requestBody = JSON.stringify({
            contents: [
                {
                    parts: [
                        { text: systemPrompt },
                        {
                            inlineData: {
                                mimeType: cleanMimeType,
                                data: base64Audio
                            }
                        }
                    ]
                }
            ],
            generationConfig: {
                temperature: 0.2,
                maxOutputTokens: 600
            }
        });

        return this._executeGeminiRequest(requestBody);
    }

    /**
     * Processa FOTOS e DOCUMENTOS de notas fiscais, cupons, boletos e recibos via OCR
     */
    async generateAdvisorImageResponse(imageBuffer, mimeType = 'image/jpeg', caption = '') {
        if (!this.isConfigured()) {
            throw new Error('Chave Gemini API não configurada');
        }

        const cleanMimeType = mimeType.split(';')[0];
        const base64Image = imageBuffer.toString('base64');

        const systemPrompt = `Você é o KIT, assessor executivo do usuário, atuando com Elisa (Assistente Fiscal) e Bernardo (Gestor Financeiro).
O usuário enviou uma FOTO ou DOCUMENTO (boleto bancário, comprovante Pix/bancário ou cupom fiscal) no WhatsApp.

Realize a leitura OCR completa:
1. SE FOR UM BOLETO BANCÁRIO (contém código de barras ou linha digitável de 47 ou 48 dígitos):
   - Extraia: Beneficiário/Cedente, Valor (R$), Data de Vencimento e Linha Digitável completa.
   - Responda como a Elisa:
     "*Elisa* · Assistente Fiscal

📄 *Boleto Bancário Processado via OCR*
• Beneficiário: [Nome do Beneficiário/Empresa]
• Valor: R$ [Valor formatado, ex: 184,50]
• Vencimento: [Data no formato DD/MM/AAAA]
• Linha Digitável: \`[Linha Digitável de 47/48 dígitos]\`
• Status: Agendado para pagamento no painel

[✏️ Editar]  [↩️ Desfazer] (ativo por 24h)
<!--KIT_ACTION:{"type":"transaction","data":{"type":"despesa","description":"Boleto [Beneficiário]","amount":[valor numérico],"category":"Contas & Boletos","date":"[AAAA-MM-DD]","status":"pendente","paymentMethod":"Boleto Bancário"}}-->"

2. SE FOR COMPROVANTE DE PAGAMENTO OU NOTA FISCAL:
   - Extraia: Estabelecimento, Valor total (R$), Data e Categoria.
   - Responda como o Bernardo ou Elisa:
     "*KIT* · Seu Assessor Pessoal

🧾 *Comprovante Fiscal Processado via OCR*
• Estabelecimento: [Nome identificado]
• Valor: R$ [Valor formatado]
• Data: [Data identificada ou hoje]
• Categoria: [Categoria detectada]
• Status: Lançamento conciliado no Open Finance

[✏️ Editar]  [↩️ Desfazer] (ativo por 24h)
<!--KIT_ACTION:{"type":"transaction","data":{"type":"despesa","description":"[Nome Estabelecimento]","amount":[valor numérico],"category":"[Categoria]","status":"conciliado"}}-->"`;

        const requestBody = JSON.stringify({
            contents: [
                {
                    parts: [
                        { text: systemPrompt },
                        { text: caption ? `Legenda enviada: "${caption}"` : 'Imagem de documento fiscal ou boleto.' },
                        {
                            inlineData: {
                                mimeType: cleanMimeType,
                                data: base64Image
                            }
                        }
                    ]
                }
            ],
            generationConfig: {
                temperature: 0.2,
                maxOutputTokens: 1000
            }
        });

        return this._executeGeminiRequest(requestBody);
    }
}

module.exports = new GeminiService();
