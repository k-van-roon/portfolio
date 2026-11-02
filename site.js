/* Click-to-enlarge for photos in .gallery and .figure.zoom blocks */
(function () {
  var box = document.createElement('div');
  box.className = 'lightbox';
  box.innerHTML = '<button type="button">Close ✕</button><img alt="" />';
  document.body.appendChild(box);
  var big = box.querySelector('img');

  document.querySelectorAll('.gallery img, .figure.zoom img').forEach(function (img) {
    img.style.cursor = 'zoom-in';
    img.addEventListener('click', function () {
      big.src = img.src;
      big.alt = img.alt;
      box.classList.add('active');
    });
  });

  function close() { box.classList.remove('active'); big.src = ''; }
  box.addEventListener('click', close);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
})();
