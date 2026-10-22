/**
 * KIT OS · GOOGLE CALENDAR SERVICE (OAUTH2 BIDIRECIONAL)
 * Integração oficial com a Google Calendar API v3.
 * Sincronização nos dois sentidos: WhatsApp/Clara ➔ Google Agenda & Google Agenda ➔ Painel KIT OS.
 */

const https = require('https');
const dbService = require('./db-service');

class GoogleCalendarService {
    constructor() {
        this.clientId = process.env.GOOGLE_CLIENT_ID || '';
        this.clientSecret = process.env.GOOGLE_CLIENT_SECRET || '';
        this.timeZone = process.env.TIMEZONE || 'America/Sao_Paulo';
    }

    setCredentials(clientId, clientSecret) {
        this.clientId = clientId;
        this.clientSecret = clientSecret;
    }

    isConfigured() {
        return !!(this.clientId && this.clientSecret && !this.clientSecret.includes('•'));
    }

    isConnected() {
        const auth = dbService.getGoogleAuth();
        return !!(auth && auth.accessToken && auth.userEmail);
    }

    getStatus() {
        const auth = dbService.getGoogleAuth();
        return {
            configured: this.isConfigured(),
            connected: this.isConnected(),
            email: auth ? auth.userEmail : null,
            lastUpdated: auth ? auth.updatedAt : null
        };
    }

    /**
     * Gera URL de autorização OAuth 2.0 da Google
     */
    getAuthUrl(redirectUri) {
        if (!this.isConfigured()) {
            throw new Error('Credenciais do Google Calendar (Client ID / Secret) não configuradas');
        }

        const scope = [
            'https://www.googleapis.com/auth/calendar.events',
            'https://www.googleapis.com/auth/userinfo.email'
        ].join(' ');

        const params = new URLSearchParams({
            client_id: this.clientId,
            redirect_uri: redirectUri,
            response_type: 'code',
            scope: scope,
            access_type: 'offline',
            prompt: 'consent'
        });

        return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
    }

    /**
     * Troca o código OAuth recebido por tokens de acesso e refresh
     */
    async handleCallback(code, redirectUri) {
        if (!this.isConfigured()) {
            throw new Error('Credenciais da Google não configuradas');
        }

        // 1. Troca de code por Access Token e Refresh Token
        const tokenData = await this._makePostRequest(
            'oauth2.googleapis.com',
            '/token',
            {
                code,
                client_id: this.clientId,
                client_secret: this.clientSecret,
                redirect_uri: redirectUri,
                grant_type: 'authorization_code'
            }
        );

        if (!tokenData.access_token) {
            throw new Error(tokenData.error_description || tokenData.error || 'Falha ao obter token da Google');
        }

        // 2. Busca e-mail do usuário autenticado
        let userEmail = null;
        try {
            const userInfo = await this._makeGetRequest(
                'www.googleapis.com',
                '/oauth2/v2/userinfo',
                tokenData.access_token
            );
            userEmail = userInfo.email || null;
        } catch (e) {
            console.warn('[Google] Aviso ao obter userinfo:', e.message);
        }

        const expiresAt = Date.now() + ((tokenData.expires_in || 3600) * 1000) - 60000;

        // 3. Salva credenciais no banco SQLite
        dbService.saveGoogleAuth({
            accessToken: tokenData.access_token,
            refreshToken: tokenData.refresh_token || null,
            expiresAt,
            userEmail,
            scope: tokenData.scope || 'calendar.events'
        });

        console.log(`[Google Calendar] Conta conectada com sucesso: ${userEmail || 'OK'}`);

        // 4. Dispara sincronização inicial em segundo plano
        this.syncFromGoogle().catch(err => {
            console.error('[Google Calendar] Erro na sincronização inicial:', err.message);
        });

        return { success: true, email: userEmail };
    }

