/**
 * KIT OS · WEB PUSH NOTIFICATION SERVICE (W3C PUSH API)
 * Envio nativo de notificações push para smartphones (iOS 16.4+ PWA / Android)
 * com chaves VAPID criptografadas, auto-limpeza de tokens expirados e zero custo (R$ 0,00).
 */

const webpush = require('web-push');
const dbService = require('./db-service');

class PushService {
    constructor() {
        this.vapidKeys = null;
        this.subject = process.env.VAPID_SUBJECT || 'mailto:admin@meuassessor.com';
        this.initialized = false;
    }

    init() {
        if (this.initialized) return;

        // 1. Tenta carregar credenciais do .env
        let pubKey = process.env.VAPID_PUBLIC_KEY;
        let privKey = process.env.VAPID_PRIVATE_KEY;

        // 2. Se não houver no .env, recupera do SQLite (system_config)
        if (!pubKey || !privKey) {
            const saved = dbService.getSystemConfig('vapid_keys');
            if (saved) {
                try {
                    const parsed = JSON.parse(saved);
                    pubKey = parsed.publicKey;
                    privKey = parsed.privateKey;
                } catch (e) {}
            }
        }

        // 3. Se ainda não existir, gera chaves VAPID criptograficamente seguras e salva no SQLite
        if (!pubKey || !privKey) {
            console.log('[PushService] 🔑 Gerando novo par de chaves VAPID para Web Push...');
            const generated = webpush.generateVAPIDKeys();
            pubKey = generated.publicKey;
            privKey = generated.privateKey;
            dbService.setSystemConfig('vapid_keys', JSON.stringify({
                publicKey: pubKey,
                privateKey: privKey
            }));
        }

        this.vapidKeys = {
            publicKey: pubKey,
            privateKey: privKey
        };

        webpush.setVapidDetails(this.subject, pubKey, privKey);
        this.initialized = true;
        console.log('[PushService] 📲 Serviço de Notificações Push inicializado com sucesso.');
    }

    getPublicKey() {
        this.init();
        return this.vapidKeys?.publicKey;
    }

    getStatus() {
        this.init();
        const subs = dbService.getAllPushSubscriptions();
        return {
            enabled: true,
            hasKeys: !!this.vapidKeys?.publicKey,
            publicKey: this.vapidKeys?.publicKey,
            subscriptionsCount: subs.length
        };
    }

    saveSubscription(subscriptionData, userAgent = '') {
        this.init();
        return dbService.savePushSubscription(subscriptionData, userAgent);
    }

    removeSubscription(endpoint) {
        return dbService.removePushSubscription(endpoint);
    }

    async sendPushToAll(payload = {}) {
        this.init();
        const subs = dbService.getAllPushSubscriptions();
        if (subs.length === 0) {
            return { sent: 0, failed: 0, cleaned: 0 };
        }

        const notificationData = JSON.stringify({
            title: payload.title || 'KIT OS · Seu Assessor',
            body: payload.body || payload.message || 'Nova notificação executiva.',
            icon: payload.icon || '/images/icon-192.png',
            badge: payload.badge || '/images/icon-192.png',
            vibrate: [100, 50, 100],
            tag: payload.tag || ('kit-push-' + Date.now()),
            data: payload.data || { url: '/' }
        });

        let sent = 0;
        let failed = 0;
        let cleaned = 0;

        for (const sub of subs) {
            const pushSubscription = {
                endpoint: sub.endpoint,
                keys: {
                    p256dh: sub.p256dh,
                    auth: sub.auth
                }
            };

            try {
                await webpush.sendNotification(pushSubscription, notificationData);
                sent++;
            } catch (err) {
                failed++;
                // 410 Gone ou 404 Not Found: usuário desinstalou ou revogou permissão no navegador
                if (err.statusCode === 410 || err.statusCode === 404) {
                    console.log(`[PushService] 🧹 Removendo subscription expirada (${err.statusCode}): ${sub.endpoint.substring(0, 35)}...`);
                    dbService.removePushSubscription(sub.endpoint);
                    cleaned++;
                } else {
                    console.warn(`[PushService] Aviso ao enviar push (${err.statusCode}):`, err.message);
                }
            }
        }

        return { sent, failed, cleaned };
    }

    async sendTestNotification() {
        return this.sendPushToAll({
            title: '⚡ KIT OS · Notificações Nativas Ativas!',
            body: 'Tudo pronto! Seus assessores avisarão você sobre contas a vencer, reuniões e orçamentos na tela de bloqueio.',
            data: { url: '/#financas' }
        });
    }
}

const pushService = new PushService();
dbService.setPushService(pushService);
module.exports = pushService;
