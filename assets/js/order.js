// Fenêtre de commande boutique — EFT uniquement
let currentProduct = { title: '', price: '' };

function generateOrderNumber() {
  const d = new Date();
  const y = String(d.getFullYear()).slice(2);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `SIG-${y}${m}${day}-${rand}`;
}

function openOrderModal(title, price) {
  currentProduct = { title, price };
  const modal = document.getElementById('order-modal');
  document.getElementById('order-number').textContent = generateOrderNumber();
  modal.showModal();
}

function toggleInvoiceFields() {
  const isCompany = document.querySelector('input[name="invoice-type"]:checked').value === 'societe';
  document.getElementById('company-fields').classList.toggle('show', isCompany);
}

document.addEventListener('DOMContentLoaded', function () {
  const form = document.getElementById('order-form');
  if (!form) return;

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    const orderNumber = document.getElementById('order-number').textContent;
    const nom = document.getElementById('of-nom').value;
    const prenom = document.getElementById('of-prenom').value;
    const adresse = document.getElementById('of-adresse').value;
    const tckimlik = document.getElementById('of-tckimlik').value;
    const invoiceType = document.querySelector('input[name="invoice-type"]:checked').value;

    let body = `Commande ${orderNumber}\n`;
    body += `Œuvre : ${currentProduct.title} — ${currentProduct.price} TL\n\n`;
    body += `Nom : ${nom}\nPrénom : ${prenom}\nAdresse : ${adresse}\nTC Kimlik : ${tckimlik}\n\n`;

    if (invoiceType === 'societe') {
      const societe = document.getElementById('of-societe').value;
      const vergi = document.getElementById('of-vergi').value;
      body += `Facture société : ${societe}\nNuméro fiscal (Vergi No) : ${vergi}\n(TVA/KDV 20% incluse)\n\n`;
    } else {
      body += `Facture particulier\n\n`;
    }

    body += `Paiement par virement EFT à venir de la part du client.`;

    const subject = `Commande ${orderNumber} — ${currentProduct.title}`;
    const mailto = `mailto:signature.agallery@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailto;
  });
});
