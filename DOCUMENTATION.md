# 📚 Documentation - MTG Commander App

## Table des matières

1. [Présentation générale](#présentation-générale)
2. [Architecture du projet](#architecture-du-projet)
3. [Technologies utilisées](#technologies-utilisées)
4. [Base de données](#base-de-données)
5. [Composants React](#composants-react)
6. [Hooks personnalisés](#hooks-personnalisés)
7. [Services](#services)
8. [Fonctionnalités principales](#fonctionnalités-principales)
9. [APIs externes](#apis-externes)
10. [Mode hors-ligne](#mode-hors-ligne)
11. [Guide d'installation](#guide-dinstallation)

---

## Présentation générale

**MTG Commander App** est une application web React permettant de gérer sa collection de cartes Magic: The Gathering et de construire des decks au format Commander (EDH).

### Fonctionnalités principales

- ✅ Gestion de collection de cartes avec recherche Scryfall
- ✅ Création et gestion de decks Commander
- ✅ Calcul automatique du bracket (niveau de puissance)
- ✅ Détection des "Game Changers" (cartes puissantes)
- ✅ Suggestions EDHREC pour améliorer les decks
- ✅ Mode hors-ligne avec synchronisation automatique
- ✅ Export de decks (format Moxfield/Archidekt)
- ✅ Courbe de mana et statistiques visuelles

---

## Architecture du projet

```
src/
├── App.jsx                 # Composant racine, routage et état global
├── main.jsx               # Point d'entrée React
├── index.css              # Styles CSS globaux
│
├── components/            # Composants React UI
│   ├── index.js           # Export centralisé des composants
│   ├── Auth.jsx           # Page de connexion/inscription
│   ├── Header.jsx         # Barre de navigation
│   ├── CardTable.jsx      # Tableau de la collection
│   ├── DeckList.jsx       # Liste des decks (grille avec cartes visuelles)
│   ├── DeckView.jsx       # Vue détaillée d'un deck
│   ├── AddCardModal.jsx   # Modal d'ajout de carte
│   ├── EditCardModal.jsx  # Modal de modification de carte
│   ├── AddDeckModal.jsx   # Modal de création de deck
│   ├── ManaCost.jsx       # Affichage des symboles de mana
│   └── FlagIcon.jsx       # Drapeaux de langue (SVG)
│
├── hooks/                 # Hooks React personnalisés
│   ├── index.js           # Export centralisé des hooks
│   ├── useAuth.js         # Gestion de l'authentification
│   ├── useCards.js        # CRUD collection + mode hors-ligne
│   ├── useDecks.js        # CRUD des decks
│   ├── useDeckCards.js    # Gestion des cartes dans un deck
│   └── useExtensions.js   # Liste des extensions MTG
│
└── services/              # Services et utilitaires
    ├── supabase.js        # Client Supabase (BDD + Auth)
    ├── offlineService.js  # Gestion du stockage local (IndexedDB)
    └── edhrecService.js   # Intégration EDHREC + Game Changers
```

---

## Technologies utilisées

| Technologie | Usage |
|-------------|-------|
| **React 18** | Framework UI |
| **Vite** | Build tool et dev server |
| **Supabase** | Backend-as-a-Service (PostgreSQL + Auth) |
| **IndexedDB** | Stockage local pour mode hors-ligne |
| **Tailwind CSS** | Utilitaires CSS (+ styles inline) |
| **Lucide React** | Icônes SVG |
| **mana-font** | Symboles de mana MTG |

### APIs externes

- **Scryfall API** : Recherche de cartes, images, données
- **EDHREC** (simulation) : Suggestions et staples pour Commander

---

## Base de données

### Schéma Supabase (PostgreSQL)

#### Table `cartes` - Collection de l'utilisateur
```sql
CREATE TABLE cartes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  nom TEXT NOT NULL,                    -- Nom de la carte
  cout_mana TEXT,                       -- Ex: "{2}{W}{U}"
  type TEXT,                            -- Ex: "Creature — Human Wizard"
  couleur TEXT,                         -- Ex: "WU", "B", "WUBRG"
  extension TEXT,                       -- Code extension (ex: "MKM")
  exemplaires INTEGER DEFAULT 1,        -- Nombre de copies
  foil BOOLEAN DEFAULT false,           -- Version foil ?
  langue TEXT DEFAULT 'FR',             -- FR, EN, DE, ES...
  scryfall_id TEXT,                     -- ID Scryfall pour référence
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### Table `decks` - Decks Commander
```sql
CREATE TABLE decks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  nom TEXT NOT NULL,                    -- Nom du deck
  commander TEXT,                       -- Nom du commandant
  couleurs TEXT,                        -- Identité couleur (ex: "RG")
  bracket INTEGER,                      -- Niveau de puissance (1-5)
  notes TEXT,                           -- Notes personnelles
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### Table `deck_cards` - Cartes dans les decks
```sql
CREATE TABLE deck_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deck_id UUID REFERENCES decks(id) ON DELETE CASCADE,
  card_id UUID REFERENCES cartes(id),   -- NULL si pas en collection
  card_name TEXT NOT NULL,              -- Nom de la carte
  card_data JSONB,                      -- Données Scryfall complètes
  quantite INTEGER DEFAULT 1,           -- Nombre (1 sauf terrains de base)
  statut TEXT DEFAULT 'a_acheter',      -- 'en_collection' ou 'a_acheter'
  is_commander BOOLEAN DEFAULT false,   -- Est-ce le commandant ?
  categorie TEXT,                       -- Catégorie manuelle
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### Table `extensions` - Liste des extensions MTG
```sql
CREATE TABLE extensions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,            -- Code (ex: "MKM")
  nom TEXT NOT NULL,                    -- Nom complet
  date_sortie DATE,
  icone_url TEXT                        -- URL du symbole
);
```

### Politiques RLS (Row Level Security)

Chaque table a des politiques pour que les utilisateurs ne voient que leurs propres données :

```sql
-- Exemple pour la table cartes
ALTER TABLE cartes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own cards" ON cartes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own cards" ON cartes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own cards" ON cartes
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own cards" ON cartes
  FOR DELETE USING (auth.uid() = user_id);
```

---

## Composants React

### App.jsx
**Rôle** : Composant racine, gère l'état global et le routage

```jsx
// États principaux :
// - view : 'collection' | 'decks' (navigation)
// - selectedDeck : deck actuellement ouvert
// - showAddCard, showEditCard, showAddDeck : modals

// Flux de données :
// App → Header (navigation)
// App → CardTable (affichage collection)
// App → DeckList → DeckView (gestion decks)
```

### Header.jsx
**Rôle** : Barre de navigation fixe

- Logo + titre
- Boutons Collection / Decks
- Indicateur de connexion (en ligne / hors-ligne)
- Bouton de déconnexion

### CardTable.jsx
**Rôle** : Affiche la collection sous forme de tableau

| Colonne | Description |
|---------|-------------|
| Nom | Nom de la carte |
| Coût | Symboles de mana (via ManaCost) |
| Extension | Logo SVG Scryfall |
| Langue | Drapeau (via FlagIcon) |
| Quantité | Badge numérique |
| Foil | ✨ ou — |
| Actions | Modifier / Supprimer |

### DeckList.jsx
**Rôle** : Grille de cartes visuelles pour chaque deck

**Caractéristiques** :
- Image du commandant en arrière-plan (API Scryfall)
- Overlay gradient pour lisibilité
- Pastilles de couleur (identité de mana)
- Menu contextuel (⋮) avec options

**Options du menu** :
- 🛒 Cartes manquantes : affiche les cartes à acheter
- ✏️ Renommer : change le nom du deck
- 📋 Dupliquer : crée une copie complète
- 📄 Exporter : format Moxfield ou texte simple
- 🗑️ Supprimer : supprime le deck

### DeckView.jsx
**Rôle** : Vue détaillée d'un deck

**Sections** :
1. **Header** : nom, commandant, couleurs, bracket calculé
2. **Statistiques** : total cartes, CMC moyen, complétion
3. **Courbe de mana** : histogramme vertical
4. **Liste par catégorie** : créatures, terrains, etc.
5. **Game Changers** : cartes puissantes détectées

**Actions** :
- Ajouter une carte (recherche Scryfall)
- Suggestions EDHREC
- Changer la vue (catégories / liste / stats)

### ManaCost.jsx
**Rôle** : Affiche les symboles de mana

```jsx
// Entrée : "{2}{W}{U}"
// Sortie : <i class="ms ms-2"/> <i class="ms ms-w"/> <i class="ms ms-u"/>
```

Utilise la bibliothèque `mana-font` pour les icônes.

### FlagIcon.jsx
**Rôle** : Affiche les drapeaux de langue en SVG

Langues supportées : FR, EN, DE, ES, IT, PT, JA, KO, RU, ZH

---

## Hooks personnalisés

### useAuth.js
**Rôle** : Gestion de l'authentification Supabase

```javascript
const { user, loading } = useAuth();
// user : objet utilisateur connecté ou null
// loading : true pendant la vérification
```

**Fonctionnement** :
1. Au montage, vérifie la session existante
2. Écoute les changements d'état (connexion/déconnexion)
3. Retourne l'utilisateur courant

### useCards.js
**Rôle** : CRUD de la collection avec mode hors-ligne

```javascript
const {
  cards,              // Liste des cartes
  addCard,            // Ajouter une carte
  updateCard,         // Modifier une carte
  deleteCard,         // Supprimer une carte
  isOnline,           // État de connexion
  syncing,            // Synchronisation en cours
  pendingCount,       // Nombre d'actions en attente
  syncPendingChanges  // Forcer la synchronisation
} = useCards(userId);
```

**Mode hors-ligne** :
- Les actions sont stockées dans IndexedDB
- Synchronisation automatique au retour en ligne
- Indicateur visuel des cartes non synchronisées

### useDecks.js
**Rôle** : CRUD des decks

```javascript
const { decks, addDeck, deleteDeck } = useDecks(userId);
```

### useDeckCards.js
**Rôle** : Gestion des cartes dans un deck

```javascript
const {
  deckCards,          // Cartes du deck
  loading,            // Chargement en cours
  stats,              // Statistiques calculées
  addCardToDeck,      // Ajouter une carte
  removeCardFromDeck, // Retirer une carte
  updateQuantity      // Modifier la quantité (terrains de base)
} = useDeckCards(deckId);
```

**Statistiques calculées** :
- `totalCards` : nombre total de cartes
- `averageCMC` : coût de mana moyen
- `manaCurve` : répartition par coût (0-7+)
- `typeDistribution` : répartition par type
- `completionStatus` : cartes en collection vs à acheter

### useExtensions.js
**Rôle** : Charge la liste des extensions MTG

```javascript
const { extensions } = useExtensions();
// [{ code: 'MKM', nom: 'Murders at Karlov Manor', ... }]
```

---

## Services

### supabase.js
**Rôle** : Client Supabase configuré

```javascript
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);
```

### offlineService.js
**Rôle** : Gestion du stockage IndexedDB pour le mode hors-ligne

**Fonctions principales** :

| Fonction | Description |
|----------|-------------|
| `initDB()` | Initialise la base IndexedDB |
| `saveCards(cards)` | Sauvegarde les cartes localement |
| `getCards()` | Récupère les cartes locales |
| `addPendingAction(action)` | Ajoute une action en attente |
| `getPendingActions()` | Récupère les actions à synchroniser |
| `clearPendingActions()` | Vide les actions après sync |

**Structure des actions en attente** :
```javascript
{
  id: 'uuid',
  type: 'add' | 'update' | 'delete',
  data: { /* données de la carte */ },
  timestamp: 1234567890
}
```

### edhrecService.js
**Rôle** : Intégration EDHREC et détection des Game Changers

**Fonctions principales** :

#### `countGameChangers(deckCards)`
Compte les cartes "Game Changer" dans le deck.

**Liste des Game Changers** (extraite de la règle officielle Commander) :
- Tuteurs : Demonic Tutor, Vampiric Tutor, Mystical Tutor...
- Mana rapide : Mana Crypt, Sol Ring (fast mana)
- Combos : Thassa's Oracle, Dockside Extortionist...
- Stax : Winter Orb, Static Orb...

#### `calculateBracket(gameChangerCount)`
Calcule le bracket (niveau de puissance) :

| Game Changers | Bracket | Nom |
|---------------|---------|-----|
| 0 | 1 | Exhibition |
| 1-2 | 2 | Core |
| 3-5 | 3 | Upgraded |
| 6-9 | 4 | Optimized |
| 10+ | 5 | cEDH |

#### `getRecommendations(commanderName)`
Récupère les suggestions EDHREC pour un commandant.

Retourne :
- `staples` : cartes présentes dans 50%+ des decks
- `highSynergy` : cartes avec forte synergie
- `budget` : alternatives économiques

#### `analyzeDeck(deckCards, recommendations)`
Compare le deck aux recommandations :
- `missing` : staples absentes du deck
- `toConsider` : cartes synergiques à considérer

---

## Fonctionnalités principales

### 1. Gestion de la collection

**Ajouter une carte** :
1. Clic sur "Ajouter"
2. Recherche par nom (API Scryfall)
3. Sélection de l'extension
4. Configuration : quantité, langue, foil
5. Sauvegarde (BDD ou local si hors-ligne)

**Modifier une carte** :
1. Clic sur l'icône ✏️
2. Modification des champs
3. Sauvegarde

**Supprimer une carte** :
1. Clic sur l'icône 🗑️
2. Confirmation
3. Suppression (avec marquage si hors-ligne)

### 2. Gestion des decks

**Créer un deck** :
1. Clic sur "Nouveau Deck"
2. Recherche du commandant (Scryfall, filtre legendary creature)
3. Nom du deck, notes optionnelles
4. Création

**Ajouter des cartes au deck** :
1. Ouvrir le deck
2. Clic sur "Ajouter"
3. Recherche (filtrée par identité de couleur)
4. Ajout (vérifie si en collection)

**Statut des cartes** :
- 🟢 `en_collection` : carte possédée
- 🟠 `a_acheter` : carte à acheter

### 3. Calcul du bracket

Le bracket est calculé automatiquement selon les Game Changers :

```javascript
// Exemple de calcul
const gameChangers = ['Demonic Tutor', 'Mana Crypt', 'Rhystic Study'];
const count = 3;
const bracket = calculateBracket(count); // 3 = "Upgraded"
```

### 4. Export de deck

**Format Moxfield/Archidekt** :
```
// Commander
1 Xenagos, God of Revels

// Deck
1 Cultivate
1 Kodama's Reach
10 Forest
8 Mountain
...
```

**Format simple** :
```
1x Xenagos, God of Revels
1x Cultivate
1x Kodama's Reach
10x Forest
8x Mountain
...
```

---

## APIs externes

### Scryfall API

**Base URL** : `https://api.scryfall.com`

**Endpoints utilisés** :

| Endpoint | Usage |
|----------|-------|
| `/cards/search?q={query}` | Recherche de cartes |
| `/cards/named?exact={name}` | Carte par nom exact |
| `/cards/named?exact={name}&format=image&version=art_crop` | Image artwork |

**Exemple de recherche** :
```javascript
const response = await fetch(
  `https://api.scryfall.com/cards/search?q=name:${query}+commander:${colors}`
);
const data = await response.json();
// data.data = tableau de cartes
```

**Symboles d'extension** :
```
https://svgs.scryfall.io/sets/{code}.svg
// Ex: https://svgs.scryfall.io/sets/mkm.svg
```

### EDHREC (simulé)

L'intégration EDHREC est actuellement simulée car l'API n'est pas publique.
Les données sont approximées à partir de listes connues.

---

## Mode hors-ligne

### Fonctionnement

1. **Détection** : `navigator.onLine` + événements `online`/`offline`
2. **Stockage** : IndexedDB via `offlineService.js`
3. **Actions en attente** : File d'attente de modifications

### Flux de données

```
[Action utilisateur]
       ↓
  [En ligne ?]
    ↓ OUI → Supabase direct
    ↓ NON → IndexedDB (pending actions)
       ↓
  [Retour en ligne]
       ↓
  [Synchronisation automatique]
       ↓
  [Supabase] + [Clear pending]
```

### Indicateurs visuels

- **Barre de statut** : orange si actions en attente
- **Icône carte** : ☁️ sur les cartes non synchronisées
- **Header** : "En ligne" (vert) / "Hors-ligne" (orange)

---

## Guide d'installation

### Prérequis

- Node.js 18+
- npm ou yarn
- Compte Supabase

### Installation

```bash
# Cloner le projet
git clone <repo-url>
cd mtg-app

# Installer les dépendances
npm install

# Configurer les variables d'environnement
cp .env.example .env
# Éditer .env avec vos clés Supabase

# Lancer en développement
npm run dev
```

### Variables d'environnement

```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJxxxxx...
```

### Build de production

```bash
npm run build
# Les fichiers sont dans dist/
```

---

## Évolutions possibles

- [ ] Scan de cartes par photo (OCR)
- [ ] Prix des cartes (API CardMarket/TCGPlayer)
- [ ] Historique des prix
- [ ] Partage de decks publics
- [ ] Statistiques avancées (mana curve idéale, etc.)
- [ ] Mode multi-utilisateur (prêts de cartes)
- [ ] Import depuis Moxfield/Archidekt
- [ ] PWA complète (installation mobile)

---

*Documentation générée le 04/12/2024*
