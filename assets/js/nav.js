// Menu mobile — bascule l'affichage de la navigation sur petit écran
document.addEventListener('DOMContentLoaded', function () {
  var burger = document.querySelector('.nav-burger');
  var navLinks = document.querySelector('.nav-links');
  if (burger && navLinks) {
    burger.addEventListener('click', function () {
      navLinks.classList.toggle('open');
    });
  }
});
