/**
 * build.js — Génère la boutique FR/TR à partir de content/products/*.json
 * Exécuté automatiquement par Vercel à chaque déploiement (npm run build).
 */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ROOT = __dirname;
const PRODUCTS_DIR = path.join(ROOT, 'content', 'products');
const IMAGES_SRC = path.join(ROOT, 'assets', 'images', 'boutique');
const IMAGES_OUT = path.join(ROOT, 'assets', 'images', 'boutique', 'optimized');
const EXPO_FILE = path.join(ROOT, 'data', 'expo.json');
const EXHIBITIONS_DIR = path.join(ROOT, 'content', 'exhibitions');
const EXHIBITIONS_IMAGES_SRC = path.join(ROOT, 'assets', 'images', 'expositions');
const EXHIBITIONS_IMAGES_OUT = path.join(EXHIBITIONS_IMAGES_SRC, 'optimized');

// ---------- 1. Charger toutes les œuvres ----------
function loadProducts() {
  const files = fs.readdirSync(PRODUCTS_DIR).filter(f => f.endsWith('.json'));
  return files.map(f => JSON.parse(fs.readFileSync(path.join(PRODUCTS_DIR, f), 'utf-8')));
}

// ---------- 2. Optimiser les images (WebP + miniature) ----------
async function optimizeImages(products) {
  if (!fs.existsSync(IMAGES_OUT)) fs.mkdirSync(IMAGES_OUT, { recursive: true });

  for (const p of products) {
    // Le CMS (Decap) peut enregistrer soit un nom de fichier seul, soit un chemin complet
    const imageName = p.image.replace(/^.*[\\/]/, '');
    const srcPath = path.join(IMAGES_SRC, imageName);
    if (!fs.existsSync(srcPath)) {
      console.warn(`⚠️  Image manquante pour ${p.slug}: ${imageName}`);
      continue;
    }
    const base = path.parse(imageName).name;
    const fullOut = path.join(IMAGES_OUT, `${base}.webp`);
    const thumbOut = path.join(IMAGES_OUT, `${base}-thumb.webp`);

    // Image pleine taille, compressée en WebP (max 1200px de large)
    await sharp(srcPath)
      .resize({ width: 1200, withoutEnlargement: true })
      .webp({ quality: 80 })
      .toFile(fullOut);

    // Miniature pour les grilles (max 400px de large)
    await sharp(srcPath)
      .resize({ width: 400, withoutEnlargement: true })
      .webp({ quality: 75 })
      .toFile(thumbOut);

    p.imageFull = `assets/images/boutique/optimized/${base}.webp`;
    p.imageThumb = `assets/images/boutique/optimized/${base}-thumb.webp`;
  }
}

