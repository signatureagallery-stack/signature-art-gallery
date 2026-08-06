# Signature Art Gallery — Site web (v3 : back-office maison, sans Decap/OAuth)

## Ce qui a changé par rapport à la version précédente

Decap CMS et son système OAuth GitHub ont été **entièrement retirés**. À la place : un back-office simple, fait sur mesure, protégé par un mot de passe, qui utilise un unique jeton GitHub côté serveur (pas de connexion GitHub pour toi, pas de popup, pas de Netlify).

**Ce que ça te donne concrètement :**
- Une page `/admin` protégée par mot de passe
- Un formulaire : artiste, titre FR, titre TR, description FR, description TR, prix, dimensions, technique, année, statut (disponible/vendu), photo
- L'image est automatiquement redimensionnée et compressée à l'envoi
- Une liste des œuvres publiées, avec un bouton "Supprimer"
- Quand tu publies une œuvre, elle est envoyée directement sur GitHub → Vercel redéploie automatiquement → `build.js` (déjà en place) régénère la boutique FR **et** TR, les fiches produit, tout — sans que tu touches à un seul fichier

## ⚠️ Configuration à faire une seule fois (indispensable)

Le back-office a besoin de 4 réglages secrets, à ajouter dans Vercel (jamais dans le code, jamais visibles publiquement).

### 1. Créer un jeton d'accès GitHub (remplace complètement l'OAuth)

1. Va sur **github.com** → clique sur ta photo de profil (en haut à droite) → **Settings**
2. Tout en bas du menu de gauche : **Developer settings**
3. **Personal access tokens** → **Tokens (classic)**
4. **Generate new token** → **Generate new token (classic)**
5. Donne-lui un nom (ex: "back-office site")
6. Coche uniquement la case **`repo`** (accès complet au dépôt)
7. **Generate token** → **copie immédiatement le jeton affiché** (il ne sera plus jamais visible après)

### 2. Ajouter les 4 variables sur Vercel

1. Va sur ton projet Vercel → **Settings** → **Environment Variables**
2. Ajoute ces 4 variables (Name / Value), une par une, puis clique **Save** à chaque fois :

| Name | Value |
|---|---|
| `ADMIN_PASSWORD` | Le mot de passe de ton choix pour accéder à `/admin` |
| `SESSION_SECRET` | N'importe quelle longue chaîne aléatoire (ex: 40 caractères au hasard) |
| `GITHUB_TOKEN` | Le jeton copié à l'étape précédente |
| `GITHUB_REPO` | `signatureagallery-stack/signature-art-gallery` (ton compte/dépôt exact) |
| `GITHUB_BRANCH` | `main` |

3. Une fois les 4 ajoutées, va dans **Deployments** → clique sur les **⋯** du dernier déploiement → **Redeploy** (pour que les nouvelles variables soient prises en compte)

### 3. Utiliser le back-office

1. Va sur `signatureartgallery.com.tr/admin`
2. Entre le mot de passe choisi (`ADMIN_PASSWORD`)
3. Remplis le formulaire, choisis une photo, clique **"Publier l'œuvre"**
4. Attends 1-2 minutes → l'œuvre apparaît automatiquement dans la boutique FR et TR

## Comment ça fonctionne (pour comprendre, pas obligatoire de tout lire)

```
Toi (formulaire /admin)
   → api/add-artwork.js (redimensionne l'image, écrit sur GitHub via le jeton)
      → nouveau commit sur GitHub
         → Vercel détecte le commit, relance automatiquement le build
            → build.js régénère boutique.html, tr/boutique.html,
              produits/*.html, tr/produits/*.html
               → site à jour, FR et TR, sans aucune action manuelle
```

Aucun OAuth, aucun popup, aucun compte Netlify : juste un mot de passe côté toi, et un jeton GitHub côté serveur (jamais visible, jamais transmis à ton navigateur).

## Structure du projet

```
website/
├── admin/index.html            → Back-office (mot de passe + formulaire + liste)
├── api/
│   ├── login.js                → Vérifie le mot de passe, ouvre une session (12h)
│   ├── add-artwork.js           → Redimensionne l'image + publie sur GitHub
│   ├── products.js              → Liste / supprime les œuvres
│   ├── _auth.js                 → Vérification de session (interne)
│   └── _github.js               → Communication avec l'API GitHub (interne)
├── content/products/*.json      → Source unique de chaque œuvre (FR+TR)
├── data/expo.json               → Réglages exposition virtuelle (lien Artsteps)
├── build.js                     → Génère tout le site à chaque déploiement
├── package.json / vercel.json   → Configuration du build
├── assets/images/boutique/      → Photos originales (une seule copie, FR+TR)
│   └── optimized/               → Générées automatiquement (WebP + miniatures)
├── produits/, tr/produits/      → Générés automatiquement — ne pas éditer à la main
├── boutique.html, tr/boutique.html → Générés automatiquement
├── expo.html, tr/expo.html      → Générés automatiquement
├── index.html, tr/index.html    → Pages sources (bloc "Nouveautés" auto-régénéré)
```

## Limites connues (honnêtes)

- **Modifier** une œuvre existante n'est pas encore possible depuis le back-office (seulement ajouter/supprimer). Pour l'instant, une modification se fait en éditant le fichier `content/products/{slug}.json` sur GitHub directement, ou en supprimant puis recréant l'œuvre.
- Chaque publication déclenche **deux commits** (image + fiche), donc deux redéploiements rapides à la suite — sans impact pratique, juste un détail technique.
- Le plan gratuit Vercel limite le temps de build et le nombre de déploiements par mois — largement suffisant pour un usage normal (quelques ajouts par semaine), à surveiller seulement si tu publies des dizaines d'œuvres par jour.

## Traductions appliquées (TR)

- Boutique → **Mağaza**
- Œuvres disponibles → **Mevcut Eserler**
- Voir tout → **Tümünü Gör**
- Disponible → **Satışta**
- Vendu → **Satıldı**
- Retour à la boutique → **Mağazaya Dön**

## Exposition virtuelle — 2 pages

- `expo.html` (+ `tr/expo.html`) : affiche le lien Artsteps (modifiable via `data/expo.json`)
- `candidature.html` (+ `tr/candidature.html`) : formulaire de candidature

## Déploiement

1. Dépôt GitHub connecté à Vercel
2. Build & Development Settings sur Vercel : Framework "Other", Build Command `npm run build`, Output Directory `.`, Install Command `npm install`
3. Chaque commit (upload GitHub, ou publication via `/admin`) redéploie automatiquement
