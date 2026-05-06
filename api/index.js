/**
 * ============================================================================
 * API MTG COMMANDER TOOLKIT - Serveur Express
 * ============================================================================
 * 
 * Endpoints disponibles :
 * 
 * AUTH:
 *   POST /auth/register - Créer un compte
 *   POST /auth/login    - Se connecter
 * 
 * CARDS (collection):
 *   GET    /cards       - Liste des cartes
 *   POST   /cards       - Ajouter une carte
 *   PUT    /cards/:id   - Modifier une carte
 *   DELETE /cards/:id   - Supprimer une carte
 * 
 * DECKS:
 *   GET    /decks              - Liste des decks
 *   POST   /decks              - Créer un deck
 *   PUT    /decks/:id          - Modifier un deck (renommer)
 *   DELETE /decks/:id          - Supprimer un deck
 *   POST   /decks/:id/duplicate - Dupliquer un deck
 * 
 * DECK CARDS:
 *   GET    /decks/:deckId/cards     - Cartes d'un deck
 *   POST   /decks/:deckId/cards     - Ajouter carte au deck
 *   PUT    /decks/:deckId/cards/:id - Modifier carte du deck
 *   DELETE /decks/:deckId/cards/:id - Supprimer carte du deck
 */

const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Connexion PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Test connexion BDD au démarrage
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Erreur connexion PostgreSQL:', err.message);
  } else {
    console.log('✅ PostgreSQL connecté');
  }
});

// ============================================================================
// MIDDLEWARE AUTH
// ============================================================================
const auth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token manquant' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Token invalide' });
  }
};

// ============================================================================
// AUTH ROUTES
// ============================================================================

// Inscription
app.post('/auth/register', async (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ error: 'Email et mot de passe requis' });
  }
  
  try {
    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (email, password) VALUES ($1, $2) RETURNING id, email',
      [email, hash]
    );
    const token = jwt.sign({ id: result.rows[0].id }, process.env.JWT_SECRET);
    res.json({ user: result.rows[0], token });
  } catch (e) {
    console.error('Erreur register:', e.message);
    res.status(400).json({ error: 'Email déjà utilisé' });
  }
});