// ---------- 3. Gabarits HTML ----------
function productPage(p, lang) {
  const isTR = lang === 'tr';
  const depth = isTR ? '../../' : '../';
  const backHref = '../boutique.html';
  const langSwitchHref = isTR ? `../../produits/${p.slug}.html` : `../tr/produits/${p.slug}.html`;
  const title = isTR ? (p.title_tr || p.title) : p.title;
  const artist = p.artist;
  const technique = isTR ? p.technique_tr : p.technique_fr;
  const desc = isTR ? p.desc_tr : p.desc_fr;
  const sold = p.status === 'vendu';

  const t = {
    disponible: isTR ? 'Satışta' : 'Disponible',
    vendu: isTR ? 'Satıldı' : 'Vendu',
    par: isTR ? '' : 'Par ',
    retour: isTR ? '← Mağazaya dön' : '← Retour à la boutique',
    technique_label: isTR ? 'Teknik' : 'Technique',
    dim_label: isTR ? 'Ebat' : 'Dimensions',
    year_label: isTR ? 'Yıl' : 'Année',
    eft_label: isTR ? 'Banka havalesi (EFT)' : 'Virement bancaire (EFT)',
    eft_note: isTR ? 'Havale kontrolünden sonra 24-48 saat içinde onay' : 'Confirmation sous 24-48h après vérification du virement',
    order_btn: isTR ? 'Sipariş ver →' : 'Commander →',
    sold_label: isTR ? 'Eser satıldı' : 'Œuvre vendue',
    sold_note: isTR ? 'Bu eser artık mevcut değil' : "Cette pièce n'est plus disponible",
    modal_title: isTR ? 'Siparişi tamamla' : 'Finaliser la commande',
    order_num: isTR ? 'Sipariş numarası' : 'N° de commande (sipariş numarası)',
    nom: isTR ? 'Ad' : 'Nom',
    prenom: isTR ? 'Soyad' : 'Prénom',
    adresse: isTR ? 'Teslimat adresi' : 'Adresse de livraison',
    tckimlik: 'TC Kimlik No',
    particulier: isTR ? 'Bireysel fatura' : 'Facture particulier',
    societe: isTR ? 'Kurumsal fatura' : 'Facture société',
    raison_sociale: isTR ? 'Firma unvanı' : 'Raison sociale',
    vergi: isTR ? 'Vergi numarası' : 'Numéro fiscal (Vergi No)',
    tva_note: isTR ? 'Kurumsal faturada %20 KDV dahildir.' : 'TVA (KDV) de 20% incluse sur la facture société.',
    bank_title: isTR ? 'Havale bilgileri' : 'Informations de virement',
    beneficiaire: isTR ? 'Alıcı' : 'Bénéficiaire',
    banque: isTR ? 'Banka' : 'Banque',
    submit_btn: isTR ? 'Siparişimi gönder' : 'Envoyer ma commande',
    instagram: 'Instagram ↗',
  };

  const payBlock = sold
    ? `<div class="pay-options">
      <div class="pay-card" style="background:#eee; color:#666; cursor:default;">
        <div>
          <div class="pay-label">${t.sold_label}</div>
          <div class="pay-note">${t.sold_note}</div>
        </div>
      </div>
    </div>`
    : `<div class="pay-options">
      <div class="pay-card" onclick="openOrderModal('${title} — ${artist}', '${p.price}')">
        <div>
          <div class="pay-label">${t.eft_label}</div>
          <div class="pay-note">${t.eft_note}</div>
        </div>
        <button class="pay-btn" type="button">${t.order_btn}</button>
      </div>
    </div>`;

  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="icon" href="${depth}assets/icons/favicon.ico" sizes="any"><link rel="icon" href="${depth}assets/icons/favicon.png" type="image/png"><link rel="apple-touch-icon" href="${depth}assets/icons/apple-touch-icon.png">
<title>${title} — Signature Art Gallery</title>
<link rel="stylesheet" href="${depth}assets/css/product-template.css">
</head>
<body>

<a class="back" href="${backHref}">${t.retour}</a>
<a href="${langSwitchHref}" style="position:fixed; top:26px; right:6vw; font-family:'IBM Plex Mono',monospace; font-size:11px; letter-spacing:1px; opacity:0.6; z-index:10;">${isTR ? 'FR' : 'TR'}</a>

<section class="product-hero">
  <div class="product-photo"><img src="${depth}${p.imageFull}" alt="${title} — ${artist}" loading="lazy"></div>
  <div>
    <span class="stand-code"${sold ? ' style="color:#9c3226;"' : ''}>${sold ? t.vendu : t.disponible}</span>
    <h1>${title}</h1>
    <div class="artist-name">${t.par}${artist}</div>

    <div class="specs">
      <div><span>${t.technique_label}</span><span>${technique}</span></div>
      <div><span>${t.dim_label}</span><span>${p.dimensions}</span></div>
      <div><span>${t.year_label}</span><span>${p.year}</span></div>
    </div>

    <div class="price"${sold ? ' style="text-decoration:line-through; opacity:0.5;"' : ''}>${p.price} TL</div>

    ${payBlock}

    <p class="bio">${desc}</p>
  </div>
</section>

<dialog id="order-modal">
  <div class="modal-inner">
    <button class="modal-close" onclick="document.getElementById('order-modal').close()">✕</button>
    <div class="modal-title">${t.modal_title}</div>
    <div class="modal-order-number">${t.order_num} : <span id="order-number"></span></div>

    <form id="order-form">
      <div class="field-group"><label>${t.nom}</label><input type="text" id="of-nom" required></div>
      <div class="field-group"><label>${t.prenom}</label><input type="text" id="of-prenom" required></div>
      <div class="field-group"><label>${t.adresse}</label><input type="text" id="of-adresse" required></div>
      <div class="field-group"><label>${t.tckimlik}</label><input type="text" id="of-tckimlik" required></div>

      <div class="invoice-toggle">
        <label><input type="radio" name="invoice-type" value="particulier" checked onchange="toggleInvoiceFields()"><span>${t.particulier}</span></label>
        <label><input type="radio" name="invoice-type" value="societe" onchange="toggleInvoiceFields()"><span>${t.societe}</span></label>
      </div>

      <div id="company-fields">
        <div class="field-group"><label>${t.raison_sociale}</label><input type="text" id="of-societe"></div>
        <div class="field-group"><label>${t.vergi}</label><input type="text" id="of-vergi"></div>
        <div class="vat-note">${t.tva_note}</div>
      </div>

      <div class="bank-info">
        <strong>${t.bank_title}</strong>
        ${t.beneficiaire} : LES BELİERS TEKSTİL LİMİTED ŞİRKETİ<br>
        IBAN (TL) : TR090020500009490632800001<br>
        ${t.banque} : Kuveyt Türk — Esenyurt Şubesi
      </div>

      <button type="submit" class="modal-submit">${t.submit_btn}</button>
    </form>
  </div>
</dialog>

<div style="padding:0 6vw 60px; font-family:'IBM Plex Mono',monospace; font-size:11px; opacity:0.6;"><a href="https://www.instagram.com/signature.artgallery?igsh=YXd2YW15b2YwanY1" target="_blank" style="border-bottom:1px solid rgba(11,11,12,0.3);">${t.instagram}</a></div>

<script src="${depth}assets/js/order.js" defer></script>
</body>
</html>
`;
}

function boutiquePage(products, lang) {
  const isTR = lang === 'tr';
  const depth = isTR ? '../' : '';
  const backHref = isTR ? 'index.html' : 'index.html';
  const langSwitchHref = isTR ? '../boutique.html' : 'tr/boutique.html';
  const t = {
    title: isTR ? 'Mağaza' : 'Boutique',
    heading: isTR ? 'Mevcut Eserler' : 'Œuvres disponibles',
    sold: isTR ? 'Satıldı' : 'Vendu',
    retour: isTR ? '← Geri' : '← Retour',
    instagram: 'Instagram ↗',
  };

  const cards = products.map(p => {
    const cardTitle = isTR ? (p.title_tr || p.title) : p.title;
    const soldClass = p.status === 'vendu' ? ' sold' : '';
    const tag = p.status === 'vendu' ? `<span class="sold-tag">${t.sold}</span>` : '';
    return `  <a class="product${soldClass}" href="produits/${p.slug}.html">
    ${tag}<div class="product-photo"><img src="${depth}${p.imageThumb}" alt="${cardTitle} — ${p.artist}" loading="lazy"></div>
    <div class="product-info">
      <div class="product-artist">${p.artist}</div>
      <div class="product-title">${cardTitle}</div>
      <div class="product-price">${p.price} TL</div>
    </div>
  </a>`;
  }).join('\n');

  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="icon" href="${depth}assets/icons/favicon.ico" sizes="any"><link rel="icon" href="${depth}assets/icons/favicon.png" type="image/png"><link rel="apple-touch-icon" href="${depth}assets/icons/apple-touch-icon.png">
<title>${t.title} — Signature Art Gallery</title>
<link rel="stylesheet" href="${depth}assets/css/boutique.css">
</head>
<body>

<a class="back" href="${backHref}">${t.retour}</a>
<a href="${langSwitchHref}" style="position:fixed; top:26px; right:6vw; font-family:'IBM Plex Mono',monospace; font-size:11px; letter-spacing:1px; opacity:0.6; z-index:10;">${isTR ? 'FR' : 'TR'}</a>

<section class="hero">
  <span class="stand-code">${t.title}</span>
  <h1>${t.heading}</h1>
</section>

<div class="grid">
${cards}
</div>

<div style="padding:0 6vw 60px; font-family:'IBM Plex Mono',monospace; font-size:11px; opacity:0.6;"><a href="https://www.instagram.com/signature.artgallery?igsh=YXd2YW15b2YwanY1" target="_blank" style="border-bottom:1px solid rgba(11,11,12,0.3);">${t.instagram}</a></div>

</body>
</html>
`;
}

