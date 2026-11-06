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

  // Dibuja las curvas de una gráfica y, al final, muestra sus etiquetas.
  // Sin JavaScript o con movimiento reducido, las gráficas ya se ven completas.
  function chartTimeline(svg, vars) {
    var tl = gsap.timeline(vars);
    // autoRound: false porque GSAP redondea los píxeles y la curva saltaría de golpe en vez de dibujarse
    tl.fromTo($$(".draw", svg), { strokeDashoffset: 1.05 }, { strokeDashoffset: 0, autoRound: false, duration: 1, ease: "none", stagger: 0.08 }, 0);
    var after = $$(".after", svg);
    if (after.length) tl.from(after, { opacity: 0, duration: 0.2, ease: "none", stagger: 0.03 }, 0.55);
    return tl;
  }

  // La firma de la web: la curva del hero se dibuja al cargar
  function initHeroCurve() {
    var svg = $('[data-chart="load"]');
    if (svg) chartTimeline(svg, { delay: 0.2, defaults: { ease: "none" } }).duration(2);
  }

  // Las gráficas de los pilares se dibujan al hacer scroll
  function initScrollCharts() {
    $$('[data-chart="scroll"]').forEach(function (svg) {
      chartTimeline(svg, {
        scrollTrigger: { trigger: svg, start: "top 88%", end: "top 30%", scrub: 0.5 }
      });
    });
  }

  function initBars() {
    $$("[data-bars]").forEach(function (fig) {
      gsap.from($$(".bar", fig), {
        scaleX: 0, ease: "none", stagger: 0.12,
        scrollTrigger: { trigger: fig, start: "top 85%", end: "top 40%", scrub: 0.5 }
      });
    });
  }

  function boot() {
    safe(initNav, "initNav");
    safe(initMenu, "initMenu");

    if (!reduced && window.gsap && window.ScrollTrigger) {
      try { gsap.registerPlugin(ScrollTrigger); } catch (_) {}
      safe(initHeroCurve, "initHeroCurve");
      safe(initScrollCharts, "initScrollCharts");
      safe(initBars, "initBars");
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
