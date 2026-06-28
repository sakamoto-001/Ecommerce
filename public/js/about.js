/* ═══════════════════════════════════════════════════════════
   ASMIRE — About Page Controller (about.js)
   About page animations, reveal handlers, team interactive events
   ═══════════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {
  initAboutParallax();
});

// Simple parallax for About page banners (if any)
function initAboutParallax() {
  const images = document.querySelectorAll('.about-split-img img');
  if (images.length === 0) return;

  window.addEventListener('scroll', () => {
    const scrollY = window.scrollY;
    images.forEach(img => {
      const parentRect = img.parentElement.getBoundingClientRect();
      const parentTop = parentRect.top + window.scrollY;
      const windowHeight = window.innerHeight;
      
      // Calculate scroll ratio relative to element position
      if (scrollY + windowHeight > parentTop && scrollY < parentTop + parentRect.height) {
        const offset = (scrollY + windowHeight - parentTop) * 0.05;
        img.style.transform = `scale(1.08) translateY(${offset - 20}px)`;
      }
    });
  });
}
