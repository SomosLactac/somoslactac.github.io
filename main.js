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

  // Calculadoras de herramientas.html: calculan al escribir, sin enviar nada
  function initTools() {
    var fmt = function (n, d) { return n.toLocaleString("es-ES", { minimumFractionDigits: d, maximumFractionDigits: d }); };
    var num = function (form, name) {
      var el = form.elements[name];
      if (!el || el.value === "") return null;
      var v = parseFloat(String(el.value).replace(",", "."));
      return isFinite(v) ? v : NaN;
    };
    // Repeticiones medias a cada % del 1RM (Nuzzo et al., 2024, Sports Med, figuras 2 a 4).
    // Se añade el punto que define el propio 1RM: al 100 % se hace 1 repetición.
    var PCT = [100, 95, 90, 85, 80, 75, 70, 65, 60, 55, 50];
    var REPS = {
      general: [1, 3.28, 4.94, 7.15, 9.75, 12.37, 14.80, 17.11, 19.53, 22.43, 25.99],
      banca: [1, 2.59, 4.11, 6.23, 8.82, 11.51, 14.08, 16.59, 19.34, 22.79, 27.25],
      prensa: [1, 7.04, 8.69, 10.69, 13.05, 15.79, 18.96, 22.59, 26.74, 31.47, 36.86]
    };
    var NAMES = { general: "la tabla general", banca: "la tabla de press de banca", prensa: "la tabla de prensa de piernas" };
    var pctFromReps = function (ex, r) {
      var reps = REPS[ex] || REPS.general;
      for (var i = 1; i < reps.length; i++) {
        if (r <= reps[i]) {
          var t = (r - reps[i - 1]) / (reps[i] - reps[i - 1]);
          return PCT[i - 1] + t * (PCT[i] - PCT[i - 1]);
        }
      }
      return PCT[PCT.length - 1];
    };
    var calc = {
      "1rm": function (f) {
        var p = num(f, "peso"), r = num(f, "reps");
        var ex = f.elements.ejercicio ? f.elements.ejercicio.value : "general";
        if (p === null || r === null) return [null, "Rellena el peso y las repeticiones."];
        if (!(p > 0) || p > 500) return [false, "Escribe un peso entre 1 y 500 kg."];
        if (!(r >= 1 && r <= 10) || Math.round(r) !== r) return [false, "Usa una serie de 1 a 10 repeticiones."];
        var pct = pctFromReps(ex, r);
        var html = "<strong>" + fmt(p / (pct / 100), 1) + " kg</strong>1RM estimado (" + fmt(pct, 0) + " % del 1RM según " + NAMES[ex] + ")";
        if (ex === "general") html += "<br>Con la fórmula de Brzycki: " + fmt(p * 36 / (37 - r), 1) + " kg";
        return [true, html];
      },
      subir: function (f) {
        var p = num(f, "peso");
        if (p === null) return [null, "Escribe el peso con el que entrenas."];
        if (!(p > 0) || p > 500) return [false, "Escribe un peso entre 1 y 500 kg."];
        return [true, "<strong>" + fmt(p * 1.02, 1) + "–" + fmt(p * 1.10, 1) + " kg</strong>Siguiente peso a probar"];
      },
      fcmax: function (f) {
        var e = num(f, "edad");
        if (e === null) return [null, "Escribe tu edad."];
        if (!(e >= 18 && e <= 90)) return [false, "La fórmula es para adultos: escribe una edad entre 18 y 90 años."];
        return [true, "<strong>" + fmt(208 - 0.7 * e, 0) + " ppm</strong>Frecuencia cardiaca máxima estimada (Tanaka)<br>Con la fórmula de Nes: " + fmt(211 - 0.64 * e, 0) + " ppm"];
      }
    };
    $$("[data-tool]").forEach(function (form) {
      var fn = calc[form.getAttribute("data-tool")];
      var out = form.parentNode.querySelector(".tool-result");
      if (!fn || !out) return;
      var run = function () {
        var res = fn(form);
        out.innerHTML = res[1];
        out.classList.toggle("is-error", res[0] === false);
      };
      form.addEventListener("input", run);
      form.addEventListener("change", run);
      form.addEventListener("submit", function (e) { e.preventDefault(); run(); });
    });
  }

  function boot() {
    safe(initNav, "initNav");
    safe(initMenu, "initMenu");
    safe(initTools, "initTools");

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
