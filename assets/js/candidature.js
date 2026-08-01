document.addEventListener('DOMContentLoaded', function () {
  const form = document.getElementById('candidature-form');
  if (!form) return;

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    const val = id => document.getElementById(id).value;

    let body = `CANDIDATURE — EXPOSITION VIRTUELLE\n\n`;
    body += `Nom et prénom : ${val('c-nom')}\n`;
    body += `Téléphone : ${val('c-tel')}\n`;
    body += `E-mail : ${val('c-email')}\n`;
    body += `Instagram : ${val('c-insta')}\n`;
    body += `Portfolio / QR : ${val('c-portfolio')}\n\n`;
    body += `CV narratif :\n${val('c-cv')}\n\n`;
    body += `Manifeste / démarche :\n${val('c-manifeste')}\n\n`;
    body += `--- Œuvre ---\n`;
    body += `Titre : ${val('c-titre')}\n`;
    body += `Dimensions : ${val('c-dimensions')}\n`;
    body += `Technique : ${val('c-technique')}\n`;
    body += `Année : ${val('c-annee')}\n`;
    body += `Prix de vente : ${val('c-prix')}\n\n`;
    body += `⚠️ Fichiers à joindre manuellement à cet e-mail : photo de l'artiste, photo HD de l'œuvre, CV/manifeste si en fichier séparé.`;

    const subject = `Candidature exposition virtuelle — ${val('c-nom')}`;
    const mailto = `mailto:signature.agallery@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailto;
  });
});
