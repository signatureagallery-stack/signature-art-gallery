// api/artworks.js — Liste les œuvres de la bibliothèque (GET) ou en supprime
// une (DELETE). Auth requise. Mirroir exact de products.js (boutique),
// appliqué à content/artworks/ au lieu de content/products/.
const { isValidSession } = require('./_auth');
const { githubListFiles, githubGetFile, githubDeleteFile } = require('./_github');

module.exports = async (req, res) => {
  if (!isValidSession(req)) {
    res.status(401).json({ error: 'Non connecté.' });
    return;
  }

  if (req.method === 'GET') {
    try {
      const files = await githubListFiles('content/artworks');
      const artworks = [];
      for (const f of files) {
        if (!f.name.endsWith('.json')) continue;
        const data = await githubGetFile(`content/artworks/${f.name}`);
        if (data) artworks.push(data);
      }
      // Les plus récemment modifiées en premier, pour retrouver facilement
      // une fiche en cours de complétion (brouillon).
      artworks.sort((a, b) => new Date(b.updated_at || 0) - new Date(a.updated_at || 0));
      res.status(200).json({ artworks });
    } catch (err) {
      res.status(500).json({ error: 'Erreur serveur : ' + err.message });
    }
    return;
  }

  if (req.method === 'DELETE') {
    let body = '';
    await new Promise((resolve) => {
      req.on('data', (chunk) => (body += chunk));
      req.on('end', resolve);
    });
    try {
      const { id, image } = JSON.parse(body);
      if (!id) {
        res.status(400).json({ error: 'id manquant' });
        return;
      }
      // Suppression explicite et directe uniquement — aucune suppression
      // automatique liée à un usage dans une exposition (Partie 3, pas
      // encore de lien exposition ↔ œuvre à ce stade).
      await githubDeleteFile(`content/artworks/${id}.json`, `Suppression œuvre : ${id}`);
      if (image) {
        await githubDeleteFile(`assets/images/artworks/${image}`, `Suppression image œuvre : ${image}`);
      }
      res.status(200).json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: 'Erreur serveur : ' + err.message });
    }
    return;
  }

  res.status(405).json({ error: 'Méthode non autorisée' });
};
