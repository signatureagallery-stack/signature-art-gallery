/**
 * foires-build.js — Pages "artistes / œuvres" pour une foire (Dubai, Istanbul, …).
 * Appelé par build.js. Pour chaque dossier content/fairs/<slug>/ contenant un
 * fair.json et un sous-dossier artists/*.json, génère en FR et TR :
 *   foires/<fair>/index.html                      (page de la foire + affiches)
 *   foires/<fair>/<artiste>/index.html             (biographie + œuvres)
 *   foires/<fair>/<artiste>/<oeuvre>/index.html    (fiche de l'œuvre = destination du QR)
 * Même schéma de données et mêmes classes CSS (.bb-*, assets/css/birbirden.css)
 * que le module BİRBİRDEN : un seul fichier de style sert aux deux.
 * Ne touche jamais aux pages fair-dubai.html / fair-iaaf-istanbul.html (candidatures),
 * qui restent gérées à la main.
 * Les slugs sont écrits dans les données et ne sont JAMAIS recalculés.
 */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const SITE = 'https://signatureartgallery.com.tr';
const CURATOR_PHONE_DISPLAY = '0090 543 284 41 88';
const CURATOR_PHONE_TEL = '+905432844188';
const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const FAIRS_DIR = 'content/fairs';
const OUT_DIR = 'foires';
const IMG_SRC = 'assets/images/foires';
const IMG_OUT = 'assets/images/foires/optimized';

const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const L = (o, base, lang) => (lang === 'tr'
  ? (o[base + '_tr'] || o[base + '_fr'] || o[base] || '')
  : (o[base + '_fr'] || o[base] || ''));

const T = {
  fr: {
    artists: 'Les artistes', works: 'Œuvres présentées', back_foires: '← Retour aux foires',
    technique: 'Technique', dimensions: 'Dimensions', year: 'Année',
    on_request: 'Prix sur demande', sold: 'VENDU', buy: 'Contacter le curateur :',
    bio: 'Biographie', manifesto: "Manifeste de l'artiste", other: 'TR',
  },
  tr: {
    artists: 'Sanatçılar', works: 'Sergilenen Eserler', back_foires: '← Fuarlara dön',
    technique: 'Teknik', dimensions: 'Ebat', year: 'Yıl',
    on_request: 'Fiyat için iletişime geçin', sold: 'SATILDI', buy: 'Küratörle iletişim:',
    bio: 'Biyografi', manifesto: 'Sanatçı manifestosu', other: 'FR',
  },
};

// ---------- Détection des foires et de leurs artistes ----------
function listFairs(root) {
  const dir = path.join(root, FAIRS_DIR);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => fs.existsSync(path.join(dir, f, 'fair.json')));
}
function loadFair(root, slug) {
  const f = JSON.parse(fs.readFileSync(path.join(root, FAIRS_DIR, slug, 'fair.json'), 'utf-8'));
  f.slug = slug;
  return f;
}
function artistFiles(root, fairSlug) {
  const dir = path.join(root, FAIRS_DIR, fairSlug, 'artists');
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter((f) => f.endsWith('.json') && !f.startsWith('_'))
    .map((f) => path.join(dir, f));
}
const hasArtists = (root, fairSlug) => artistFiles(root, fairSlug).length > 0;

function loadArtists(root, fairSlug) {
  const artists = artistFiles(root, fairSlug).map((file) => {
    const name = path.basename(file);
    let a;
    try { a = JSON.parse(fs.readFileSync(file, 'utf-8')); }
    catch (e) { throw new Error(`Fichier artiste invalide (${name}) : ${e.message}`); }
    a.slug = path.basename(file, '.json');
    if (!SLUG_RE.test(a.slug)) throw new Error(`Nom de fichier artiste invalide "${name}" : minuscules, chiffres et tirets seulement.`);
    if (!a.name) throw new Error(`${name} : champ "name" manquant.`);
    a.works = Array.isArray(a.works) ? a.works : [];
    const seen = new Set();
    for (const w of a.works) {
      if (!w.slug || !SLUG_RE.test(w.slug)) throw new Error(`${name} : œuvre "${w.title || '?'}" sans slug valide (minuscules, chiffres, tirets).`);
      if (seen.has(w.slug)) throw new Error(`${name} : slug d'œuvre en double "${w.slug}".`);
      if (!w.title) throw new Error(`${name} : œuvre "${w.slug}" sans titre.`);
      seen.add(w.slug);
    }
    return a;
  });
  artists.sort((x, y) => (x.order || 999) - (y.order || 999) || x.name.localeCompare(y.name, 'tr'));
  return artists;
}

