// api/add-exhibition.js — Reçoit le formulaire de création d'exposition (Étape 1 du back-office).
// Même logique que add-artwork.js : upload + redimensionnement de la couverture,
// publication du JSON sur GitHub. Le commit déclenche le redéploiement Vercel
// qui régénère expositions.html / tr/expositions.html (build.js déjà en place).
//
// Conforme au cahier des charges V2 : cette étape crée uniquement l'entité
// exposition. Aucune œuvre, aucun placement, aucune salle Three.js.
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

    const title = get('title');
    const titleTr = get('title_tr') || title;
    const dateStart = get('date_start');
    const dateEnd = get('date_end');
    const status = ['brouillon', 'en_ligne', 'archivee'].includes(get('status')) ? get('status') : 'brouillon';
    const curatorialFr = get('curatorial_text_fr');
    const curatorialTr = get('curatorial_text_tr');

    if (!title || !dateStart || !dateEnd) {
      res.status(400).json({ error: 'Champs obligatoires manquants (titre, date de début, date de fin).' });
      return;
    }
    if (new Date(dateEnd) < new Date(dateStart)) {
      res.status(400).json({ error: 'La date de fin ne peut pas précéder la date de début.' });
      return;
    }

    const slugify = (s) =>
      s
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/ğ/g, 'g').replace(/ş/g, 's').replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ü/g, 'u').replace(/ç/g, 'c')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

    const baseSlug = slugify(title) || `exposition-${Date.now()}`;
    const uniqueSuffix = Date.now().toString(36);
    const slug = `${baseSlug}-${uniqueSuffix}`;

    const imageFile = Array.isArray(files.cover_image) ? files.cover_image[0] : files.cover_image;
    if (!imageFile) {
      res.status(400).json({ error: 'Image de couverture manquante.' });
      return;
    }

    // Redimensionnement + compression avant envoi (build.js optimisera en WebP au build)
    const buffer = fs.readFileSync(imageFile.filepath);
    const resized = await sharp(buffer)
      .resize({ width: 1600, withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer();

    const imageName = `${slug}-cover.jpg`;
    const imagePath = `assets/images/expositions/${imageName}`;

    await githubPutFile(
      imagePath,
      resized.toString('base64'),
      `Ajout couverture exposition : ${title}`
    );

    // Structure conforme au schéma exhibition.json déjà en production
    // (Module A). Aucun champ "artworks"/"rooms" à ce stade — Étape 1
    // uniquement, l'attribution des œuvres viendra dans une étape suivante.
    const exhibitionData = {
      slug,
      status,
      title,
      title_tr: titleTr,
      curatorial_text_fr: curatorialFr,
      curatorial_text_tr: curatorialTr,
      date_start: dateStart,
      date_end: dateEnd,
      cover_image: imageName,
    };

    const jsonPath = `content/exhibitions/${slug}/exhibition.json`;
    await githubPutFile(
      jsonPath,
      Buffer.from(JSON.stringify(exhibitionData, null, 2)).toString('base64'),
      `Création exposition : ${title}`
    );

    res.status(200).json({ ok: true, slug });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur : ' + err.message });
  }
}

module.exports = handler;
module.exports.config = { api: { bodyParser: false } };
