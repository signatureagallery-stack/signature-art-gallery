/**
 * birbirden-build.js — Pages d'une exposition "par artistes" (BİRBİRDEN et les suivantes).
 * Appelé par build.js. Lit content/exhibitions/<slug>/artists/*.json et génère, en FR et TR :
 *   expositions/<expo>/index.html                      (page de l'exposition + affiches)
 *   expositions/<expo>/<artiste>/index.html            (biographie + œuvres)
 *   expositions/<expo>/<artiste>/<oeuvre>/index.html   (fiche de l'œuvre = destination du QR)
 * et la même arborescence sous tr/expositions/.
 * Les slugs sont écrits dans les données et ne sont JAMAIS recalculés.
 */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const SITE = 'https://signatureartgallery.com.tr';
const CURATOR_PHONE_DISPLAY = '0090 543 284 41 88';
const CURATOR_PHONE_TEL = '+905432844188';
const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const IMG_SRC = 'assets/images/birbirden';
const IMG_OUT = 'assets/images/birbirden/optimized';

const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
// Champ bilingue : title / title_tr, bio_fr / bio_tr … (le turc retombe sur le français)
const L = (o, base, lang) => (lang === 'tr'
  ? (o[base + '_tr'] || o[base + '_fr'] || o[base] || '')
  : (o[base + '_fr'] || o[base] || ''));

const T = {
  fr: {
    artists: 'Les artistes', works: 'Œuvres présentées dans BİRBİRDEN', back_expos: '← Retour aux expositions',
    technique: 'Technique', dimensions: 'Dimensions', year: 'Année', price: 'Prix',
    on_request: 'Prix sur demande', sold: 'VENDU', buy: 'Pour acheter cette œuvre, contactez le curateur :',
    bio: 'Biographie', manifesto: "Manifeste de l'artiste", other: 'TR',
  },
  tr: {
    artists: 'Sanatçılar', works: 'BİRBİRDEN’de Sergilenen Eserler', back_expos: '← Sergilere dön',
    technique: 'Teknik', dimensions: 'Ebat', year: 'Yıl', price: 'Fiyat',
    on_request: 'Fiyat için iletişime geçin', sold: 'SATILDI', buy: 'Bu eseri satın almak için küratörle iletişime geçin:',
    bio: 'Biyografi', manifesto: 'Sanatçı manifestosu', other: 'FR',
  },
};

// ---------- Détection + chargement ----------
function artistFiles(root, expoSlug) {
  const dir = path.join(root, 'content', 'exhibitions', expoSlug, 'artists');
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter((f) => f.endsWith('.json') && !f.startsWith('_'))
    .map((f) => path.join(dir, f));
}
const hasArtists = (root, expoSlug) => artistFiles(root, expoSlug).length > 0;