// ---------- Images (WebP + miniature) ----------
async function processImage(root, file, thumbW, fullW) {
  if (!file) return null;
  let src = path.join(root, IMG_SRC, file);
  if (!fs.existsSync(src)) {
    // Tolérance sur l'extension : mêmes lettres, autre extension (jpeg / jpg / png / webp)
    const wanted = path.parse(file).name;
    const dir = path.join(root, IMG_SRC);
    const alt = fs.existsSync(dir) ? fs.readdirSync(dir).find((f) => path.parse(f).name === wanted && /\.(jpe?g|png|webp)$/i.test(f)) : null;
    if (!alt) { console.warn(`⚠️  Image manquante (Foires) : ${file}`); return null; }
    src = path.join(dir, alt);
  }
  const base = path.parse(file).name;
  const outDir = path.join(root, IMG_OUT);
  fs.mkdirSync(outDir, { recursive: true });
  const thumbPath = path.join(outDir, `${base}-thumb.webp`);
  await sharp(src).rotate().resize({ width: thumbW, withoutEnlargement: true }).webp({ quality: 76 }).toFile(thumbPath);
  await sharp(src).rotate().resize({ width: fullW, withoutEnlargement: true }).webp({ quality: 82 }).toFile(path.join(outDir, `${base}.webp`));
  const m = await sharp(thumbPath).metadata();
  return { thumb: `${IMG_OUT}/${base}-thumb.webp`, full: `${IMG_OUT}/${base}.webp`, w: m.width, h: m.height };
}
async function optimizeAll(root, artists) {
  for (const a of artists) {
    a.posterImg = await processImage(root, a.poster, 640, 1400);
    for (const w of a.works) w.img = await processImage(root, w.image, 720, 1600);
  }
}

// ---------- Gabarit commun (identique à BİRBİRDEN, même feuille de style) ----------
function shell({ lang, root, title, desc, canonical, altUrl, ogImage, backHref, backLabel, altHref, body }) {
  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="icon" href="${root}assets/icons/favicon.ico" sizes="any"><link rel="icon" href="${root}assets/icons/favicon.png" type="image/png"><link rel="apple-touch-icon" href="${root}assets/icons/apple-touch-icon.png">
<title>${esc(title)} — Signature Art Gallery</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${canonical}">
<link rel="alternate" hreflang="${lang === 'tr' ? 'fr' : 'tr'}" href="${altUrl}">
<meta property="og:title" content="${esc(title)} — Signature Art Gallery">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:type" content="website">
<meta property="og:url" content="${canonical}">${ogImage ? `\n<meta property="og:image" content="${SITE}/${ogImage}">` : ''}
<link rel="stylesheet" href="${root}assets/css/expositions.css">
<link rel="stylesheet" href="${root}assets/css/birbirden.css">
</head>
<body>

<a class="back" href="${backHref}">${esc(backLabel)}</a>
<a class="bb-lang" href="${altHref}">${T[lang].other}</a>

${body}

<div class="bb-footer"><a href="https://www.instagram.com/signature.artgallery?igsh=YXd2YW15b2YwanY1" target="_blank" rel="noopener">Instagram ↗</a></div>

</body>
</html>
`;
}
const imgTag = (img, alt, root, kind, lazy = true) => img
  ? `<img src="${root}${kind === 'full' ? img.full : img.thumb}" alt="${esc(alt)}" width="${img.w}" height="${img.h}"${lazy ? ' loading="lazy"' : ''}>`
  : '';

// ---------- Pages ----------
function fairHtml(fair, artists, lang) {
  const t = T[lang];
  const root = '../'.repeat(lang === 'tr' ? 3 : 2);
  const rel = `${fair.slug}/`;
  const title = L(fair, 'title', lang);
  const text = L(fair, 'intro', lang);
  const cards = artists.map((a) => `    <a class="bb-artist-card" href="${a.slug}/">
      <div class="bb-poster">${a.posterImg ? imgTag(a.posterImg, a.name, root, 'thumb') : `<span class="bb-poster__ph">${esc(a.name)}</span>`}</div>
      <div class="bb-artist-card__name">${esc(a.name)}</div>
      <div class="bb-artist-card__country">${esc(L(a, 'country', lang))}</div>
    </a>`).join('\n');
  const body = `<section class="exhibition-hero">
  <h1>${esc(title)}</h1>
  <div class="exhibition-hero__dates">${esc(L(fair, 'dates', lang) || `${fair.date_start} — ${fair.date_end}`)}${fair.location ? ` · ${esc(L(fair, 'location', lang))}` : ''}</div>
  <p class="exhibition-hero__text">${esc(text)}</p>
</section>

<section class="section">
  <div class="artworks-heading">${t.artists}</div>
  <div class="bb-artists">
${cards}
  </div>
</section>`;
  return shell({
    lang, root, title, desc: String(text || '').replace(/\s+/g, ' ').slice(0, 200),
    canonical: `${SITE}/${lang === 'tr' ? 'tr/' : ''}${OUT_DIR}/${rel}`,
    altUrl: `${SITE}/${lang === 'tr' ? '' : 'tr/'}${OUT_DIR}/${rel}`,
    ogImage: fair.coverFull, backHref: `${root}${lang === 'tr' ? 'tr/' : ''}index.html#fairs`, backLabel: t.back_foires,
    altHref: `${root}${lang === 'tr' ? '' : 'tr/'}${OUT_DIR}/${rel}`, body,
  });
}

