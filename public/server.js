// =========================================================
// CREATOR HUB — Serveur (Express + SQLite)
// =========================================================
// Ce serveur fait 3 choses :
//  1. Sert le site statique (public/)
//  2. Expose une API publique en lecture (GET /api/videos, /api/partners)
//  3. Expose une API protégée en écriture, réservée à l'admin
//     (POST /api/login, POST /api/videos, POST /api/partners)
//
// Les données sont stockées dans un fichier SQLite (data/hub.db),
// donc PERSISTANTES et VISIBLES PAR TOUS LES VISITEURS, contrairement
// à la version précédente (localStorage) qui restait coincée dans un
// seul navigateur.
// =========================================================

const path = require('path');
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Database = require('better-sqlite3');

const PORT = process.env.PORT || 3000;

// -- Secret JWT : en prod, DOIT être défini en variable d'environnement Railway.
// Si absent, on en génère un aléatoire au démarrage (les sessions admin
// seront alors invalidées à chaque redéploiement — acceptable en dev,
// PAS en production).
const JWT_SECRET = process.env.JWT_SECRET || require('crypto').randomBytes(32).toString('hex');

const app = express();
app.use(cors());
app.use(express.json({ limit: '6mb' })); // 6mb pour laisser passer les photos en base64

// ---------------------------------------------------------
// Base de données
// ---------------------------------------------------------
const db = new Database(path.join(__dirname, 'data', 'hub.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS admin (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    password_hash TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS videos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    position INTEGER NOT NULL,
    platform TEXT NOT NULL,
    title TEXT NOT NULL,
    meta TEXT,
    thumb TEXT
  );

  CREATE TABLE IF NOT EXISTS partners (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    position INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    link TEXT,
    button_label TEXT,
    photo TEXT
  );
`);

// -- Mot de passe admin par défaut au tout premier démarrage.
// ⚠️ Change-le tout de suite après le premier déploiement (voir README,
// section "Changer le mot de passe admin").
const DEFAULT_ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'change-moi-2026';

const existingAdmin = db.prepare('SELECT * FROM admin WHERE id = 1').get();
if (!existingAdmin) {
  const hash = bcrypt.hashSync(DEFAULT_ADMIN_PASSWORD, 10);
  db.prepare('INSERT INTO admin (id, password_hash) VALUES (1, ?)').run(hash);
  console.log('✔ Mot de passe admin initialisé (voir variable ADMIN_PASSWORD ou valeur par défaut).');
}

// -- Vidéos par défaut si la table est vide
const videoCount = db.prepare('SELECT COUNT(*) AS c FROM videos').get().c;
if (videoCount === 0) {
  const insert = db.prepare('INSERT INTO videos (position, platform, title, meta, thumb) VALUES (?, ?, ?, ?, ?)');
  insert.run(0, 'YouTube', "[Titre de ta dernière vidéo]", 'Il y a 2 jours • 45K vues', '');
  insert.run(1, 'Twitch', '[Meilleur moment du dernier live]', 'Rediffusion • 3h12', '');
  insert.run(2, 'TikTok', '[Clip / short viral]', 'Il y a 5 jours • 890K vues', '');
}

// ---------------------------------------------------------
// Auth : middleware qui vérifie le token admin
// ---------------------------------------------------------
function requireAdmin(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Non authentifié.' });
  try {
    jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Session invalide ou expirée.' });
  }
}

// ---------------------------------------------------------
// Routes API
// ---------------------------------------------------------

// Connexion admin
app.post('/api/login', (req, res) => {
  const { password } = req.body || {};
  if (!password) return res.status(400).json({ error: 'Mot de passe requis.' });

  const admin = db.prepare('SELECT * FROM admin WHERE id = 1').get();
  const ok = admin && bcrypt.compareSync(password, admin.password_hash);
  if (!ok) return res.status(401).json({ error: 'Mot de passe incorrect.' });

  const token = jwt.sign({ role: 'admin' }, JWT_SECRET, { expiresIn: '12h' });
  res.json({ token });
});

// Changer le mot de passe admin (protégé)
app.post('/api/change-password', requireAdmin, (req, res) => {
  const { newPassword } = req.body || {};
  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: 'Le nouveau mot de passe doit faire au moins 6 caractères.' });
  }
  const hash = bcrypt.hashSync(newPassword, 10);
  db.prepare('UPDATE admin SET password_hash = ? WHERE id = 1').run(hash);
  res.json({ ok: true });
});

// Lecture publique des vidéos (tout le monde)
app.get('/api/videos', (req, res) => {
  const rows = db.prepare('SELECT platform, title, meta, thumb FROM videos ORDER BY position ASC').all();
  res.json(rows);
});

// Écriture des vidéos (admin uniquement) — remplace toute la liste
app.post('/api/videos', requireAdmin, (req, res) => {
  const videos = Array.isArray(req.body) ? req.body : [];
  const del = db.prepare('DELETE FROM videos');
  const insert = db.prepare('INSERT INTO videos (position, platform, title, meta, thumb) VALUES (?, ?, ?, ?, ?)');
  const tx = db.transaction((items) => {
    del.run();
    items.forEach((v, i) => {
      insert.run(i, String(v.platform || 'YouTube'), String(v.title || 'Sans titre'), String(v.meta || ''), String(v.thumb || ''));
    });
  });
  tx(videos);
  res.json({ ok: true });
});

// Lecture publique des partenariats (tout le monde)
app.get('/api/partners', (req, res) => {
  const rows = db.prepare('SELECT name, description, link, button_label AS buttonLabel, photo FROM partners ORDER BY position ASC').all();
  res.json(rows);
});

// Écriture des partenariats (admin uniquement) — remplace toute la liste
app.post('/api/partners', requireAdmin, (req, res) => {
  const partners = Array.isArray(req.body) ? req.body : [];
  const del = db.prepare('DELETE FROM partners');
  const insert = db.prepare('INSERT INTO partners (position, name, description, link, button_label, photo) VALUES (?, ?, ?, ?, ?, ?)');
  const tx = db.transaction((items) => {
    del.run();
    items.forEach((p, i) => {
      insert.run(i, String(p.name || 'Partenaire'), String(p.description || ''), String(p.link || ''), String(p.buttonLabel || 'Découvrir'), String(p.photo || ''));
    });
  });
  tx(partners);
  res.json({ ok: true });
});

// ---------------------------------------------------------
// Fichiers statiques (le site lui-même)
// ---------------------------------------------------------
app.use(express.static(path.join(__dirname, 'public')));

app.listen(PORT, () => {
  console.log(`✔ Creator Hub en ligne sur le port ${PORT}`);
});
