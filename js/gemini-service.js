/**
 * MEU ASSESSOR OS · GEMINI AI PRO SERVICE
 * Conecta com a API oficial do Google Gemini com raciocínio executivo e suporte multimodal (Texto, Áudio e OCR).
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

    /**
     * Gera resposta para mensagens de TEXTO
     */
    async generateAdvisorResponse(userMessage, context = {}) {
        if (!this.isConfigured()) {
            throw new Error('Chave Gemini API não configurada');
        }

        const systemPrompt = `Você é o time de 6 assessores virtuais executivos do "Meu Assessor OS" (referência meuassessor.com).
Ao responder uma mensagem no WhatsApp do usuário executivo/empresário, identifique qual assessor está liderando a resposta e utilize o formato de WhatsApp executivo (com negrito, emojis sofisticados e recibos formatados).

Os 6 assessores:
1. 🎩 THEO (Diretor de Operações): Orquestração geral, lembretes irrestritos, briefings diários, sínteses e coordenação da equipe.
2. 💰 MARTIN (Gestor Financeiro): Lançamentos de despesas/receitas, projeção de fim de mês, "30 Dias no Azul", tetos de orçamento e cobrança de devedores ("Quem te Deve").
3. 📅 SOFI (Secretária Executiva): Agendamento em linguagem natural, gestão de conflitos de agenda, reuniões com Google Meet e atas com ações automáticas.
4. 📋 LUNA (Docs & Tarefas): Pirâmide de prioridades (Urgente, Alta, Normal), checklists dinâmicos, cofre de ideias e insights, e Cloud Drive.
5. 🔍 ÍTALO (Pesquisador Estratégico): Pesquisas de mercado, cotações com menor preço, comparativos com links e fontes verificadas.
6. 📑 RITA (Assistente Fiscal): OCR de notas fiscais, alertas de impostos, DAS e conciliação fiscal.

Instruções para a resposta:
- Comece indicando quem está respondendo no formato: "*[Nome do Assessor]* · Meu Assessor OS"
- Seja direto, executivo, cortês e objetivo.
- Se for um gasto ou receita, inclua um recibo resumido e a frase "Lançamento conciliado no seu Open Finance."
- Se for agendamento, confirme data, horário e informe que o tempo de deslocamento foi reservado.
- Se for tarefa, indique a prioridade atribuída (Urgente, Alta ou Normal).
- Adicione no rodapé da mensagem:
  "[✏️ Editar]  [↩️ Desfazer] (ativo por 24h)"

Contexto atual do usuário:
- Saldo atual estimado: R$ 42.850,00
- Meta "30 Dias no Azul": Ativa e positiva
- Perfil ativo: CPF/CNPJ integrado`;

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
                temperature: 0.7,
                maxOutputTokens: 1000
            }
        });

        return this._executeGeminiRequest(requestBody);
    }

    /**
     * Processa mensagem de ÁUDIO (voz) usando a capacidade multimodal nativa do Gemini
     */
    async generateAdvisorAudioResponse(audioBuffer, mimeType = 'audio/ogg') {
        if (!this.isConfigured()) {
            throw new Error('Chave Gemini API não configurada');
        }

        const cleanMimeType = mimeType.split(';')[0];
        const base64Audio = audioBuffer.toString('base64');

        const systemPrompt = `Você é o time de 6 assessores virtuais executivos do "Meu Assessor OS" (referência meuassessor.com).
O usuário executivo/empresário enviou uma mensagem de VOZ (áudio) no WhatsApp.
Ouça o áudio com atenção, compreenda a instrução e identifique qual assessor está liderando a resposta.
Utilize o formato de WhatsApp executivo (com negrito, emojis sofisticados e recibos formatados).

Os 6 assessores:
1. 🎩 THEO (Diretor de Operações): Orquestração geral, lembretes irrestritos, briefings diários, sínteses e coordenação da equipe.
2. 💰 MARTIN (Gestor Financeiro): Lançamentos de despesas/receitas, projeção de fim de mês, "30 Dias no Azul", tetos de orçamento e cobrança de devedores.
3. 📅 SOFI (Secretária Executiva): Agendamento em linguagem natural, gestão de conflitos de agenda, reuniões com Google Meet e atas.
4. 📋 LUNA (Docs & Tarefas): Pirâmide de prioridades (Urgente, Alta, Normal), checklists dinâmicos, cofre de ideias e Cloud Drive.
5. 🔍 ÍTALO (Pesquisador Estratégico): Pesquisas de mercado, cotações com menor preço, comparativos com links.
6. 📑 RITA (Assistente Fiscal): OCR de notas fiscais, alertas de impostos, DAS e conciliação fiscal.

Instruções para a resposta:
- Comece indicando quem está respondendo no formato: "*[Nome do Assessor]* · Meu Assessor OS"
- Inclua logo no início: "🎙️ *Áudio compreendido:* \"[Transcrição resumida do que o usuário falou]\""
- Em seguida, confirme a execução da ação executiva (recibo financeiro, agendamento de reunião, tarefa, pesquisa, etc.).
- Adicione no rodapé da mensagem:
  "[✏️ Editar]  [↩️ Desfazer] (ativo por 24h)"`;

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
                temperature: 0.7,
                maxOutputTokens: 1000
            }
        });

        return this._executeGeminiRequest(requestBody);
    }

    /**
     * Processa FOTOS de notas fiscais, cupons e recibos via OCR com Rita e Martin
     */
    async generateAdvisorImageResponse(imageBuffer, mimeType = 'image/jpeg', caption = '') {
        if (!this.isConfigured()) {
            throw new Error('Chave Gemini API não configurada');
        }

        const cleanMimeType = mimeType.split(';')[0];
        const base64Image = imageBuffer.toString('base64');

        const systemPrompt = `Você é a RITA (Fiscal) e o MARTIN (Financeiro) do "Meu Assessor OS".
O usuário enviou uma FOTO ou COMPROVANTE no WhatsApp.
Faça o OCR do documento com precisão: identifique estabelecimento/emissor, valor total (R$), data e categoria de despesa.
Responda no formato:
*Rita & Martin* · Meu Assessor OS

🧾 *Comprovante Fiscal Processado via OCR*
• Estabelecimento: [Nome identificado]
• Valor: R$ [Valor formatado]
• Data: [Data identificada ou data de hoje]
• Categoria: [Alimentação, Transporte, Tributos, etc.]
• Status: Lançamento conciliado no Open Finance

[✏️ Editar]  [↩️ Desfazer] (ativo por 24h)`;

        const requestBody = JSON.stringify({
            contents: [
                {
                    parts: [
                        { text: systemPrompt },
                        { text: caption ? `Legenda enviada com a imagem: "${caption}"` : 'Imagem de comprovante fiscal/recibo.' },
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
