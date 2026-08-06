// api/add-artwork.js — Reçoit le formulaire (avec image), redimensionne, publie sur GitHub.
// Le commit déclenche automatiquement un déploiement Vercel qui régénère tout le site (FR+TR).
const { formidable } = require('formidable');
const fs = require('fs');
const sharp = require('sharp');
const { isValidSession } = require('./_auth');
const { githubPutFile } = require('./_github');

async function handler(req, res) {
  if (!isValidSession(req)) {
    res.status(401).json({ error: 'Non connecté.' });
    return;
  }
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Méthode non autorisée' });
    return;
  }

  try {
    const form = formidable({ maxFileSize: 15 * 1024 * 1024 }); // 15 Mo max en entrée
    const [fields, files] = await form.parse(req);

    const get = (f) => (Array.isArray(fields[f]) ? fields[f][0] : fields[f]) || '';

    const artist = get('artist');
    const titleFr = get('title_fr');
    const titleTr = get('title_tr') || titleFr;
    const descFr = get('desc_fr');
    const descTr = get('desc_tr');
    const price = get('price');
    const dimensions = get('dimensions');
    const technique = get('technique') || '';
    const year = get('year') || '';
    const status = get('status') === 'vendu' ? 'vendu' : 'disponible';

    if (!artist || !titleFr || !price) {
      res.status(400).json({ error: 'Champs obligatoires manquants (artiste, titre, prix).' });
      return;
    }

    const slugify = (s) =>
      s
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/ğ/g, 'g').replace(/ş/g, 's').replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ü/g, 'u').replace(/ç/g, 'c')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

    const baseSlug = slugify(`${artist}-${titleFr}`) || `oeuvre-${Date.now()}`;
    const uniqueSuffix = Date.now().toString(36);
    const slug = `${baseSlug}-${uniqueSuffix}`;

    const imageFile = Array.isArray(files.image) ? files.image[0] : files.image;
    if (!imageFile) {
      res.status(400).json({ error: "Photo de l'œuvre manquante." });
      return;
    }

    // Redimensionnement + compression avant envoi (build.js fera l'optimisation finale WebP)
    const buffer = fs.readFileSync(imageFile.filepath);
    const resized = await sharp(buffer)
      .resize({ width: 1600, withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer();

    const imageName = `${slug}.jpg`;
    const imagePath = `assets/images/boutique/${imageName}`;

    await githubPutFile(
      imagePath,
      resized.toString('base64'),
      `Ajout image œuvre : ${artist} — ${titleFr}`
    );

    const productData = {
      slug,
      artist,
      title: titleFr,
      title_tr: titleTr,
      technique_fr: technique,
      technique_tr: technique,
      dimensions,
      year,
      price,
      status,
      image: imageName,
      desc_fr: descFr,
      desc_tr: descTr,
    };

    const jsonPath = `content/products/${slug}.json`;
    await githubPutFile(
      jsonPath,
      Buffer.from(JSON.stringify(productData, null, 2)).toString('base64'),
      `Ajout œuvre : ${artist} — ${titleFr}`
    );

    res.status(200).json({ ok: true, slug });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur : ' + err.message });
  }
}

module.exports = handler;
module.exports.config = { api: { bodyParser: false } };
