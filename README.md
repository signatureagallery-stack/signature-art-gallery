# Signature Art Gallery — Site web

Projet statique HTML/CSS (aucun framework, aucune dépendance à installer). Prêt à déployer sur Vercel, Netlify ou GitHub Pages.

## Structure du projet

```
website/
├── index.html                 → Page d'accueil
├── about.html                 → À propos (histoire de la galerie, Nadine El Kaffel)
├── boutique.html              → Boutique (grille d'œuvres à vendre)
├── product-template.html      → Gabarit de fiche produit (à dupliquer par œuvre)
├── fair-template.html         → Gabarit de page "foire passée" (à dupliquer par foire)
├── fair-bodrum.html           → Bodrum Art Fair — conditions réelles
├── fair-artnouva.html         → Artnouva Ankara — conditions réelles
├── fair-dubai.html            → Dubai Art Fair — conditions réelles
├── fair-iaaf-istanbul.html    → IAAF İstanbul — conditions réelles
├── expo-conditions.html       → Conditions de participation, exposition virtuelle
├── 404.html                   → Page d'erreur personnalisée
├── robots.txt
├── sitemap.xml
├── manifest.json
├── .htaccess                  → Optionnel, uniquement pour hébergement Apache classique
└── assets/
    ├── images/                → Photos réelles de foires + vitrine
    ├── icons/                 → Favicon et icône d'app
    ├── css/                   → Une feuille de style par page (extraites, aucun style inline)
    └── js/                    → nav.js (menu mobile — seul script du site)
```

## Polices

Les polices (Fraunces, Inter, IBM Plex Mono) sont chargées via Google Fonts par `@import` dans chaque page. Aucun fichier de police local n'est nécessaire, mais une connexion internet est requise pour les charger (standard pour ce type de projet).

## Déploiement

### Vercel ou Netlify (recommandé, gratuit)
1. Crée un compte sur vercel.com ou netlify.com
2. Glisse-dépose le dossier `website/` entier sur leur interface ("Deploy" / "Add new site → Deploy manually")
3. Le site est en ligne immédiatement, avec une URL temporaire (ex: `signature-art-gallery.vercel.app`)
4. Dans les paramètres du projet → "Domains", ajoute ton domaine `signatureartgallery.com.tr`
5. Copie les enregistrements DNS fournis (A ou CNAME) dans l'interface de ton registrar (là où tu as acheté le domaine) — actif sous quelques heures

### GitHub Pages
1. Crée un dépôt GitHub, dépose tout le contenu de `website/` à la racine
2. Dans Settings → Pages, active GitHub Pages sur la branche principale
3. Ajoute ton domaine personnalisé dans le même écran

## ⚠️ Ce qui reste à compléter avant mise en ligne définitive

Ce projet est fonctionnel et prêt à héberger, mais certains éléments sont volontairement des **placeholders** en attendant du contenu réel :

- **`product-template.html`** : le bouton "Payer par carte" pointe vers `href="#"` — à remplacer par le vrai lien de paiement iyzico une fois ton compte configuré
- **`boutique.html`** : les 6 vignettes utilisent des dégradés de couleur en attendant les vraies photos d'œuvres et leurs prix réels
- **`expo-conditions.html`** : les boutons "Participer" pointent vers `href="#"` — à remplacer par le lien du formulaire Tally une fois créé
- **`fair-template.html`** : gabarit générique avec du texte entre crochets `[Nom de l'artiste]` — à dupliquer et remplir pour chaque foire passée
- **Version turque** : le site est actuellement en français uniquement. La structure `/tr/` n'a pas encore été créée
- Les images dans `assets/images/` sont les 6 photos de foires déjà sélectionnées pour la page d'accueil — au fur et à mesure des ajouts, place les nouvelles images dans ce même dossier

## Aucune dépendance externe

Le site utilise un unique petit script (`assets/js/nav.js`, ~10 lignes) pour le menu mobile — aucun framework, aucune librairie, aucun build step. Seule dépendance externe : Google Fonts (CDN). Tout le reste (HTML, CSS, JS, images) est auto-contenu dans ce dossier.
