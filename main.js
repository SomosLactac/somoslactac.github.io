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
        return [true, "<strong>" + fmt(208 - 0.7 * e, 0) + " ppm</strong>Frecuencia cardíaca máxima estimada (Tanaka)<br>Con la fórmula de Nes: " + fmt(211 - 0.64 * e, 0) + " ppm"];
      },
      // Clasificación de la intensidad del ACSM (Garber et al., 2011): % FC máx y % FC de reserva.
      zonas: function (f) {
        var m = num(f, "fcmax"), e = num(f, "edad"), r = num(f, "reposo"), est = false;
        if (m === null) {
          if (e === null) return [null, "Escribe tu FC máxima o tu edad."];
          if (!(e >= 18 && e <= 90)) return [false, "La fórmula es para adultos: escribe una edad entre 18 y 90 años."];
          m = Math.round(208 - 0.7 * e); est = true;
        }
        if (!(m >= 120 && m <= 230)) return [false, "Escribe una FC máxima entre 120 y 230 ppm."];
        if (r !== null && !(r >= 30 && r <= 110 && r < m - 40)) return [false, "Escribe una FC en reposo entre 30 y 110 ppm."];
        var names = ["Muy ligera", "Ligera", "Moderada", "Vigorosa", "Casi máxima"];
        var cuts = r === null ? [57, 64, 77, 96] : [30, 40, 60, 90];
        var hr = function (p) { return Math.round(r === null ? m * p / 100 : r + (m - r) * p / 100); };
        var rows = "";
        for (var i = 0; i < 5; i++) {
          var lo = i === 0 ? null : hr(cuts[i - 1]), hi = i === 4 ? m : hr(cuts[i]) - 1;
          var pct = i === 0 ? "&lt; " + cuts[0] + " %" : i === 4 ? "≥ " + cuts[3] + " %" : cuts[i - 1] + "–" + (cuts[i] - 1) + " %";
          var ppm = i === 0 ? "&lt; " + hr(cuts[0]) : lo + "–" + hi;
          rows += "<tr><th scope=\"row\"><span class=\"tool-zone-n\">Zona " + (i + 1) + "</span>" + names[i] + "</th><td>" + pct + "</td><td>" + ppm + "</td></tr>";
        }
        var head = "<strong>" + m + " ppm</strong>" + (est ? "FC máxima estimada con tu edad (Tanaka)" : "Tu FC máxima") + (r === null ? "" : " · reposo " + fmt(r, 0) + " ppm");
        var table = "<table class=\"tool-zones\"><thead><tr><th scope=\"col\">Intensidad</th><th scope=\"col\">" + (r === null ? "% FC máx" : "% FC reserva") + "</th><th scope=\"col\">ppm</th></tr></thead><tbody>" + rows + "</tbody></table>";
        return [true, head + table];
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

  // Formularios de mensajes (Contacto y Glosario): se envían a Google Forms sin salir de la página.
  // Google no deja leer la respuesta (no-cors), así que se da por enviado si la petición sale.
  function initMessageForms() {
    $$("form[data-msg-form]").forEach(function (form) {
      var status = $(".msg-status", form);
      var button = $("button[type=submit]", form);
      form.addEventListener("submit", function (e) {
        if (!window.fetch || !window.URLSearchParams || !window.FormData) return; // envío normal a Google
        e.preventDefault();
        button.disabled = true;
        status.textContent = "Enviando…";
        fetch(form.action, { method: "POST", mode: "no-cors", body: new URLSearchParams(new FormData(form)) })
          .then(function () {
            form.reset();
            status.textContent = "¡Recibido! Gracias por escribir.";
          })
          .catch(function () {
            status.textContent = "No se ha podido enviar. Prueba otra vez o escribe a lactac.es@gmail.com.";
          })
          .then(function () { button.disabled = false; });
      });
    });
  }

  // Vídeos en bucle: solo se cargan y se mueven en pantallas de 720 px o más, cuando están a la vista
  // y si no se ha pedido reducir el movimiento. En móvil se queda la imagen fija (poster).
  function initClips() {
    if (reduced || !window.IntersectionObserver || !matchMedia("(min-width: 720px)").matches) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        var v = en.target;
        if (en.isIntersecting) { var p = v.play(); if (p && p.catch) p.catch(function () {}); }
        else v.pause();
      });
    }, { threshold: 0.25 });
    $$("video[data-autoplay]").forEach(function (v) { v.preload = "auto"; io.observe(v); });
  }

  function boot() {
    safe(initNav, "initNav");
    safe(initMenu, "initMenu");
    safe(initTools, "initTools");
    safe(initMessageForms, "initMessageForms");
    safe(initClips, "initClips");

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
