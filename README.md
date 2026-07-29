# 🎮 Creator Hub — avec espace admin persistant

Version avec **vrai serveur** (Node.js + Express + SQLite) : quand tu modifies tes vidéos ou tes partenariats depuis l'espace admin, **tout le monde le voit**, immédiatement, sur n'importe quel appareil. C'est la différence avec la version précédente qui stockait tout dans ton navigateur.

## 📁 Structure

```
creator-hub-server/
├── server.js          → le serveur (API + sert le site)
├── package.json        → dépendances (Express, SQLite, JWT...)
├── railway.json         → config de déploiement Railway
├── data/
│   └── hub.db           → la base de données (créée automatiquement au 1er démarrage)
└── public/
    ├── index.html         → structure du site
    ├── style.css           → design (thème rouge / blanc / noir)
    ├── script.js            → interactions + appels à l'API
    └── assets/               → tes images
```

## ⚙️ Comment ça marche

1. Le serveur sert le site (`public/`) **et** une API :
   - `GET /api/videos` et `GET /api/partners` → lecture publique, pour tout le monde
   - `POST /api/login` → connexion admin (mot de passe → jeton de session valable 12h)
   - `POST /api/videos` et `POST /api/partners` → écriture, **réservée à l'admin connecté**
2. Les données sont stockées dans un fichier `data/hub.db` (base SQLite), pas dans le navigateur.
3. Résultat : toi tu te connectes, tu modifies, tu enregistres → **tous les visiteurs voient la mise à jour**.

## 🚀 Déploiement sur Railway

### 1. Pousser le projet sur GitHub

```bash
cd creator-hub-server
git init
git add .
git commit -m "Initial commit — creator hub avec admin persistant"
git branch -M main
git remote add origin https://github.com/TON-USER/TON-REPO.git
git push -u origin main
```

### 2. Créer le projet sur Railway

1. [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo** → sélectionne ton repo.
2. Railway détecte `package.json`, installe les dépendances et lance `node server.js` automatiquement.
3. Va dans **Settings → Networking → Generate Domain** pour avoir ton URL publique.

### 3. ⚠️ Étape OBLIGATOIRE : ajouter un volume persistant

Sans ça, ta base de données (`data/hub.db`) sera **effacée à chaque redéploiement** — tes vidéos et partenariats reviendraient aux valeurs par défaut. Pour l'éviter :

1. Dans ton projet Railway, clique sur ton service → onglet **Settings** → section **Volumes**.
2. Clique **New Volume**.
3. Mount path : `/app/data`
4. Sauvegarde.

Railway va alors garder le contenu de ce dossier entre chaque déploiement, donc ta base survit.

### 4. Variables d'environnement à définir (Settings → Variables)

| Variable | Pourquoi | Exemple |
|---|---|---|
| `ADMIN_PASSWORD` | Le mot de passe admin utilisé **uniquement** au tout premier démarrage (création du compte). Change-le avant le premier déploiement ! | `MonMotDePasseSolide2026!` |
| `JWT_SECRET` | Clé secrète qui signe les sessions admin. Sans elle, une clé aléatoire est générée à chaque redémarrage, ce qui déconnecte tout le monde à chaque redéploiement. Mets une chaîne longue et aléatoire. | `9f8e7d6c5b4a3f2e1d0c...` (32+ caractères) |

Génère une valeur aléatoire pour `JWT_SECRET` par exemple avec :
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## 🔑 Se connecter à l'espace admin

1. Va sur ton site, clique sur le cadenas 🔒 en haut à droite de la navbar.
2. Entre le mot de passe défini dans `ADMIN_PASSWORD` (ou `change-moi-2026` si tu ne l'as pas changé — **à éviter en production**).
3. Tu arrives sur le tableau de bord avec 2 onglets :
   - **Vidéos à la une** : modifie les 3 cartes "Dernières publications" (plateforme, titre, infos, miniature).
   - **Partenariats** : ajoute, modifie ou supprime des partenariats (photo, nom, description, lien, texte du bouton).
4. Clique **Enregistrer** → c'est écrit dans la base de données du serveur → **visible instantanément par tous tes visiteurs**, sur tous les appareils.

Ta session admin dure 12h, puis il faudra te reconnecter (par sécurité).

## 🔒 Sécurité — à faire avant de rendre le site public

- [ ] Change `ADMIN_PASSWORD` dans les variables Railway avant le tout premier déploiement (le mot de passe par défaut `change-moi-2026` ne doit jamais rester en prod).
- [ ] Définis un `JWT_SECRET` fixe et long dans les variables Railway.
- [ ] Ajoute le volume persistant (étape 3 ci-dessus), sinon tu perdras tes données à chaque mise à jour du site.
- [ ] Le site tourne en HTTPS automatiquement sur le domaine Railway — vérifie que tu utilises bien l'URL `https://`.

Si tu as déjà déployé avec le mot de passe par défaut, tu peux le changer après coup en te connectant à l'admin, puis en appelant la route `POST /api/change-password` (protégée) — ou plus simplement en changeant `ADMIN_PASSWORD` et en supprimant `data/hub.db` pour forcer sa recréation (⚠️ ça réinitialise aussi tes vidéos/partenariats).

## ✏️ Personnalisation du contenu statique

Pour le reste du site (pseudo, phrase d'accroche, liens sociaux, à propos, galerie, contact), rien n'a changé : tout se modifie directement dans `public/index.html`, en cherchant les `[TON PSEUDO]`, `href="#"` et autres placeholders. Seules les vidéos à la une et les partenariats passent désormais par l'espace admin.

## 🧪 Tester en local avant de déployer

```bash
cd creator-hub-server
npm install
node server.js
```

Puis ouvre `http://localhost:3000` dans ton navigateur. La base `data/hub.db` sera créée automatiquement au premier lancement, avec le mot de passe `change-moi-2026` (ou celui défini dans une variable d'environnement `ADMIN_PASSWORD` si tu la définis avant de lancer `node server.js`).