function loadArtists(root, expoSlug) {
  const artists = artistFiles(root, expoSlug).map((file) => {
    const name = path.basename(file);
    let a;
    try { a = JSON.parse(fs.readFileSync(file, 'utf-8')); }
    catch (e) { throw new Error(`Fichier artiste invalide (${name}) : ${e.message}`); }
    a.slug = path.basename(file, '.json'); // le nom du fichier EST le slug de l'artiste
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
  const src = path.join(root, IMG_SRC, file);
  if (!fs.existsSync(src)) { console.warn(`⚠️  Image manquante (BİRBİRDEN) : ${file}`); return null; }
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

// ---------- Gabarit commun ----------
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
function exhibitionHtml(exh, artists, lang) {
  const t = T[lang];
  const root = '../'.repeat(lang === 'tr' ? 3 : 2);
  const rel = `${exh.slug}/`;
  const title = L(exh, 'title', lang);
  const text = lang === 'tr' ? (exh.curatorial_text_tr || exh.curatorial_text_fr) : exh.curatorial_text_fr;
  const cards = artists.map((a) => `    <a class="bb-artist-card" href="${a.slug}/">
      <div class="bb-poster">${a.posterImg ? imgTag(a.posterImg, a.name, root, 'thumb') : `<span class="bb-poster__ph">${esc(a.name)}</span>`}</div>
      <div class="bb-artist-card__name">${esc(a.name)}</div>
      <div class="bb-artist-card__country">${esc(L(a, 'country', lang))}</div>
    </a>`).join('\n');
  const body = `<section class="exhibition-hero">
  <h1>${esc(title)}</h1>
  <div class="exhibition-hero__dates">${esc(exh.date_start)} — ${esc(exh.date_end)}</div>
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
    canonical: `${SITE}/${lang === 'tr' ? 'tr/' : ''}expositions/${rel}`,
    altUrl: `${SITE}/${lang === 'tr' ? '' : 'tr/'}expositions/${rel}`,
    ogImage: exh.coverFull, backHref: `${root}${lang === 'tr' ? 'tr/' : ''}expositions.html`, backLabel: t.back_expos,
    altHref: `${root}${lang === 'tr' ? '' : 'tr/'}expositions/${rel}`, body,
  });
}

function artistHtml(exh, a, lang) {
  const t = T[lang];
  const root = '../'.repeat(lang === 'tr' ? 4 : 3);
  const rel = `${exh.slug}/${a.slug}/`;
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
    lang, root, title: `${a.name} — BİRBİRDEN`, desc: (bio || `${a.name} — BİRBİRDEN`).replace(/\s+/g, ' ').slice(0, 200),
    canonical: `${SITE}/${lang === 'tr' ? 'tr/' : ''}expositions/${rel}`,
    altUrl: `${SITE}/${lang === 'tr' ? '' : 'tr/'}expositions/${rel}`,
    ogImage: a.posterImg && a.posterImg.full, backHref: '../', backLabel: '← BİRBİRDEN',
    altHref: `${root}${lang === 'tr' ? '' : 'tr/'}expositions/${rel}`, body,
  });
}

function workHtml(exh, a, w, lang) {
  const t = T[lang];
  const root = '../'.repeat(lang === 'tr' ? 5 : 4);
  const rel = `${exh.slug}/${a.slug}/${w.slug}/`;
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
    canonical: `${SITE}/${lang === 'tr' ? 'tr/' : ''}expositions/${rel}`,
    altUrl: `${SITE}/${lang === 'tr' ? '' : 'tr/'}expositions/${rel}`,
    ogImage: w.img && w.img.full, backHref: '../', backLabel: `← ${a.name}`,
    altHref: `${root}${lang === 'tr' ? '' : 'tr/'}expositions/${rel}`, body,
  });
}

// ---------- Écriture ----------
function write(file, html) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, html, 'utf-8');
}

async function build({ ROOT, exhibitions }) {
  const targets = exhibitions.filter((e) => e.status !== 'brouillon' && hasArtists(ROOT, e.slug));
  for (const exh of targets) {
    console.log(`→ Pages artistes/œuvres : ${exh.slug}`);
    const artists = loadArtists(ROOT, exh.slug);
    await optimizeAll(ROOT, artists);
    let works = 0;
    for (const lang of ['fr', 'tr']) {
      const base = path.join(ROOT, lang === 'tr' ? 'tr' : '', 'expositions', exh.slug);
      write(path.join(base, 'index.html'), exhibitionHtml(exh, artists, lang));
      for (const a of artists) {
        write(path.join(base, a.slug, 'index.html'), artistHtml(exh, a, lang));
        for (const w of a.works) {
          write(path.join(base, a.slug, w.slug, 'index.html'), workHtml(exh, a, w, lang));
          if (lang === 'fr') works++;
        }
      }
    }
    console.log(`  ${artists.length} artiste(s), ${works} œuvre(s) — FR + TR`);
  }
}

module.exports = { build, hasArtists };