function marqueeBlock(products, lang) {
  const isTR = lang === 'tr';
  const depth = isTR ? '../' : ''; // tr/index.html est dans tr/, donc assets/ nécessite ../
  const latest = [...products].filter(p => p.status !== 'vendu').slice(-5);
  const doubled = [...latest, ...latest];
  const items = doubled.map(p => {
    const href = `produits/${p.slug}.html`;
    return `      <a class="marquee-item" href="${href}"><div class="marquee-photo"><img src="${depth}${p.imageThumb}" alt="${p.title}" loading="lazy"></div><div class="marquee-price">${p.price} TL</div></a>`;
  }).join('\n');

  return `  <div class="marquee-wrap">
    <div class="marquee-track">
${items}
    </div>
  </div>`;
}

function injectMarquee(indexPath, block) {
  let content = fs.readFileSync(indexPath, 'utf-8');
  const startMarker = '  <div class="marquee-wrap">';
  const endMarker = '</section>';
  const startIdx = content.indexOf(startMarker);
  if (startIdx === -1) {
    console.warn(`⚠️  Marqueur marquee introuvable dans ${indexPath}`);
    return;
  }
  const endIdx = content.indexOf(endMarker, startIdx) + endMarker.length;
  content = content.slice(0, startIdx) + block + '\n</section>' + content.slice(endIdx);
  fs.writeFileSync(indexPath, content, 'utf-8');
}