    /**
     * Garante um token de acesso válido, renovando automaticamente se expirado
     */
    async getValidAccessToken() {
        const auth = dbService.getGoogleAuth();
        if (!auth || !auth.accessToken) {
            throw new Error('Google Calendar não está conectado');
        }

        // Se ainda for válido por pelo menos 3 minutos, retorna direto
        if (Date.now() < auth.expiresAt - 180000) {
            return auth.accessToken;
        }

        if (!auth.refreshToken) {
            console.warn('[Google] Token expirado e sem refresh_token. Necessário reconectar.');
            return auth.accessToken;
        }

        console.log('[Google Calendar] Renovando Access Token com Refresh Token...');
        const refreshData = await this._makePostRequest(
            'oauth2.googleapis.com',
            '/token',
            {
                client_id: this.clientId,
                client_secret: this.clientSecret,
                refresh_token: auth.refreshToken,
                grant_type: 'refresh_token'
            }
        );

        if (refreshData.access_token) {
            const newExpiresAt = Date.now() + ((refreshData.expires_in || 3600) * 1000) - 60000;
            dbService.saveGoogleAuth({
                accessToken: refreshData.access_token,
                refreshToken: auth.refreshToken,
                expiresAt: newExpiresAt,
                userEmail: auth.userEmail,
                scope: auth.scope
            });
            return refreshData.access_token;
        }

        throw new Error('Falha ao renovar token de acesso da Google');
    }

    /**
     * Sincroniza eventos do Google Agenda para o KIT OS (Descida)
     */
    async syncFromGoogle() {
        if (!this.isConnected()) return { synced: 0 };

        const accessToken = await this.getValidAccessToken();
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

        console.log('[Google Calendar] Sincronizando eventos da Google Agenda...');

        const path = `/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(startOfMonth)}&singleEvents=true&orderBy=startTime&maxResults=100`;
        const res = await this._makeGetRequest('www.googleapis.com', path, accessToken);

        let count = 0;
        if (res && Array.isArray(res.items)) {
            for (const item of res.items) {
                if (!item.summary) continue;

                const startRaw = item.start?.dateTime || item.start?.date || '';
                const endRaw = item.end?.dateTime || item.end?.date || '';

                const dateStr = startRaw.includes('T') ? startRaw.split('T')[0] : startRaw;
                const startTime = startRaw.includes('T') ? startRaw.split('T')[1].substring(0, 5) : '09:00';
                const endTime = endRaw.includes('T') ? endRaw.split('T')[1].substring(0, 5) : '10:00';

                const meetUrl = item.hangoutLink || item.conferenceData?.entryPoints?.[0]?.uri || null;
                const hasMeet = !!meetUrl || (item.location && item.location.includes('meet.google.com'));

                // Verifica se o evento já existe pelo googleEventId
                const existing = dbService.findEventByGoogleId(item.id);

                if (!existing) {
                    dbService.applyAction({
                        type: 'event',
                        data: {
                            id: `ev-g-${Date.now()}-${count}`,
                            title: item.summary,
                            date: dateStr,
                            startTime,
                            endTime,
                            location: item.location || (hasMeet ? 'Google Meet' : 'Presencial'),
                            hasMeet: hasMeet ? 1 : 0,
                            meetUrl,
                            googleEventId: item.id
                        }
                    });
                    count++;
                }
            }
        }

        console.log(`[Google Calendar] Sincronização concluída: ${count} novos eventos importados da Google Agenda.`);
        return { success: true, count };
    }

