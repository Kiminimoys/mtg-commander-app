# Génération des icônes PNG pour la PWA

Pour générer les icônes PNG à partir du SVG, tu as plusieurs options :

## Option 1 : En ligne (le plus simple)
1. Va sur https://realfavicongenerator.net/
2. Upload le fichier `public/icons/icon.svg`
3. Télécharge le pack d'icônes généré
4. Place les fichiers dans `public/icons/`

## Option 2 : Avec ImageMagick (si installé)
```bash
cd public/icons
for size in 72 96 128 144 152 192 384 512; do
  convert -background none -resize ${size}x${size} icon.svg icon-${size}.png
done
```

## Option 3 : Avec Sharp (Node.js)
```bash
npm install sharp --save-dev
node generate-icons.js
```

## Option 4 : Icônes temporaires
En attendant, le SVG sera utilisé comme fallback.
L'app fonctionnera quand même, juste avec une icône moins nette sur certains appareils.

---

## Tailles nécessaires :
- icon-72.png
- icon-96.png  
- icon-128.png
- icon-144.png
- icon-152.png
- icon-192.png (obligatoire pour Android)
- icon-384.png
- icon-512.png (obligatoire pour splash screen)