// Connexion
app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ error: 'Email et mot de passe requis' });
  }
  
  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (!result.rows[0]) {
      return res.status(400).json({ error: 'Utilisateur non trouvé' });
    }
    
    const valid = await bcrypt.compare(password, result.rows[0].password);
    if (!valid) {
      return res.status(400).json({ error: 'Mot de passe incorrect' });
    }
    
    const token = jwt.sign({ id: result.rows[0].id }, process.env.JWT_SECRET);
    res.json({ user: { id: result.rows[0].id, email: result.rows[0].email }, token });
  } catch (e) {
    console.error('Erreur login:', e.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ============================================================================
// CARDS ROUTES (Collection)
// ============================================================================

// Liste des cartes
app.get('/cards', auth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM cards WHERE user_id = $1 ORDER BY nom',
      [req.user.id]
    );
    res.json(result.rows);
  } catch (e) {
    console.error('Erreur GET cards:', e.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Ajouter une carte
app.post('/cards', auth, async (req, res) => {
  const { nom, nom_fr, couleur, type, cout_mana, extension, foil, exemplaires, langue, scryfall_id, prix_eur } = req.body;
  
  try {
    const result = await pool.query(
      `INSERT INTO cards (user_id, nom, nom_fr, couleur, type, cout_mana, extension, foil, exemplaires, langue, scryfall_id, prix_eur, statut)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'in_collection') RETURNING *`,
      [req.user.id, nom, nom_fr, couleur, type, cout_mana, extension, foil || false, exemplaires || 1, langue || 'en', scryfall_id, prix_eur]
    );
    res.json(result.rows[0]);
  } catch (e) {
    console.error('Erreur POST cards:', e.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Modifier une carte
app.put('/cards/:id', auth, async (req, res) => {
  const { extension, exemplaires, foil, langue } = req.body;
  
  try {
    const result = await pool.query(
      'UPDATE cards SET extension=$1, exemplaires=$2, foil=$3, langue=$4 WHERE id=$5 AND user_id=$6 RETURNING *',
      [extension, exemplaires, foil, langue, req.params.id, req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Carte non trouvée' });
    }
    res.json(result.rows[0]);
  } catch (e) {
    console.error('Erreur PUT cards:', e.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Supprimer une carte
app.delete('/cards/:id', auth, async (req, res) => {
  try {
    await pool.query('DELETE FROM cards WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    res.json({ success: true });
  } catch (e) {
    console.error('Erreur DELETE cards:', e.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ============================================================================
// DECKS ROUTES
// ============================================================================

// Liste des decks
app.get('/decks', auth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM decks WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json(result.rows);
  } catch (e) {
    console.error('Erreur GET decks:', e.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Créer un deck
app.post('/decks', auth, async (req, res) => {
  const { nom, commander, couleurs } = req.body;
  
  try {
    const result = await pool.query(
      'INSERT INTO decks (user_id, nom, commander, couleurs) VALUES ($1,$2,$3,$4) RETURNING *',
      [req.user.id, nom, commander, couleurs]
    );
    res.json(result.rows[0]);
  } catch (e) {
    console.error('Erreur POST decks:', e.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Modifier un deck (renommer, etc.)
app.put('/decks/:id', auth, async (req, res) => {
  const { nom, commander, couleurs, bracket, notes } = req.body;
  
  try {
    // Construire la requête dynamiquement selon les champs fournis
    const updates = [];
    const values = [];
    let paramCount = 1;
    
    if (nom !== undefined) {
      updates.push(`nom = $${paramCount++}`);
      values.push(nom);
    }
    if (commander !== undefined) {
      updates.push(`commander = $${paramCount++}`);
      values.push(commander);
    }
    if (couleurs !== undefined) {
      updates.push(`couleurs = $${paramCount++}`);
      values.push(couleurs);
    }
    if (bracket !== undefined) {
      updates.push(`bracket = $${paramCount++}`);
      values.push(bracket);
    }
    if (notes !== undefined) {
      updates.push(`notes = $${paramCount++}`);
      values.push(notes);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'Aucun champ à mettre à jour' });
    }
    
    values.push(req.params.id, req.user.id);
    
    const result = await pool.query(
      `UPDATE decks SET ${updates.join(', ')} WHERE id = $${paramCount++} AND user_id = $${paramCount} RETURNING *`,
      values
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Deck non trouvé' });
    }
    res.json(result.rows[0]);
  } catch (e) {
    console.error('Erreur PUT decks:', e.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Supprimer un deck (et ses cartes)
app.delete('/decks/:id', auth, async (req, res) => {
  try {
    // Supprimer d'abord les cartes du deck
    await pool.query('DELETE FROM deck_cards WHERE deck_id = $1', [req.params.id]);
    // Puis le deck
    await pool.query('DELETE FROM decks WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    res.json({ success: true });
  } catch (e) {
    console.error('Erreur DELETE decks:', e.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Dupliquer un deck
app.post('/decks/:id/duplicate', auth, async (req, res) => {
  try {
    // Récupérer le deck original
    const deckResult = await pool.query(
      'SELECT * FROM decks WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    
    if (deckResult.rows.length === 0) {
      return res.status(404).json({ error: 'Deck non trouvé' });
    }
    
    const originalDeck = deckResult.rows[0];

    // Créer la copie du deck
    const newDeckResult = await pool.query(
      'INSERT INTO decks (user_id, nom, commander, couleurs) VALUES ($1, $2, $3, $4) RETURNING *',
      [req.user.id, `${originalDeck.nom} (copie)`, originalDeck.commander, originalDeck.couleurs]
    );
    const newDeck = newDeckResult.rows[0];

    // Copier les cartes
    const cardsResult = await pool.query(
      'SELECT * FROM deck_cards WHERE deck_id = $1',
      [req.params.id]
    );
    
    for (const card of cardsResult.rows) {
      await pool.query(
        `INSERT INTO deck_cards (deck_id, card_id, card_name, card_name_fr, card_data, quantite, statut, is_commander, categorie)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [newDeck.id, card.card_id, card.card_name, card.card_name_fr, card.card_data, card.quantite, card.statut, card.is_commander, card.categorie]
      );
    }

    res.json(newDeck);
  } catch (e) {
    console.error('Erreur duplication:', e.message);
    res.status(500).json({ error: 'Erreur lors de la duplication' });
  }
});

// ============================================================================
// DECK CARDS ROUTES
// ============================================================================

// Liste des cartes d'un deck
app.get('/decks/:deckId/cards', auth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM deck_cards WHERE deck_id = $1 ORDER BY card_name',
      [req.params.deckId]
    );
    res.json(result.rows);
  } catch (e) {
    console.error('Erreur GET deck_cards:', e.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Ajouter une carte au deck
app.post('/decks/:deckId/cards', auth, async (req, res) => {
  const { card_id, card_name, card_name_fr, card_data, quantite, statut, is_commander, categorie } = req.body;
  
  try {
    const result = await pool.query(
      `INSERT INTO deck_cards (deck_id, card_id, card_name, card_name_fr, card_data, quantite, statut, is_commander, categorie)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [req.params.deckId, card_id || null, card_name, card_name_fr, card_data, quantite || 1, statut || 'a_acheter', is_commander || false, categorie]
    );
    res.json(result.rows[0]);
  } catch (e) {
    console.error('Erreur POST deck_cards:', e.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Modifier une carte du deck
app.put('/decks/:deckId/cards/:id', auth, async (req, res) => {
  const { quantite, statut, categorie, card_id, is_commander, is_game_changer } = req.body;
  
  try {
    // Construire la requête dynamiquement
    const updates = [];
    const values = [];
    let paramCount = 1;
    
    if (quantite !== undefined) {
      updates.push(`quantite = $${paramCount++}`);
      values.push(quantite);
    }
    if (statut !== undefined) {
      updates.push(`statut = $${paramCount++}`);
      values.push(statut);
    }
    if (categorie !== undefined) {
      updates.push(`categorie = $${paramCount++}`);
      values.push(categorie);
    }
    if (card_id !== undefined) {
      updates.push(`card_id = $${paramCount++}`);
      values.push(card_id);
    }
    if (is_commander !== undefined) {
      updates.push(`is_commander = $${paramCount++}`);
      values.push(is_commander);
    }
    if (is_game_changer !== undefined) {
      updates.push(`is_game_changer = $${paramCount++}`);
      values.push(is_game_changer);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'Aucun champ à mettre à jour' });
    }
    
    values.push(req.params.id);
    
    const result = await pool.query(
      `UPDATE deck_cards SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Carte non trouvée' });
    }
    res.json(result.rows[0]);
  } catch (e) {
    console.error('Erreur PUT deck_cards:', e.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Supprimer une carte du deck
app.delete('/decks/:deckId/cards/:id', auth, async (req, res) => {
  try {
    await pool.query('DELETE FROM deck_cards WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (e) {
    console.error('Erreur DELETE deck_cards:', e.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ============================================================================
// START SERVER
// ============================================================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 API MTG running on port ${PORT}`);
});