    /**
     * Envia um evento criado no KIT (WhatsApp/Clara) para a Google Agenda (Subida)
     */
    async pushEventToGoogle(event) {
        if (!this.isConnected()) return null;

        try {
            const accessToken = await this.getValidAccessToken();
            const dateStr = event.date || new Date().toISOString().split('T')[0];
            const startTime = event.startTime || '10:00';
            const endTime = event.endTime || '11:00';

            const startIso = `${dateStr}T${startTime}:00`;
            const endIso = `${dateStr}T${endTime}:00`;

            const requestPayload = {
                summary: event.title || 'Compromisso KIT OS',
                description: 'Agendado automaticamente pelo KIT OS (Assessoria Executiva Clara)',
                start: {
                    dateTime: startIso,
                    timeZone: this.timeZone
                },
                end: {
                    dateTime: endIso,
                    timeZone: this.timeZone
                },
                location: event.location || (event.hasMeet ? 'Google Meet' : '')
            };

            if (event.hasMeet) {
                requestPayload.conferenceData = {
                    createRequest: {
                        requestId: `req-${Date.now()}`,
                        conferenceSolutionKey: { type: 'hangoutsMeet' }
                    }
                };
            }

            console.log(`[Google Calendar] Enviando compromisso "${event.title}" para a Google Agenda...`);

            const path = '/calendar/v3/calendars/primary/events?conferenceDataVersion=1';
            const created = await this._makePostRequest(
                'www.googleapis.com',
                path,
                requestPayload,
                accessToken
            );

            if (created && created.id) {
                const officialMeet = created.hangoutLink || created.conferenceData?.entryPoints?.[0]?.uri || event.meetUrl;
                dbService.updateEventGoogleId(event.id, created.id, officialMeet);
                console.log(`[Google Calendar] Evento sincronizado com sucesso! ID Google: ${created.id} (Meet: ${officialMeet})`);
                return { googleEventId: created.id, meetUrl: officialMeet };
            }
        } catch (e) {
            console.error('[Google Calendar] Falha ao enviar evento para o Google:', e.message);
        }
        return null;
    }

    /**
     * Remove um evento da Google Agenda quando cancelado no KIT
     */
    async deleteEventFromGoogle(googleEventId) {
        if (!this.isConnected() || !googleEventId) return;

        try {
            const accessToken = await this.getValidAccessToken();
            await new Promise((resolve, reject) => {
                const req = https.request({
                    hostname: 'www.googleapis.com',
                    port: 443,
                    path: `/calendar/v3/calendars/primary/events/${googleEventId}`,
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${accessToken}`
                    }
                }, res => {
                    resolve(res.statusCode);
                });
                req.on('error', reject);
                req.end();
            });
            console.log(`[Google Calendar] Evento ${googleEventId} removido da Google Agenda.`);
        } catch (e) {
            console.warn('[Google Calendar] Erro ao deletar evento da Google:', e.message);
        }
    }

    _makePostRequest(hostname, path, data, bearerToken = null, isForm = false) {
        return new Promise((resolve, reject) => {
            const isUrlEncoded = isForm || hostname.includes('oauth2.googleapis.com');
            const postBody = isUrlEncoded
                ? (typeof data === 'string' ? data : new URLSearchParams(data).toString())
                : (typeof data === 'string' ? data : JSON.stringify(data));

            const headers = {
                'Content-Type': isUrlEncoded ? 'application/x-www-form-urlencoded' : 'application/json',
                'Content-Length': Buffer.byteLength(postBody)
            };
            if (bearerToken) {
                headers['Authorization'] = `Bearer ${bearerToken}`;
            }

            const req = https.request({
                hostname,
                port: 443,
                path,
                method: 'POST',
                headers
            }, (res) => {
                let body = '';
                res.on('data', chunk => body += chunk);
                res.on('end', () => {
                    try {
                        resolve(JSON.parse(body));
                    } catch (e) {
                        resolve({ raw: body, statusCode: res.statusCode });
                    }
                });
            });

            req.on('error', reject);
            req.write(postBody);
            req.end();
        });
    }

    _makeGetRequest(hostname, path, bearerToken) {
        return new Promise((resolve, reject) => {
            const req = https.request({
                hostname,
                port: 443,
                path,
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${bearerToken}`,
                    'Accept': 'application/json'
                }
            }, (res) => {
                let body = '';
                res.on('data', chunk => body += chunk);
                res.on('end', () => {
                    try {
                        resolve(JSON.parse(body));
                    } catch (e) {
                        reject(new Error(`Erro ao ler resposta Google: ${e.message}`));
                    }
                });
            });

            req.on('error', reject);
            req.end();
        });
    }
}

module.exports = new GoogleCalendarService();
