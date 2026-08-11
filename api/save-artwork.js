// api/save-artwork.js — Crée ou met à jour une œuvre dans la bibliothèque
// indépendante des expositions. Même mécanisme que add-artwork.js /
// add-exhibition.js (formidable + sharp + githubPutFile) : aucun nouveau
// système de stockage.
//
// Périmètre strict Partie 2 : pas de room_id / wall_id / slot_id / position /
// ordre de visite — uniquement les données propres de l'œuvre.
const { formidable } = require('formidable');
const fs = require('fs');
const sharp = require('sharp');
const { isValidSession } = require('./_auth');
const { githubPutFile } = require('./_github');

const ALLOWED_SHAPES = ['rectangulaire', 'ronde'];
const ALLOWED_STATUSES = ['disponible', 'reserve', 'vendu'];

// Règle d'orientation et de catégorie — dupliquée côté client pour un aperçu
// immédiat, mais CE calcul serveur fait foi dans les données enregistrées.
function computeOrientationCategory(shape, heightCm, widthCm, diameterCm) {
  if (shape === 'ronde') {
    const d = Number(diameterCm) || 0;
    const category = d <= 30 ? 'petit' : d <= 60 ? 'moyen' : 'grand';
    return { orientation: 'ronde', category };
  }
  const h = Number(heightCm) || 0;
  const w = Number(widthCm) || 0;
  const orientation = h > w ? 'verticale' : w > h ? 'horizontale' : 'carree';
  const maxDim = Math.max(h, w);
  const category = maxDim <= 30 ? 'petit' : maxDim <= 60 ? 'moyen' : 'grand';
  return { orientation, category };
}

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
    const form = formidable({ maxFileSize: 15 * 1024 * 1024 }); // 15 Mo max, comme add-artwork.js
    const [fields, files] = await form.parse(req);
    const get = (f) => (Array.isArray(fields[f]) ? fields[f][0] : fields[f]) || '';

    const isDraft = get('draft') === 'true';
    const existingId = get('id');
    const artist = get('artist');
    const titleFr = get('title_fr');
    const titleTr = get('title_tr') || titleFr;
    const descFr = get('desc_fr');
    const descTr = get('desc_tr');
    const shape = ALLOWED_SHAPES.includes(get('shape')) ? get('shape') : 'rectangulaire';
    const heightCm = get('height_cm');
    const widthCm = get('width_cm');
    const diameterCm = get('diameter_cm');
    const technique = get('technique');
    const year = get('year');
    const priceInfo = get('price_info');
    const status = ALLOWED_STATUSES.includes(get('status')) ? get('status') : 'disponible';
    const existingImage = get('existing_image') || null;

    // Brouillon : seul un titre minimal est exigé, pour permettre de
    // commencer une fiche et la compléter plus tard.
    if (!titleFr) {
      res.status(400).json({ error: 'Le titre (Français) est requis, même pour un brouillon.' });
      return;
    }

    // Fiche complète (non brouillon) : les informations nécessaires doivent
    // être présentes avant de sortir du statut brouillon.
    if (!isDraft) {
      if (!artist) {
        res.status(400).json({ error: 'Artiste obligatoire pour finaliser la fiche.' });
        return;
      }
      if (!priceInfo) {
        res.status(400).json({ error: "Le champ prix / information commerciale est obligatoire (une valeur, même 'Sur demande' ou 'Collection privée')." });
        return;
      }
      if (shape === 'ronde') {
        if (!diameterCm || Number(diameterCm) <= 0) {
          res.status(400).json({ error: 'Diamètre requis pour une œuvre ronde.' });
          return;
        }
      } else {
        if (!heightCm || !widthCm || Number(heightCm) <= 0 || Number(widthCm) <= 0) {
          res.status(400).json({ error: 'Hauteur et largeur requises pour une œuvre rectangulaire.' });
          return;
        }
      }
    }

    // Identifiant stable : généré une seule fois à la création, jamais
    // recalculé à partir du titre — garantit la réutilisation de l'œuvre
    // dans plusieurs expositions sans rupture de référence.
    const id = existingId || `art-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

    // Image : nouvel upload si fourni, sinon on conserve l'image existante
    // (édition sans changement d'image). Optionnelle uniquement en brouillon.
    const imageFile = Array.isArray(files.image) ? files.image[0] : files.image;
    let imageName = existingImage;

    if (imageFile) {
      const buffer = fs.readFileSync(imageFile.filepath);
      const resized = await sharp(buffer)
        .resize({ width: 1600, withoutEnlargement: true })
        .jpeg({ quality: 85 })
        .toBuffer();
      imageName = `${id}.jpg`;
      await githubPutFile(
        `assets/images/artworks/${imageName}`,
        resized.toString('base64'),
        `${existingId ? 'Modification' : 'Ajout'} image œuvre : ${artist || titleFr}`
      );
    }

    if (!isDraft && !imageName) {
      res.status(400).json({ error: 'Image requise pour finaliser la fiche (facultative uniquement en brouillon).' });
      return;
    }

    const { orientation, category } = computeOrientationCategory(shape, heightCm, widthCm, diameterCm);

    const artworkData = {
      id,
      draft: isDraft,
      artist,
      title_fr: titleFr,
      title_tr: titleTr,
      desc_fr: descFr,
      desc_tr: descTr,
      shape,
      height_cm: shape === 'rectangulaire' ? (Number(heightCm) || null) : null,
      width_cm: shape === 'rectangulaire' ? (Number(widthCm) || null) : null,
      diameter_cm: shape === 'ronde' ? (Number(diameterCm) || null) : null,
      orientation,
      category,
      technique,
      year,
      price_info: priceInfo,
      status,
      image: imageName,
      created_at: existingId ? get('created_at') || new Date().toISOString() : new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await githubPutFile(
      `content/artworks/${id}.json`,
      Buffer.from(JSON.stringify(artworkData, null, 2)).toString('base64'),
      `${existingId ? 'Modification' : 'Création'} œuvre : ${artist || titleFr}`
    );

    res.status(200).json({ ok: true, id });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur : ' + err.message });
  }
}

module.exports = handler;
module.exports.config = { api: { bodyParser: false } };
