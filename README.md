# Signature Art Gallery — Site web (v2 : boutique data-driven + back-office)

## ⚠️ CHANGEMENT IMPORTANT — action requise sur Vercel

Le site a maintenant une **étape de build automatique** (avant, c'était du HTML pur sans transformation). Il faut donc changer un réglage sur Vercel, **une seule fois** :

1. Va sur ton projet Vercel → **Settings** → **Build & Development Settings**
2. **Framework Preset** : choisis **"Other"**
3. **Build Command** : `npm run build`
4. **Output Directory** : `.` (juste un point)
5. **Install Command** : `npm install`
6. Sauvegarde, puis relance un déploiement ("Redeploy" dans l'onglet Deployments)

Sans ce réglage, la boutique ne se mettra pas à jour automatiquement.

## Ce qui a changé

**Avant** : chaque œuvre = une page HTML écrite à la main, dupliquée en FR et en TR → risque d'oubli, de désynchronisation, intenable à 100 œuvres.

**Maintenant** : une seule source de données par œuvre (`content/products/*.json`). À chaque déploiement, un script (`build.js`) génère automatiquement :
- la fiche produit en français (`produits/{slug}.html`)
- la fiche produit en turc (`tr/produits/{slug}.html`)
- la grille `boutique.html` (FR) et `tr/boutique.html` (TR)
- le fil "Nouveautés boutique" sur l'accueil (FR + TR)
- les images optimisées en WebP + miniatures, dans `assets/images/boutique/optimized/`

**Résultat concret** : tu ajoutes une œuvre une seule fois → elle apparaît automatiquement dans les deux langues, partout où elle doit apparaître.

## Back-office — ajouter/modifier/supprimer une œuvre

Un vrai back-office est en place sur `/admin/` (ex: `signatureartgallery.com.tr/admin/`).

**Étape unique à faire pour l'activer** (je ne peux pas la faire à ta place, elle nécessite ton compte GitHub) :
1. Ouvre `admin/config.yml` et remplace `VOTRE-COMPTE/signature-art-gallery` par le vrai nom de ton compte + dépôt GitHub
2. Suis la procédure "GitHub OAuth App" de Decap CMS (5-10 min, je peux te guider clic par clic quand tu es prêt) pour autoriser le back-office à se connecter à ton dépôt
3. Une fois fait, va sur `tonsite.com/admin/`, connecte-toi avec GitHub, et tu verras un formulaire : Artiste, Titre, Prix, Dimensions, Technique, Année, Statut, Photo, Description FR, Description TR

Quand tu cliques "Publier" dans le back-office : ça crée automatiquement un commit sur GitHub → Vercel redéploie → le site se met à jour (FR + TR) en 1-2 minutes, sans que tu touches à un seul fichier.

**Tant que cette connexion GitHub n'est pas configurée**, tu peux quand même ajouter une œuvre "à la main" : duplique un fichier dans `content/products/`, remplis les champs, envoie-le sur GitHub comme d'habitude.

## Exposition virtuelle — simplifié à 2 pages

- **`expo.html`** (+ `tr/expo.html`) — "Voir l'exposition" : affiche le lien Artsteps
- **`candidature.html`** (+ `tr/candidature.html`) — "Candidater"

Pour changer le lien Artsteps : édite `data/expo.json` (le champ `artsteps_url`), ou utilise le back-office (`/admin/` → "Exposition virtuelle"). Aucune modification de code nécessaire.

## Structure du projet

```
website/
├── content/products/*.json     → UNE SEULE SOURCE par œuvre (FR+TR dans le même fichier)
├── data/expo.json              → Réglages de l'exposition virtuelle (lien Artsteps)
├── build.js                    → Génère tout automatiquement (exécuté par Vercel)
├── package.json / vercel.json  → Configuration du build
├── admin/                      → Back-office (Decap CMS)
├── assets/
│   ├── images/boutique/        → Photos originales des œuvres (UNE SEULE COPIE, partagée FR/TR)
│   │   └── optimized/          → Générées automatiquement (WebP + miniatures) — ne pas éditer à la main
│   ├── css/ · js/ · icons/
├── produits/, tr/produits/     → Générés automatiquement par build.js — ne pas éditer à la main
├── boutique.html, tr/boutique.html → Générés automatiquement — ne pas éditer à la main
├── expo.html, tr/expo.html     → Générés automatiquement — ne pas éditer à la main
├── index.html, tr/index.html   → Pages sources (le bloc "Nouveautés boutique" est auto-régénéré)
├── about.html, fair-*.html, candidature.html, 404.html → Pages sources classiques
```

**Règle simple à retenir** : si un fichier peut être régénéré par `build.js`, ne l'édite jamais à la main — édite plutôt sa source dans `content/products/` ou `data/expo.json`, et laisse le build faire le reste.

## Traductions appliquées (TR)

- Boutique → **Mağaza**
- Œuvres disponibles → **Mevcut Eserler**
- Voir tout → **Tümünü Gör**
- Disponible → **Satışta**
- Vendu → **Satıldı**
- Retour à la boutique → **Mağazaya Dön**

Le menu français reste inchangé ("Boutique").

## Optimisation (plan gratuit Vercel)

- Images converties en **WebP** (qualité 80% plein format, 75% miniatures)
- **Miniatures séparées** (max 400px) pour les grilles, image pleine taille (max 1200px) pour la fiche produit
- **Lazy loading natif** (`loading="lazy"`) sur toutes les images de la boutique
- Une seule copie de chaque image, partagée entre FR et TR (pas de duplication)
- Le tout reste largement dans les limites du plan gratuit Vercel (bande passante, temps de build)

## Ajouter une œuvre manuellement (sans back-office, en attendant la connexion GitHub)

1. Copie un fichier existant dans `content/products/`, par exemple `content/products/mon-nouvel-artiste.json`
2. Remplis les champs (voir un fichier existant comme modèle)
3. Ajoute la photo dans `assets/images/boutique/`
4. Envoie les deux fichiers sur GitHub comme d'habitude
5. Vercel régénère tout automatiquement (boutique FR+TR, fiche produit FR+TR, fil d'accueil)

## Déploiement (Vercel)

1. Connecte ton dépôt GitHub à Vercel (si pas déjà fait)
2. Configure Build & Development Settings comme indiqué tout en haut de ce document
3. Chaque `git push` (ou upload GitHub) redéploie automatiquement

## Ce qui reste à faire de ton côté

- [ ] Changer les réglages de build sur Vercel (voir tout en haut)
- [ ] Remplacer `VOTRE-COMPTE/signature-art-gallery` dans `admin/config.yml` par ton vrai compte GitHub
- [ ] Configurer l'OAuth GitHub pour activer complètement `/admin/` (je peux te guider)
- [ ] Coller le lien Artsteps dans `data/expo.json` dès que ton exposition est prête