function artistHtml(fair, a, lang) {
  const t = T[lang];
  const root = '../'.repeat(lang === 'tr' ? 4 : 3);
  const rel = `${fair.slug}/${a.slug}/`;
  const bio = L(a, 'bio', lang);
  const manifesto = L(a, 'manifesto', lang);
  const cards = a.works.map((w) => `    <a class="bb-work-card" href="${w.slug}/">
      <div class="bb-work-card__img">${w.img ? imgTag(w.img, L(w, 'title', lang), root, 'thumb') : ''}</div>
      <div class="bb-work-card__title">${esc(L(w, 'title', lang))}</div>
      <div class="bb-work-card__meta">${esc([L(w, 'technique', lang), w.dimensions].filter(Boolean).join(' · '))}${w.status === 'vendu' ? ` <span class="bb-sold-tag">${t.sold}</span>` : ''}</div>
    </a>`).join('\n');
  const body = `<section class="bb-artist">
  <div class="bb-artist__poster">${a.posterImg ? imgTag(a.posterImg, a.name, root, 'thumb', false) : `<div class="bb-poster"><span class="bb-poster__ph">${esc(a.name)}</span></div>`}</div>
  <div class="bb-artist__text">
    <span class="stand-code">${esc(L(a, 'country', lang))}</span>
    <h1>${esc(a.name)}</h1>
    ${bio ? `<div class="bb-text">${esc(bio)}</div>` : ''}
    ${manifesto ? `<blockquote class="bb-manifesto">${esc(manifesto)}</blockquote>` : ''}
  </div>
</section>

<section class="section">
  <div class="artworks-heading">${t.works}</div>
  <div class="bb-works">
${cards}
  </div>
</section>`;
  return shell({
    lang, root, title: `${a.name} — ${L(fair, 'title', lang)}`, desc: (bio || a.name).replace(/\s+/g, ' ').slice(0, 200),
    canonical: `${SITE}/${lang === 'tr' ? 'tr/' : ''}${OUT_DIR}/${rel}`,
    altUrl: `${SITE}/${lang === 'tr' ? '' : 'tr/'}${OUT_DIR}/${rel}`,
    ogImage: a.posterImg && a.posterImg.full, backHref: '../', backLabel: `← ${L(fair, 'title', lang)}`,
    altHref: `${root}${lang === 'tr' ? '' : 'tr/'}${OUT_DIR}/${rel}`, body,
  });
}

