#!/bin/bash
# Script pour créer des certificats SSL auto-signés pour le développement local
# Nécessite OpenSSL installé

# Créer le dossier certs s'il n'existe pas
mkdir -p certs

# Générer la clé privée et le certificat
openssl req -x509 -newkey rsa:4096 -keyout certs/key.pem -out certs/cert.pem -days 365 -nodes -subj "/CN=localhost" -addext "subjectAltName=DNS:localhost,IP:127.0.0.1,IP:192.168.1.1"

echo ""
echo "✅ Certificats créés dans le dossier 'certs/'"
echo ""
echo "⚠️  IMPORTANT: Lors de la première connexion HTTPS, ton navigateur affichera"
echo "   un avertissement de sécurité. C'est normal pour un certificat auto-signé."
echo "   Clique sur 'Avancé' puis 'Continuer vers le site'."
echo ""
echo "🚀 Lance maintenant: npm run dev"
echo "   Puis accède à: https://TON_IP_LOCALE:5173"
