# 🎮 Commander Toolkit - Installation PWA

## Prérequis
- Node.js installé
- OpenSSL installé (pour HTTPS)

---

## 📱 Installation en 4 étapes

### 1. Générer les certificats HTTPS (une seule fois)

**Windows (PowerShell en admin) :**
```powershell
# Installer OpenSSL si pas déjà fait (avec Chocolatey)
choco install openssl

# Puis dans le dossier du projet
mkdir certs
openssl req -x509 -newkey rsa:4096 -keyout certs/key.pem -out certs/cert.pem -days 365 -nodes -subj "/CN=localhost"
```

**Mac/Linux :**
```bash
chmod +x create-certs.sh
./create-certs.sh
```

### 2. Générer les icônes PNG

Va sur https://realfavicongenerator.net/ :
1. Upload `public/icons/icon.svg`
2. Télécharge le pack
3. Renomme et place les icônes dans `public/icons/` :
   - icon-192.png
   - icon-512.png
   - (et les autres tailles si disponibles)

### 3. Lancer l'application

```bash
npm install
npm run dev
```

Tu verras quelque chose comme :
```
  ➜  Local:   https://localhost:5173/
  ➜  Network: https://192.168.1.XX:5173/
```

### 4. Installer sur ton téléphone

**Android (Chrome) :**
1. Ouvre `https://192.168.1.XX:5173` sur ton téléphone
2. Accepte l'avertissement de sécurité (certificat auto-signé)
3. Menu ⋮ → "Installer l'application" ou "Ajouter à l'écran d'accueil"

**iPhone (Safari) :**
1. Ouvre `https://192.168.1.XX:5173`
2. Accepte l'avertissement de sécurité
3. Bouton partage (carré avec flèche) → "Sur l'écran d'accueil"

---

## 🔧 Dépannage

### Le scanner ne fonctionne pas
- Vérifie que tu utilises bien HTTPS (pas HTTP)
- Accepte les permissions caméra quand demandé
- Sur iOS, seul Safari supporte l'accès caméra pour les PWA

### L'app ne s'installe pas
- Vérifie que tu es bien en HTTPS
- Vérifie que le manifest.json est accessible (`https://ton-ip:5173/manifest.json`)

### Certificat non accepté
- Sur Android : Paramètres → Sécurité → Installer depuis stockage
- Sur iOS : Paramètres → Général → Profils

---

## 🌐 Hébergement gratuit (optionnel)

Si tu veux accéder à l'app depuis n'importe où (pas que ton WiFi) :

### Vercel (recommandé)
```bash
npm install -g vercel
vercel
```

### Netlify
```bash
npm install -g netlify-cli
npm run build
netlify deploy --prod --dir=dist
```

Ces services fournissent HTTPS automatiquement !

---

## 📁 Structure des fichiers PWA

```
public/
├── manifest.json      # Config PWA
├── sw.js              # Service Worker
└── icons/
    ├── icon.svg       # Icône source
    ├── icon-192.png   # Icône Android
    └── icon-512.png   # Splash screen
```
