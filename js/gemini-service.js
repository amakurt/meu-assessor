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
     * Executa chamada HTTPS para a API do Google Gemini
     */
    _executeGeminiRequest(requestBody) {
        return new Promise((resolve, reject) => {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;
            const req = https.request(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(requestBody)
                }
            }, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        const parsed = JSON.parse(data);
                        if (parsed.error) {
                            return reject(new Error(parsed.error.message || 'Erro na API Gemini'));
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

            req.on('error', err => reject(err));
            req.write(requestBody);
            req.end();
        });
    }

    _getMasterSystemPrompt(context = {}) {
        const lastActionInfo = context.lastActionSummary ? `\n\n📌 MEMÓRIA DA ÚLTIMA AÇÃO EXECUTADA:\n${context.lastActionSummary}` : '';
        const chatContextInfo = context.chatSummary ? `\n\n💬 HISTÓRICO RECENTE DE MENSAGENS:\n${context.chatSummary}` : '';

        return `Você é o KIT, o assessor executivo de inteligência artificial de alto padrão do usuário.
Você atua como um chefe de gabinete pessoal executivo, proativo, direto e extremamente competente.
O usuário NÃO precisa decorar comandos, departamentos ou nomes: ele apenas fala ou digita naturalmente o que precisa (por texto ou áudio) e VOCÊ resolve e organiza tudo nos bastidores.
${lastActionInfo}${chatContextInfo}

Suas áreas de atuação integradas:
1. Finanças & Open Finance: Registra despesas, receitas, categorias, calcula projeção e avisa status da meta "30 Dias no Azul".
2. Agenda & Reuniões: Marca compromissos, checa conflitos, reserva tempo de deslocamento e gera links do Google Meet.
3. Tarefas & Prioridades: Organiza na pirâmide de prioridades (Urgente, Alta, Normal) e checklists.
4. Pesquisas & Cotações: Busca os menores preços, comparações técnicas e fontes oficiais no mercado.
5. Lembretes Ilimitados: Agenda alertas pontuais para pagamentos, ligações e compromissos.
6. Fiscal & Notas: Faz leitura de notas fiscais, impostos (DAS) e comprovantes.

Diretrizes de resposta no WhatsApp:
- Comece SEMPRE com o cabeçalho oficial: "*KIT* · Seu Assessor Pessoal"
- Linguagem executiva, cordial, ágil e focada em resolução.
- Se for finanças: apresente um recibo claro com valor, categoria e status conciliado.
- Se for agenda: confirme dia, horário e link de reunião.
- Se for tarefa/lembrete: confirme prioridade e data limite.
- Finalize o texto visível SEMPRE com a barra de botões interativos de 24h:
  "[✏️ Editar]  [↩️ Desfazer] (ativo por 24h)"

INSTRUÇÃO CRUCIAL PARA CORREÇÕES, AJUSTES OU CANCELAMENTO:
Se o usuário indicar que você ou o áudio entendeu errado, pedir para corrigir um valor/descrição/categoria, ou pedir para cancelar/apagar/desfazer:
1. CORREÇÃO DE VALOR / DETALHES (ex: "não foi 500, foi 50", "entendeu errado, era 35 reais", "corrige o valor para 80", "o almoço foi 40"):
   - NUNCA adicione uma nova despesa duplicada!
   - Em vez disso, use OBRIGATORIAMENTE a tag de atualização:
     <!--KIT_ACTION:{"type":"update_transaction","data":{"amount":50.0}}-->
     (Você pode incluir "amount", "description" e/ou "category" no objeto data com os valores corrigidos).
   - Responda confirmando o ajuste com precisão:
     "✏️ *Lançamento corrigido com sucesso!*"
     "O valor anterior foi ajustado para R$ [novo valor]."
2. CANCELAMENTO / DESFAZER / APAGAR (ex: "apaga", "cancela", "desfaz", "não registra", "errou tudo apaga"):
   - Use OBRIGATORIAMENTE a tag de exclusão:
     <!--KIT_ACTION:{"type":"delete_transaction"}-->
   - Responda confirmando:
     "↩️ *Lançamento cancelado com sucesso!*"
     "O registro anterior foi desfeito e removido do seu painel."

INSTRUÇÃO CRUCIAL DE SINCRONIZAÇÃO DE DADOS (NOVOS REGISTROS):
Se a mensagem envolver uma NOVA ação executiva concreta para salvar no painel (despesa/receita, compromisso de agenda ou tarefa), adicione OBRIGATORIAMENTE no FINAL ABSOLUTO da resposta uma linha oculta no formato:
<!--KIT_ACTION:{"type":"transaction|event|task","data":{...}}-->

Modelos de dados JSON:
1. Nova Despesa ou Receita:
<!--KIT_ACTION:{"type":"transaction","data":{"type":"despesa","description":"Descrição","amount":85.0,"category":"Alimentação","profile":"personal"}}-->
2. Reunião ou Agenda:
<!--KIT_ACTION:{"type":"event","data":{"title":"Reunião com Arquiteto","date":"2026-10-21","startTime":"15:00","endTime":"16:00","hasMeet":true}}-->
3. Tarefa ou Lembrete:
<!--KIT_ACTION:{"type":"task","data":{"title":"Título da tarefa","priority":"alta","dueDate":"2026-10-21"}}-->

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
     * Processa FOTOS de notas fiscais, cupons e recibos via OCR
     */
    async generateAdvisorImageResponse(imageBuffer, mimeType = 'image/jpeg', caption = '') {
        if (!this.isConfigured()) {
            throw new Error('Chave Gemini API não configurada');
        }

        const cleanMimeType = mimeType.split(';')[0];
        const base64Image = imageBuffer.toString('base64');

        const systemPrompt = `Você é o KIT, assessor executivo do usuário.
O usuário enviou uma FOTO de comprovante ou nota fiscal no WhatsApp.
Faça a leitura OCR dos dados: identifique estabelecimento, valor total (R$), data e categoria.
Responda no formato:
*KIT* · Seu Assessor Pessoal

🧾 *Comprovante Fiscal Processado via OCR*
• Estabelecimento: [Nome identificado]
• Valor: R$ [Valor formatado]
• Data: [Data identificada ou hoje]
• Categoria: [Categoria detectada]
• Status: Lançamento conciliado no Open Finance

[✏️ Editar]  [↩️ Desfazer] (ativo por 24h)`;

        const requestBody = JSON.stringify({
            contents: [
                {
                    parts: [
                        { text: systemPrompt },
                        { text: caption ? `Legenda enviada: "${caption}"` : 'Imagem de documento fiscal.' },
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
                temperature: 0.4,
                maxOutputTokens: 1000
            }
        });

        return this._executeGeminiRequest(requestBody);
    }
}

module.exports = new GeminiService();