// ---------- Exposition virtuelle ----------
function loadExpo() {
  return JSON.parse(fs.readFileSync(EXPO_FILE, 'utf-8'));
}

function expoPage(expo, lang) {
  const isTR = lang === 'tr';
  const depth = isTR ? '../' : '';
  const backHref = 'index.html';
  const langSwitchHref = isTR ? '../expo.html' : 'tr/expo.html';
  const candidatureHref = isTR ? 'candidature.html' : 'candidature.html';

  const t = isTR ? {
    label: "Dijital Sergi", title: expo.title || "Dijital Sergi",
    intro: "Signature Art Gallery'nin dijital sergileri, sanatçıların ve eserlerinin uluslararası bir kitle nezdinde görünürlüğünü artırmayı amaçlamaktadır.",
    intro2: "Bu format, İstanbul dışında veya yurt dışında ikamet eden sanatçıların, eserlerinin bir fotoğrafı üzerinden profesyonel bir sergiye katılmasına imkân tanırken; nakliye, sigorta ve taşıma sırasında hasar riskiyle ilgili maliyetleri de azaltır.",
    no_expo: "Şu anda aktif bir sergi bulunmuyor. Yakında.",
    pricing_label: "Katılım Ücretleri",
    p1: "1-3 eser", p1price: "2.000 TL", p2: "4-6 eser", p2price: "3.800 TL",
    candidater: "Başvur →", instagram: "Instagram ↗", retour: "← Geri",
  } : {
    label: "Exposition virtuelle", title: expo.title || "Exposition virtuelle",
    intro: "Les expositions virtuelles de Signature Art Gallery ont pour objectif d'accroître la visibilité des artistes et de leurs œuvres auprès d'un public international.",
    intro2: "Ce format permet aux artistes résidant hors d'Istanbul ou à l'étranger de participer à une exposition professionnelle à partir d'une photographie de leur œuvre, tout en réduisant les coûts liés au transport, aux assurances et aux risques de détérioration pendant l'expédition.",
    no_expo: "Aucune exposition active pour le moment. À venir.",
    pricing_label: "Tarifs de participation",
    p1: "1 à 3 œuvres", p1price: "2 000 TL", p2: "4 à 6 œuvres", p2price: "3 800 TL",
    candidater: "Candidater →", instagram: "Instagram ↗", retour: "← Retour",
  };

  const viewer = expo.artsteps_url
    ? `<div style="aspect-ratio:16/9; max-width:1000px; border:1px solid rgba(11,11,12,0.15);"><iframe src="${expo.artsteps_url}" width="100%" height="100%" frameborder="0" allowfullscreen loading="lazy"></iframe></div>`
    : `<div style="aspect-ratio:16/9; max-width:1000px; border:1px dashed rgba(11,11,12,0.3); display:flex; align-items:center; justify-content:center; font-family:'IBM Plex Mono',monospace; font-size:13px; opacity:0.5; text-align:center; padding:20px;">${t.no_expo}</div>`;

  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="icon" href="${depth}assets/icons/favicon.ico" sizes="any"><link rel="icon" href="${depth}assets/icons/favicon.png" type="image/png"><link rel="apple-touch-icon" href="${depth}assets/icons/apple-touch-icon.png">
<title>${t.title} — Signature Art Gallery</title>
<link rel="stylesheet" href="${depth}assets/css/expo-conditions.css">
</head>
<body>

<a class="back" href="${backHref}">${t.retour}</a>
<a href="${langSwitchHref}" style="position:fixed; top:26px; right:6vw; font-family:'IBM Plex Mono',monospace; font-size:11px; letter-spacing:1px; opacity:0.6; z-index:10;">${isTR ? 'FR' : 'TR'}</a>

<section class="hero">
  <span class="stand-code">${t.label}</span>
  <h1>${t.title}</h1>
</section>

<section class="section">
  <div style="max-width:640px; font-size:16px; line-height:1.75; opacity:0.85; margin-bottom:40px;">
    <p style="margin-bottom:16px;">${t.intro}</p>
    <p>${t.intro2}</p>
  </div>

  ${viewer}

  <div style="display:grid; grid-template-columns:1fr 1fr; gap:24px; max-width:500px; margin:48px 0;">
    <div style="border:1px solid rgba(11,11,12,0.15); padding:20px;">
      <div style="font-family:'IBM Plex Mono',monospace; font-size:11px; opacity:0.6; text-transform:uppercase; margin-bottom:8px;">${t.p1}</div>
      <div style="font-family:'Fraunces',serif; font-size:26px; color:var(--signature);">${t.p1price}</div>
    </div>
    <div style="border:1px solid rgba(11,11,12,0.15); padding:20px;">
      <div style="font-family:'IBM Plex Mono',monospace; font-size:11px; opacity:0.6; text-transform:uppercase; margin-bottom:8px;">${t.p2}</div>
      <div style="font-family:'Fraunces',serif; font-size:26px; color:var(--signature);">${t.p2price}</div>
    </div>
  </div>

  <a href="${candidatureHref}" style="display:inline-block; font-family:'IBM Plex Mono',monospace; font-size:12px; letter-spacing:1px; text-transform:uppercase; background:var(--signature); color:#fff; padding:16px 32px;">${t.candidater}</a>
</section>

<div style="padding:0 6vw 60px; font-family:'IBM Plex Mono',monospace; font-size:11px; opacity:0.6;"><a href="https://www.instagram.com/signature.artgallery?igsh=YXd2YW15b2YwanY1" target="_blank" style="border-bottom:1px solid rgba(11,11,12,0.3);">${t.instagram}</a></div>

</body>
</html>
`;
}

// ---------- Expositions virtuelles — Chargement (Module A) ----------
function loadExhibitions() {
  if (!fs.existsSync(EXHIBITIONS_DIR)) return [];
  const dirs = fs.readdirSync(EXHIBITIONS_DIR).filter(d =>
    fs.statSync(path.join(EXHIBITIONS_DIR, d)).isDirectory()
  );
  const exhibitions = dirs
    .map(dir => {
      const filePath = path.join(EXHIBITIONS_DIR, dir, 'exhibition.json');
      if (!fs.existsSync(filePath)) return null;
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    })
    .filter(Boolean);

  // Tri par date de début décroissante (les plus récentes en premier)
  exhibitions.sort((a, b) => new Date(b.date_start) - new Date(a.date_start));
  return exhibitions;
}

// ---------- Expositions virtuelles — Optimisation des images ----------
async function optimizeExhibitionImages(exhibitions) {
  if (!fs.existsSync(EXHIBITIONS_IMAGES_OUT)) fs.mkdirSync(EXHIBITIONS_IMAGES_OUT, { recursive: true });

  async function optimizeOne(imageName, warnLabel) {
    if (!imageName) return null;
    const srcPath = path.join(EXHIBITIONS_IMAGES_SRC, imageName);
    if (!fs.existsSync(srcPath)) {
      console.warn(`⚠️  Image manquante pour ${warnLabel}: ${imageName}`);
      return null;
    }
    const base = path.parse(imageName).name;
    const fullOut = path.join(EXHIBITIONS_IMAGES_OUT, `${base}.webp`);
    const thumbOut = path.join(EXHIBITIONS_IMAGES_OUT, `${base}-thumb.webp`);

    await sharp(srcPath).resize({ width: 1200, withoutEnlargement: true }).webp({ quality: 80 }).toFile(fullOut);
    await sharp(srcPath).resize({ width: 400, withoutEnlargement: true }).webp({ quality: 75 }).toFile(thumbOut);

    return {
      full: `assets/images/expositions/optimized/${base}.webp`,
      thumb: `assets/images/expositions/optimized/${base}-thumb.webp`,
    };
  }

  for (const exh of exhibitions) {
    const cover = await optimizeOne(exh.cover_image, exh.slug);
    exh.coverFull = cover ? cover.full : null;
    exh.coverThumb = cover ? cover.thumb : null;

    for (const art of exh.artworks || []) {
      const img = await optimizeOne(art.image, `${exh.slug} / ${art.title}`);
      art.imageFull = img ? img.full : null;
      art.imageThumb = img ? img.thumb : null;
    }
  }
}

// ---------- Expositions virtuelles — Gabarit : Index (Module G) ----------
function exhibitionIndexPage(exhibitions, lang) {
  const isTR = lang === 'tr';
  const depth = isTR ? '../' : '';
  const backHref = 'index.html';
  const langSwitchHref = isTR ? '../expositions.html' : 'tr/expositions.html';

  const t = {
    title: isTR ? 'Sergiler' : 'Expositions',
    heading: isTR ? 'Sanal Sergiler' : 'Expositions virtuelles',
    retour: isTR ? '← Geri' : '← Retour',
    instagram: 'Instagram ↗',
    archived: isTR ? 'Geçmiş' : 'Passée',
    ongoing: isTR ? 'Devam Ediyor' : 'En cours',
    no_exhibitions: isTR ? 'Şu anda sergi bulunmuyor.' : 'Aucune exposition pour le moment.',
  };

  // Seules les expositions publiées apparaissent sur le site public (jamais les brouillons)
  const publicExhibitions = exhibitions.filter(e => e.status !== 'brouillon');

  const statusLabel = (status) => {
    if (status === 'archivee') return t.archived;
    return t.ongoing;
  };

  const cards = publicExhibitions.map(exh => {
    const title = isTR ? (exh.title_tr || exh.title) : exh.title;
    const dates = `${exh.date_start} — ${exh.date_end}`;
    const href = `expositions/${exh.slug}.html`;
    const cover = exh.coverThumb || '';
    return `  <a class="exhibition-card" href="${href}">
    <div class="exhibition-card__image"${cover ? ` style="background-image:url('${depth}${cover}')"` : ''}></div>
    <div class="exhibition-card__body">
      <span class="exhibition-card__status exhibition-card__status--${exh.status}">${statusLabel(exh.status)}</span>
      <div class="exhibition-card__title">${title}</div>
      <div class="exhibition-card__dates">${dates}</div>
    </div>
  </a>`;
  }).join('\n');

  const gridOrEmpty = publicExhibitions.length
    ? `<div class="exhibitions-grid">\n${cards}\n</div>`
    : `<div class="exhibitions-empty">${t.no_exhibitions}</div>`;

  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="icon" href="${depth}assets/icons/favicon.ico" sizes="any"><link rel="icon" href="${depth}assets/icons/favicon.png" type="image/png"><link rel="apple-touch-icon" href="${depth}assets/icons/apple-touch-icon.png">
<title>${t.title} — Signature Art Gallery</title>
<link rel="stylesheet" href="${depth}assets/css/expositions.css">
</head>
<body>

<a class="back" href="${backHref}">${t.retour}</a>
<a href="${langSwitchHref}" style="position:fixed; top:26px; right:6vw; font-family:'IBM Plex Mono',monospace; font-size:11px; letter-spacing:1px; opacity:0.6; z-index:10;">${isTR ? 'FR' : 'TR'}</a>

<section class="hero">
  <span class="stand-code">${t.title}</span>
  <h1>${t.heading}</h1>
</section>

<section class="section">
  ${gridOrEmpty}
</section>

<div style="padding:0 6vw 60px; font-family:'IBM Plex Mono',monospace; font-size:11px; opacity:0.6;"><a href="https://www.instagram.com/signature.artgallery?igsh=YXd2YW15b2YwanY1" target="_blank" style="border-bottom:1px solid rgba(11,11,12,0.3);">${t.instagram}</a></div>

</body>
</html>
`;
}

