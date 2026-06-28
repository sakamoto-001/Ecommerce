/* ═══════════════════════════════════════════════════════════
   ASMIRE — Shared Frontend Logic (app.js)
   Sticky Navbar, Mobile Menu, Cart Badge Sync, Intersection Observer
   ═══════════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {
  initNavbar();
  initMobileMenu();
  initCartBadge();
  initIntersectionObserver();
  initNewsletterForm();
});

// Sticky Navbar Scroll Effect
function initNavbar() {
  const nav = document.querySelector('.navbar');
  if (!nav) return;

  const handleScroll = () => {
    if (window.scrollY > 50) {
      nav.classList.remove('transparent');
      nav.classList.add('solid');
    } else {
      // Check if page has hero. If not, keep it solid.
      const hasHero = document.querySelector('.hero-section');
      if (hasHero) {
        nav.classList.remove('solid');
        nav.classList.add('transparent');
      } else {
        nav.classList.remove('transparent');
        nav.classList.add('solid');
      }
    }
  };

  // Run immediately and on scroll
  handleScroll();
  window.addEventListener('scroll', handleScroll);
}

// Mobile Slide-in Menu Drawer
function initMobileMenu() {
  const toggle = document.querySelector('.menu-toggle');
  const menu = document.querySelector('.mobile-menu');
  if (!toggle || !menu) return;

  toggle.addEventListener('click', (e) => {
    e.stopPropagation();
    toggle.classList.toggle('active');
    menu.classList.toggle('open');
    document.body.style.overflow = menu.classList.contains('open') ? 'hidden' : '';
  });

  // Close when clicking links
  menu.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      toggle.classList.remove('active');
      menu.classList.remove('open');
      document.body.style.overflow = '';
    });
  });

  // Close when clicking outside
  document.addEventListener('click', (e) => {
    if (menu.classList.contains('open') && !menu.contains(e.target) && !toggle.contains(e.target)) {
      toggle.classList.remove('active');
      menu.classList.remove('open');
      document.body.style.overflow = '';
    }
  });
}

// Update Cart Badge dynamically
function initCartBadge() {
  const badge = document.querySelector('.cart-badge');
  if (!badge) return;

  const updateBadge = () => {
    const count = typeof window.getCartItemCount === 'function' ? window.getCartItemCount() : 0;
    if (count > 0) {
      badge.textContent = count;
      badge.classList.add('visible');
    } else {
      badge.classList.remove('visible');
    }
  };

  // Update immediately
  updateBadge();

  // Listen to the custom 'cartUpdated' event from cart.js
  window.addEventListener('cartUpdated', updateBadge);
}

// Reveal elements on scroll using Intersection Observer
function initIntersectionObserver() {
  const reveals = document.querySelectorAll('.reveal');
  if (reveals.length === 0) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
        // Unobserve once animated
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px' // Trigger slightly before element enters viewport
  });

  reveals.forEach(el => observer.observe(el));
}

// Newsletter Signup interaction
function initNewsletterForm() {
  const forms = document.querySelectorAll('.newsletter-form');
  forms.forEach(form => {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = form.querySelector('input[type="email"]');
      if (!input || !input.value) return;

      const email = input.value;
      if (typeof window.showToast === 'function') {
        window.showToast(`Thank you! ${email} has been subscribed.`, 'success');
      } else {
        alert('Thank you for subscribing!');
      }
      input.value = '';
    });
  });
}