function workHtml(fair, a, w, lang) {
  const t = T[lang];
  const root = '../'.repeat(lang === 'tr' ? 5 : 4);
  const rel = `${fair.slug}/${a.slug}/${w.slug}/`;
  const title = L(w, 'title', lang);
  const sold = w.status === 'vendu';
  const bio = L(a, 'bio', lang);
  const manifesto = L(a, 'manifesto', lang);
  const desc = L(w, 'description', lang);
  const rows = [
    [t.technique, L(w, 'technique', lang)],
    [t.dimensions, w.dimensions],
    [t.year, w.year],
  ].filter((r) => r[1]).map((r) => `<dt>${r[0]}</dt><dd>${esc(r[1])}</dd>`).join('');
  const priceBlock = sold
    ? `<div class="bb-price__value bb-price__value--sold">${t.sold}</div>`
    : `<div class="bb-price__value">${esc(w.price || t.on_request)}</div>
    <p class="bb-buy">${t.buy}<br><a href="tel:${CURATOR_PHONE_TEL}">${CURATOR_PHONE_DISPLAY}</a></p>`;
  const body = `<main class="bb-work-page">
  <div class="bb-work-page__img">${imgTag(w.img, `${title} — ${a.name}`, root, 'full', false)}</div>
  <div class="bb-work-page__body">
    <h1>${esc(title)}</h1>
    <a class="bb-work-page__artist" href="../">${esc(a.name)}<small>${esc(L(a, 'country', lang))}</small></a>
    <div class="bb-price">
    ${priceBlock}
    </div>
    ${rows ? `<dl class="bb-info">${rows}</dl>` : ''}
    ${desc ? `<div class="bb-text">${esc(desc)}</div>` : ''}
    ${bio ? `<details><summary>${t.bio}</summary><div class="bb-text">${esc(bio)}</div></details>` : ''}
    ${manifesto ? `<details><summary>${t.manifesto}</summary><div class="bb-text">${esc(manifesto)}</div></details>` : ''}
  </div>
</main>`;
  return shell({
    lang, root, title: `${title} — ${a.name}`,
    desc: `${title}, ${a.name}. ${[L(w, 'technique', lang), w.dimensions, w.year].filter(Boolean).join(', ')}`,
    canonical: `${SITE}/${lang === 'tr' ? 'tr/' : ''}${OUT_DIR}/${rel}`,
    altUrl: `${SITE}/${lang === 'tr' ? '' : 'tr/'}${OUT_DIR}/${rel}`,
    ogImage: w.img && w.img.full, backHref: '../', backLabel: `← ${a.name}`,
    altHref: `${root}${lang === 'tr' ? '' : 'tr/'}${OUT_DIR}/${rel}`, body,
  });
}

// ---------- Écriture ----------
function write(file, html) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, html, 'utf-8');
}

async function build({ ROOT }) {
  const targets = listFairs(ROOT).map((slug) => loadFair(ROOT, slug))
    .filter((f) => f.status !== 'brouillon' && hasArtists(ROOT, f.slug));
  for (const fair of targets) {
    console.log(`→ Pages artistes/œuvres (foire) : ${fair.slug}`);
    const artists = loadArtists(ROOT, fair.slug);
    const cover = await processImage(ROOT, fair.cover_image, 640, 1400);
    fair.coverFull = cover && cover.full;
    await optimizeAll(ROOT, artists);
    let works = 0;
    for (const lang of ['fr', 'tr']) {
      const base = path.join(ROOT, lang === 'tr' ? 'tr' : '', OUT_DIR, fair.slug);
      write(path.join(base, 'index.html'), fairHtml(fair, artists, lang));
      for (const a of artists) {
        write(path.join(base, a.slug, 'index.html'), artistHtml(fair, a, lang));
        for (const w of a.works) {
          write(path.join(base, a.slug, w.slug, 'index.html'), workHtml(fair, a, w, lang));
          if (lang === 'fr') works++;
        }
      }
    }
    console.log(`  ${artists.length} artiste(s), ${works} œuvre(s) — FR + TR`);
  }
}

module.exports = { build, hasArtists, listFairs };
