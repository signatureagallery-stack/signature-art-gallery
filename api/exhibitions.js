// api/exhibitions.js — Liste les expositions (GET). Auth requise.
// Nécessaire pour la Partie 3 : l'éditeur de placement doit pouvoir choisir
// sur quelle exposition travailler. Mirroir exact de artworks.js/products.js,
// appliqué à content/exhibitions/. Ne modifie pas add-exhibition.js.
const { isValidSession } = require('./_auth');
const { githubListFiles, githubGetFile } = require('./_github');

module.exports = async (req, res) => {
  if (!isValidSession(req)) {
    res.status(401).json({ error: 'Non connecté.' });
    return;
  }
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Méthode non autorisée' });
    return;
  }

  try {
    const dirs = await githubListFiles('content/exhibitions');
    const exhibitions = [];
    for (const d of dirs) {
      if (d.type !== 'dir') continue;
      const data = await githubGetFile(`content/exhibitions/${d.name}/exhibition.json`);
      if (data) exhibitions.push(data);
    }
    exhibitions.sort((a, b) => new Date(b.date_start || 0) - new Date(a.date_start || 0));
    res.status(200).json({ exhibitions });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur : ' + err.message });
  }
};