// ---------- Expositions virtuelles — Gabarit : Page exposition (Module A) ----------
function exhibitionPage(exh, lang) {
  const isTR = lang === 'tr';
  const depth = isTR ? '../' : '';
  const backHref = isTR ? '../expositions.html' : 'expositions.html';
  const langSwitchHref = isTR ? `../../expositions/${exh.slug}.html` : `tr/expositions/${exh.slug}.html`;
  const title = isTR ? (exh.title_tr || exh.title) : exh.title;
  const curatorialText = isTR ? exh.curatorial_text_tr : exh.curatorial_text_fr;

  const t = {
    retour: isTR ? '← Sergilere dön' : '← Retour aux expositions',
    dates_sep: '—',
    artworks_heading: isTR ? 'Sergilenen Eserler' : 'Œuvres présentées',
    instagram: 'Instagram ↗',
    par: isTR ? '' : 'Par ',
  };

  const artworksBlock = (exh.artworks || []).map(art => {
    const artTitle = isTR ? (art.title_tr || art.title) : art.title;
    const img = art.imageThumb || '';
    return `    <figure class="artwork-item">
      <div class="artwork-item__image"${img ? ` style="background-image:url('${depth}${img}')"` : ''}></div>
      <figcaption>
        <div class="artwork-item__title">${artTitle}</div>
        <div class="artwork-item__artist">${t.par}${art.artist}</div>
      </figcaption>
    </figure>`;
  }).join('\n');

  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="icon" href="${depth}assets/icons/favicon.ico" sizes="any"><link rel="icon" href="${depth}assets/icons/favicon.png" type="image/png"><link rel="apple-touch-icon" href="${depth}assets/icons/apple-touch-icon.png">
<title>${title} — Signature Art Gallery</title>
<link rel="stylesheet" href="${depth}assets/css/expositions.css">
</head>
<body>

<a class="back" href="${backHref}">${t.retour}</a>
<a href="${langSwitchHref}" style="position:fixed; top:26px; right:6vw; font-family:'IBM Plex Mono',monospace; font-size:11px; letter-spacing:1px; opacity:0.6; z-index:10;">${isTR ? 'FR' : 'TR'}</a>

<section class="exhibition-hero">
  <h1>${title}</h1>
  <div class="exhibition-hero__dates">${exh.date_start} ${t.dates_sep} ${exh.date_end}</div>
  <p class="exhibition-hero__text">${curatorialText}</p>
</section>

<section class="section">
  <div class="artworks-heading">${t.artworks_heading}</div>
  <div class="artworks-grid">
${artworksBlock}
  </div>
</section>

<div style="padding:0 6vw 60px; font-family:'IBM Plex Mono',monospace; font-size:11px; opacity:0.6;"><a href="https://www.instagram.com/signature.artgallery?igsh=YXd2YW15b2YwanY1" target="_blank" style="border-bottom:1px solid rgba(11,11,12,0.3);">${t.instagram}</a></div>

</body>
</html>
`;
}

// ---------- 4. Exécution ----------
async function main() {
  console.log('→ Chargement des œuvres...');
  const products = loadProducts();
  console.log(`  ${products.length} œuvre(s) trouvée(s)`);

  console.log('→ Optimisation des images (WebP + miniatures)...');
  await optimizeImages(products);

  console.log('→ Génération des fiches produits FR...');
  if (!fs.existsSync(path.join(ROOT, 'produits'))) fs.mkdirSync(path.join(ROOT, 'produits'));
  for (const p of products) {
    fs.writeFileSync(path.join(ROOT, 'produits', `${p.slug}.html`), productPage(p, 'fr'), 'utf-8');
  }

  console.log('→ Génération des fiches produits TR...');
  const trProduitsDir = path.join(ROOT, 'tr', 'produits');
  if (!fs.existsSync(trProduitsDir)) fs.mkdirSync(trProduitsDir, { recursive: true });
  for (const p of products) {
    fs.writeFileSync(path.join(trProduitsDir, `${p.slug}.html`), productPage(p, 'tr'), 'utf-8');
  }

  console.log('→ Génération boutique.html (FR)...');
  fs.writeFileSync(path.join(ROOT, 'boutique.html'), boutiquePage(products, 'fr'), 'utf-8');

  console.log('→ Génération tr/boutique.html (TR)...');
  fs.writeFileSync(path.join(ROOT, 'tr', 'boutique.html'), boutiquePage(products, 'tr'), 'utf-8');

  console.log('→ Mise à jour du fil "Nouveautés boutique" (accueil FR/TR)...');
  injectMarquee(path.join(ROOT, 'index.html'), marqueeBlock(products, 'fr'));
  injectMarquee(path.join(ROOT, 'tr', 'index.html'), marqueeBlock(products, 'tr'));

  console.log('→ Génération de la page Exposition virtuelle (FR/TR)...');
  const expo = loadExpo();
  fs.writeFileSync(path.join(ROOT, 'expo.html'), expoPage(expo, 'fr'), 'utf-8');
  fs.writeFileSync(path.join(ROOT, 'tr', 'expo.html'), expoPage(expo, 'tr'), 'utf-8');

  console.log('→ Chargement des expositions...');
  const exhibitions = loadExhibitions();
  console.log(`  ${exhibitions.length} exposition(s) trouvée(s)`);

  console.log('→ Optimisation des images des expositions...');
  await optimizeExhibitionImages(exhibitions);

  console.log('→ Génération expositions.html (FR)...');
  fs.writeFileSync(path.join(ROOT, 'expositions.html'), exhibitionIndexPage(exhibitions, 'fr'), 'utf-8');

  console.log('→ Génération tr/expositions.html (TR)...');
  fs.writeFileSync(path.join(ROOT, 'tr', 'expositions.html'), exhibitionIndexPage(exhibitions, 'tr'), 'utf-8');

  console.log('→ Génération des pages exposition (FR)...');
  const publicExhibitions = exhibitions.filter(e => e.status !== 'brouillon');
  if (!fs.existsSync(path.join(ROOT, 'expositions'))) fs.mkdirSync(path.join(ROOT, 'expositions'));
  for (const exh of publicExhibitions) {
    fs.writeFileSync(path.join(ROOT, 'expositions', `${exh.slug}.html`), exhibitionPage(exh, 'fr'), 'utf-8');
  }

  console.log('→ Génération des pages exposition (TR)...');
  const trExpositionsDir = path.join(ROOT, 'tr', 'expositions');
  if (!fs.existsSync(trExpositionsDir)) fs.mkdirSync(trExpositionsDir, { recursive: true });
  for (const exh of publicExhibitions) {
    fs.writeFileSync(path.join(trExpositionsDir, `${exh.slug}.html`), exhibitionPage(exh, 'tr'), 'utf-8');
  }

  console.log('✓ Build terminé.');
}

main().catch(err => {
  console.error('Erreur de build:', err);
  process.exit(1);
});
