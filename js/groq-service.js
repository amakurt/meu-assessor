/**
 * KIT OS · GROQ WHISPER ULTRA-FAST TRANSCRIPTION SERVICE
 * Utiliza chips LPU da Groq com whisper-large-v3-turbo para transcrição
 * de áudio em tempo real (~300ms de latência).
 */

class GroqService {
    constructor() {
        this.apiKey = process.env.GROQ_API_KEY || '';
        this.model = 'whisper-large-v3-turbo';
    }

    setApiKey(key) {
        this.apiKey = key;
    }

    isConfigured() {
        return !!(this.apiKey && this.apiKey.startsWith('gsk_'));
    }

    /**
     * Transcreve um buffer de áudio (OGG, MP3, WAV, etc.) em texto em ~300ms
     * @param {Buffer} audioBuffer Buffer do arquivo de áudio
     * @param {string} mimeType Tipo MIME do áudio (ex: audio/ogg, audio/mp4)
     * @returns {Promise<{text: string, durationMs: number}>}
     */
    async transcribeAudio(audioBuffer, mimeType = 'audio/ogg') {
        if (!this.isConfigured()) {
            throw new Error('Chave Groq API não configurada');
        }

        const startTime = Date.now();
        const extension = mimeType.includes('mp4') ? 'm4a' : (mimeType.includes('mp3') ? 'mp3' : 'ogg');
        const filename = `audio_${Date.now()}.${extension}`;

        const blob = new Blob([audioBuffer], { type: mimeType });
        const formData = new FormData();
        formData.append('file', blob, filename);
        formData.append('model', this.model);
        formData.append('language', 'pt');
        formData.append('response_format', 'json');
        formData.append('temperature', '0.0');

        const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.apiKey}`
            },
            body: formData
        });

        if (!response.ok) {
            const errData = await response.text();
            throw new Error(`Groq Whisper HTTP ${response.status}: ${errData}`);
        }

        const data = await response.json();
        const tookMs = Date.now() - startTime;
        const text = (data.text || '').trim();

        console.log(`⚡ [Groq Whisper] Áudio transcrito em ${tookMs}ms: "${text}"`);
        return {
            text,
            durationMs: tookMs
        };
    }
}

module.exports = new GroqService();
