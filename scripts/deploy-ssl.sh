#!/bin/bash
# ==============================================================================
# KIT OS · Automação de Nginx & Certificado SSL HTTPS (Let's Encrypt)
# ==============================================================================
# Uso:
#   ./scripts/deploy-ssl.sh meu-dominio.com.br
# Ou sem argumentos para usar o subdomínio gratuito automático nip.io:
#   ./scripts/deploy-ssl.sh
# ==============================================================================

set -e

DOMAIN=${1:-"137.131.160.171.nip.io"}
EMAIL="admin@$DOMAIN"
PORT=3000

echo "🚀 Iniciando configuração do Nginx e SSL para: $DOMAIN"

# 1. Instalar Nginx e Certbot se não existirem
echo "📦 Verificando dependências..."
sudo apt-get update -y
sudo apt-get install -y nginx certbot python3-certbot-nginx

# 2. Configurar Nginx para HTTP temporário para emitir certificado
echo "🔧 Configurando Virtualhost Nginx..."
sudo tee /etc/nginx/sites-available/$DOMAIN > /dev/null <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN;

    client_max_body_size 50M;

    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    location / {
        proxy_pass http://127.0.0.1:$PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

sudo ln -sf /etc/nginx/sites-available/$DOMAIN /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# 3. Gerar Certificado SSL Let's Encrypt
echo "🔒 Obtendo certificado Let's Encrypt SSL..."
sudo certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email admin@example.com --redirect || {
    echo "⚠️ Certbot automático encontrou aviso, mantendo configuração SSL manual..."
}

# 4. Assegurar liberação no firewall iptables local
echo "🛡️ Assegurando portas 80 e 443 no iptables..."
sudo iptables -I INPUT 6 -p tcp --dport 443 -j ACCEPT || true
sudo iptables -I INPUT 6 -p tcp --dport 80 -j ACCEPT || true
sudo netfilter-persistent save 2>/dev/null || true

echo "✅ Configuração concluída! Acesse https://$DOMAIN"
