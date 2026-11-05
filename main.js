(function () {
  "use strict";

  var $ = function (s, scope) { return (scope || document).querySelector(s); };
  var $$ = function (s, scope) { return Array.prototype.slice.call((scope || document).querySelectorAll(s)); };
  var reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

  function safe(fn, name) { try { fn(); } catch (e) { console.warn("[" + name + "]", e); } }

  function initNav() {
    var nav = $("[data-nav]");
    if (!nav) return;
    var update = function () { nav.classList.toggle("is-solid", window.scrollY > 24); };
    window.addEventListener("scroll", update, { passive: true });
    update();
  }

  function initMenu() {
    var nav = $("[data-nav]");
    var toggle = $("[data-menu-toggle]");
    if (!nav || !toggle) return;
    var set = function (open) {
      nav.classList.toggle("is-open", open);
      toggle.setAttribute("aria-expanded", String(open));
      toggle.textContent = open ? "Cerrar" : "Menú";
    };
    toggle.addEventListener("click", function () { set(!nav.classList.contains("is-open")); });
    $$(".nav-links a", nav).forEach(function (a) { a.addEventListener("click", function () { set(false); }); });
  }

  function initReveals() {
    var items = $$(".reveal, .shot");
    if (!("IntersectionObserver" in window)) {
      items.forEach(function (el) { el.classList.add("is-in"); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); }
      });
    }, { threshold: 0.01, rootMargin: "0px 0px -6% 0px" });
    items.forEach(function (el) { io.observe(el); });

    // Red de seguridad: nada visible en pantalla se queda oculto
    setTimeout(function () {
      items.forEach(function (el) {
        if (!el.classList.contains("is-in") && el.getBoundingClientRect().top < window.innerHeight) {
          el.classList.add("is-in");
        }
      });
    }, 6000);
  }

  function initHero() {
    var words = $$(".hero-word");
    if (!words.length) return;
    gsap.from(words, { yPercent: 35, opacity: 0, duration: 1.1, ease: "expo.out", stagger: 0.12 });
    gsap.from(".hero-sub, .hero-text .btn", { y: 18, opacity: 0, duration: 1, ease: "power3.out", delay: 0.35, stagger: 0.1 });
  }

  // Firma de la web: las franjas de mordiscos se deslizan al hacer scroll
  function initBites() {
    $$(".bites").forEach(function (band, i) {
      var dir = i % 2 ? -1 : 1;
      gsap.fromTo(band, { "--bites-x": "0px" }, {
        "--bites-x": dir * 288 + "px",
        ease: "none",
        scrollTrigger: { trigger: band, start: "top bottom", end: "bottom top", scrub: 0.8 }
      });
    });
  }

  function initParallax() {
    if (reduced) return;
    $$(".pillar .shot-frame img").forEach(function (img) {
      gsap.fromTo(img, { scale: 1.1, yPercent: -3 }, {
        yPercent: 3,
        ease: "none",
        scrollTrigger: { trigger: img.closest(".shot"), start: "top bottom", end: "bottom top", scrub: 0.6 }
      });
    });
  }

  function boot() {
    safe(initNav, "initNav");
    safe(initMenu, "initMenu");
    safe(initReveals, "initReveals");

    if (window.gsap && window.ScrollTrigger) {
      try { gsap.registerPlugin(ScrollTrigger); } catch (_) {}
      safe(initHero, "initHero");
      safe(initBites, "initBites");
      safe(initParallax, "initParallax");
    }

    if (window.__BRAND__) window.__BRAND__.booted = true;
    document.documentElement.classList.add("is-ready");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
