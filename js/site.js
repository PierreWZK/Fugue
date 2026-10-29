// Entrée des sections : chaque bloc marqué data-reveal apparaît une fois, en cascade dans sa section.
const blocks = document.querySelectorAll('[data-reveal]');

for (const section of document.querySelectorAll('section')) {
  section.querySelectorAll('[data-reveal]').forEach((el, i) => el.style.setProperty('--i', i));
}

if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        e.target.classList.add('in');
        io.unobserve(e.target);
      }
    },
    { rootMargin: '0px 0px -10% 0px' },
  );
  blocks.forEach((el) => io.observe(el));
} else {
  blocks.forEach((el) => el.classList.add('in'));
}
