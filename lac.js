/* Lac, la mascota de Lactac, en la web.
   Es el mismo stickman de los reels (Lactac/Reels/<reel>/src/lac/Lac.tsx y poses.ts),
   pasado a JavaScript sin librerías: se dibuja en SVG y se anima con requestAnimationFrame.

   Cómo se usa en el HTML:
     <button class="lac" type="button" data-lac="saluda" data-lac-on="chart:760,520" aria-label="…"></button>
   - data-lac: pose inicial (ver POSES).
   - data-lac-on: dónde apoya los pies, dentro de su contenedor (el padre, que debe tener position: relative):
       chart:x,y  → un punto de la gráfica .chart del mismo contenedor (coordenadas del viewBox)
       img        → el borde inferior de la foto del contenedor, a la derecha
       top        → el borde superior del contenedor, a la derecha
   - data-lac-hover: pose al pasar el ratón por el contenedor (o al verse en pantalla en móvil).
   - data-lac-cycle: poses que va enseñando al pulsarlo, separadas por comas.
   - data-lac-says: frases para cada pose de data-lac-cycle, separadas por «|». Opcional.
   - data-lac-hello: frase de saludo al aparecer. Opcional.
   Con movimiento reducido, Lac se queda quieto y solo cambia de pose al pulsarlo. */
(function () {
  "use strict";

  var LIMA = "#C8FF00", HUESO = "#F3F3EE", NEGRO = "#0A0A0A", SHORT = "#2B2D33";
  var HOMBRO = { x: 44, y: -158 }, BRAZO = [92, 86], CADERA = { x: 22, y: 26 }, PIERNA = [104, 98];
  var CABEZA = { y: -248, r: 64 }, G_BRAZO = 30, G_PIERNA = 36;
  // Caja del dibujo y altura de la planta de los pies dentro de ella
  var VB = { x: -200, y: -360, w: 400, h: 650 }, PIES = 252;
  var FPS = 30;

  var PIE = { piernaI: [4, 2], piernaD: [4, 2] };
  function P(o) { return Object.assign({ piernaI: PIE.piernaI, piernaD: PIE.piernaD, cabeza: 0, cejas: "normal", sonrisa: 0.6 }, o); }
  var POSES = {
    normal: P({ brazoI: [12, 6], brazoD: [12, 6] }),
    saluda: P({ brazoI: [12, 6], brazoD: [128, 160], cabeza: 5, cejas: "arriba", sonrisa: 1, anim: "saluda" }),
    presenta: P({ brazoI: [14, -10], brazoD: [62, 115], cabeza: 5, cejas: "arriba", sonrisa: 1 }),
    piensa: P({ brazoI: [18, -78], brazoD: [22, -150], cabeza: -7, cejas: "una", sonrisa: 0.2 }),
    ojo: P({ brazoI: [12, 4], brazoD: [28, 172], cejas: "serias", dedoD: true, sonrisa: 0.1 }),
    senala: P({ brazoI: [12, 4], brazoD: [145, 160], cabeza: 6, cejas: "arriba", dedoD: true, sonrisa: 0.8 }),
    celebra: P({ brazoI: [150, 168], brazoD: [150, 168], piernaI: [10, 4], piernaD: [10, 4], cejas: "arriba", sonrisa: 1, anim: "bota" }),
    encoge: P({ brazoI: [38, 105], brazoD: [38, 105], cabeza: 8, cejas: "arriba", sonrisa: 0.3 }),
    pulgar: P({ brazoI: [12, 4], brazoD: [24, 125], cabeza: 4, pulgarD: true, sonrisa: 1 }),
    taza: P({ brazoI: [12, 4], brazoD: [24, 150], cabeza: -4, cejas: "arriba", objeto: "taza", sonrisa: 0.7 }),
    capsula: P({ brazoI: [12, 4], brazoD: [140, 168], cabeza: 5, objeto: "capsula", sonrisa: 0.8 }),
    bosteza: P({ brazoI: [12, 4], brazoD: [24, -158], cabeza: -10, bocaMin: 0.9, ojosMedio: true, sonrisa: 0 }),
    corre: P({ brazoI: [20, 90], brazoD: [20, 90], piernaI: [20, 0], piernaD: [20, 0], cejas: "serias", anim: "corre", sonrisa: 0.4, brillo: ["cuadriceps", "gemelo"] }),
    curl: P({ brazoI: [10, 4], brazoD: [8, 30], cejas: "serias", mancuernaD: true, anim: "curl", sonrisa: 0.3, brillo: ["biceps"] }),
    potencia: P({ brazoI: [150, 168], brazoD: [150, 168], piernaI: [10, 4], piernaD: [10, 4], cejas: "serias", anim: "salta", sonrisa: 0.5, brillo: ["cuadriceps", "gluteo"] })
  };

  var mix = function (a, b, t) { return a + (b - a) * t; };
  var mix2 = function (a, b, t) { return [mix(a[0], b[0], t), mix(a[1], b[1], t)]; };
  function mezclar(a, b, t) {
    var o = Object.assign({}, t < 0.5 ? a : b);
    o.brazoI = mix2(a.brazoI, b.brazoI, t); o.brazoD = mix2(a.brazoD, b.brazoD, t);
    o.piernaI = mix2(a.piernaI, b.piernaI, t); o.piernaD = mix2(a.piernaD, b.piernaD, t);
    o.cabeza = mix(a.cabeza, b.cabeza, t); o.sonrisa = mix(a.sonrisa, b.sonrisa, t);
    return o;
  }

  // Animación propia de cada pose (f = fotogramas a 30 por segundo desde que empezó)
  function animar(p, f) {
    var o = Object.assign({}, p), s, c;
    if (p.anim === "corre") {
      s = Math.sin(f / 4.2);
      var li = Math.max(0, s), ld = Math.max(0, -s);
      o.brazoI = [18 + 10 * ld, 70 + 70 * ld - 30 * li]; o.brazoD = [18 + 10 * li, 70 + 70 * li - 30 * ld];
      o.piernaI = [6 + 34 * li, 4 - 70 * li]; o.piernaD = [6 + 34 * ld, 4 - 70 * ld];
      return { pose: o, dy: -Math.abs(s) * 18 };
    }
    if (p.anim === "curl") {
      c = (1 - Math.cos(f / 7)) / 2;
      o.brazoD = [8, mix(10, -150, c)];
      return { pose: o, dy: 0 };
    }
    if (p.anim === "salta") {
      c = Math.abs(Math.sin(f / 7));
      o.piernaI = [mix(40, 6, c), mix(-40, 2, c)]; o.piernaD = o.piernaI.slice();
      return { pose: o, dy: -c * 60 + (1 - c) * 30 };
    }
    if (p.anim === "saluda") {
      s = Math.sin(f / 2.6);
      o.brazoD = [128 + 6 * s, 160 + 26 * s];
      return { pose: o, dy: 0 };
    }
    if (p.anim === "bota") {
      c = Math.abs(Math.sin(f / 5));
      o.brazoI = [150 + 8 * c, 168 - 14 * c]; o.brazoD = [150 + 8 * c, 168 - 14 * c];
      return { pose: o, dy: -c * 22 };
    }
    return { pose: o, dy: 0 };
  }

  // ---------- Dibujo ----------
  var rad = function (g) { return g * Math.PI / 180; };
  var r1 = function (n) { return Math.round(n * 10) / 10; };
  function fin(x, y, a, l, lado) { return { x: x + lado * Math.sin(rad(a)) * l, y: y + Math.cos(rad(a)) * l }; }
  function extremo(x, y, ang, largo, lado) { var a = fin(x, y, ang[0], largo[0], lado); return { codo: a, mano: fin(a.x, a.y, ang[1], largo[1], lado) }; }
  function linea(a, b, color, w) { return '<line x1="' + r1(a.x) + '" y1="' + r1(a.y) + '" x2="' + r1(b.x) + '" y2="' + r1(b.y) + '" stroke="' + color + '" stroke-width="' + w + '" stroke-linecap="round"/>'; }
  function extremidad(x, y, ang, largo, grosor, lado, brA, brB) {
    var e = extremo(x, y, ang, largo, lado);
    return linea({ x: x, y: y }, e.codo, brA ? LIMA : HUESO, grosor) + linea(e.codo, e.mano, brB ? LIMA : HUESO, grosor * 0.92);
  }
  function mano(x, y, ang, lado, o) {
    var s = "";
    if (o.objeto === "taza") {
      s += '<g transform="translate(' + r1(x + lado * 30) + ' ' + r1(y - 10) + ')">' +
        '<path d="M-30 -40 L30 -40 L24 22 Q22 34 10 34 L-10 34 Q-22 34 -24 22 Z" fill="' + HUESO + '" stroke="' + NEGRO + '" stroke-width="5"/>' +
        '<path d="M28 -26 Q52 -24 48 -4 Q44 12 26 10" fill="none" stroke="' + HUESO + '" stroke-width="9"/>' +
        '<rect x="-30" y="-46" width="60" height="10" rx="5" fill="#6B3E1F"/>' +
        '<rect x="-24" y="-14" width="48" height="12" fill="' + LIMA + '"/></g>';
    }
    if (o.objeto === "capsula") {
      s += '<g transform="translate(' + r1(x) + ' ' + r1(y - 46) + ') rotate(-25)">' +
        '<rect x="-22" y="-50" width="44" height="100" rx="22" fill="' + HUESO + '" stroke="' + NEGRO + '" stroke-width="5"/>' +
        '<path d="M-22 0 L22 0 L22 28 Q22 50 0 50 Q-22 50 -22 28 Z" fill="' + LIMA + '" stroke="' + NEGRO + '" stroke-width="5"/></g>';
    }
    if (o.mancuerna) {
      s += '<g transform="translate(' + r1(x) + ' ' + r1(y) + ') rotate(' + r1(-lado * ang + 90) + ')">' +
        '<rect x="-46" y="-7" width="92" height="14" rx="6" fill="#8C8C92"/>' +
        '<rect x="-56" y="-22" width="18" height="44" rx="6" fill="' + NEGRO + '" stroke="' + LIMA + '" stroke-width="4"/>' +
        '<rect x="38" y="-22" width="18" height="44" rx="6" fill="' + NEGRO + '" stroke="' + LIMA + '" stroke-width="4"/></g>';
    }
    if (o.dedo) s += linea({ x: x, y: y }, fin(x, y, ang, 34, lado), HUESO, 11);
    if (o.pulgar) s += linea({ x: x, y: y }, { x: x + lado * 8, y: y - 30 }, HUESO, 12);
    return s + '<circle cx="' + r1(x) + '" cy="' + r1(y) + '" r="20" fill="' + HUESO + '"/>';
  }

  var CEJAS = { normal: [0, 0], arriba: [-9, -9], serias: [5, 5], una: [-12, 3] };

  function dibujar(pose, boca, parpado, respira, f, id, mira) {
    boca = Math.max(boca, pose.bocaMin || 0);
    parpado = Math.max(parpado, pose.ojosMedio ? 0.55 : 0);
    var br = {}; (pose.brillo || []).forEach(function (k) { br[k] = true; });
    var destella = 0.65 + 0.35 * Math.sin(f / 5);
    var bI = extremo(-HOMBRO.x, HOMBRO.y, pose.brazoI, BRAZO, -1);
    var bD = extremo(HOMBRO.x, HOMBRO.y, pose.brazoD, BRAZO, 1);
    var cejaY = CABEZA.y - 24, cejas = CEJAS[pose.cejas] || CEJAS.normal, serias = pose.cejas === "serias" ? 4 : 0;
    var sonrisa = pose.sonrisa == null ? 0.5 : pose.sonrisa;
    var mx = (mira ? mira.x : 0) * 5, my = (mira ? mira.y : 0) * 4;
    var s = '<defs><clipPath id="cab-' + id + '"><circle cx="0" cy="' + CABEZA.y + '" r="' + CABEZA.r + '"/></clipPath></defs>';
    // sombra
    s += '<ellipse cx="0" cy="' + (CADERA.y + PIERNA[0] + PIERNA[1] + 22) + '" rx="110" ry="16" fill="' + LIMA + '" opacity=".12"/>';
    // piernas y zapatillas
    s += extremidad(-CADERA.x, CADERA.y, pose.piernaI, PIERNA, G_PIERNA, -1, br.cuadriceps, br.gemelo);
    s += extremidad(CADERA.x, CADERA.y, pose.piernaD, PIERNA, G_PIERNA, 1, br.cuadriceps, br.gemelo);
    [[-CADERA.x, pose.piernaI, -1], [CADERA.x, pose.piernaD, 1]].forEach(function (k) {
      var p = extremo(k[0], CADERA.y, k[1], PIERNA, k[2]).mano;
      s += '<ellipse cx="' + r1(p.x + k[2] * 12) + '" cy="' + r1(p.y + 14) + '" rx="32" ry="15" fill="' + HUESO + '"/>';
      s += '<rect x="' + r1(p.x + k[2] * 12 - 30) + '" y="' + r1(p.y + 20) + '" width="60" height="6" rx="3" fill="' + LIMA + '"/>';
    });
    // pantalón
    s += '<rect x="-52" y="-8" width="104" height="58" rx="16" fill="' + (br.gluteo ? LIMA : SHORT) + '" opacity="' + (br.gluteo ? r1(destella) : 1) + '"/>';
    s += '<rect x="-52" y="40" width="104" height="6" fill="' + LIMA + '" opacity=".8"/>';
    // cuello y torso (respira)
    s += '<rect x="-11" y="-196" width="22" height="30" rx="8" fill="' + HUESO + '"/>';
    s += '<g transform="translate(0 ' + r1(-respira) + ') scale(1 ' + (1 + respira / 300).toFixed(4) + ')">';
    s += '<rect x="-54" y="-180" width="108" height="186" rx="42" fill="' + LIMA + '"/>';
    if (br.pecho) s += '<rect x="-46" y="-170" width="92" height="50" rx="22" fill="' + HUESO + '" opacity="' + r1(0.35 * destella) + '"/>';
    if (br.abdomen) s += '<rect x="-30" y="-108" width="60" height="90" rx="18" fill="' + HUESO + '" opacity="' + r1(0.35 * destella) + '"/>';
    // la curva de lactato en el pecho
    s += '<path d="M-34 -96 L2 -99 Q20 -101 30 -142" fill="none" stroke="' + NEGRO + '" stroke-width="6" stroke-linecap="round"/>';
    s += '<circle cx="2" cy="-99" r="7" fill="' + LIMA + '" stroke="' + NEGRO + '" stroke-width="5"/></g>';
    // brazos y manos
    s += extremidad(-HOMBRO.x, HOMBRO.y, pose.brazoI, BRAZO, G_BRAZO, -1, false, false);
    s += extremidad(HOMBRO.x, HOMBRO.y, pose.brazoD, BRAZO, G_BRAZO, 1, br.biceps, false);
    if (br.hombro) s += '<circle cx="' + -HOMBRO.x + '" cy="' + HOMBRO.y + '" r="22" fill="' + LIMA + '" opacity="' + r1(destella) + '"/><circle cx="' + HOMBRO.x + '" cy="' + HOMBRO.y + '" r="22" fill="' + LIMA + '" opacity="' + r1(destella) + '"/>';
    s += mano(bI.mano.x, bI.mano.y, pose.brazoI[1], -1, { dedo: pose.dedoI });
    s += mano(bD.mano.x, bD.mano.y, pose.brazoD[1], 1, { dedo: pose.dedoD, pulgar: pose.pulgarD, mancuerna: pose.mancuernaD, objeto: pose.objeto });
    // cabeza
    var cy = CABEZA.y;
    s += '<g transform="rotate(' + r1(pose.cabeza + mx * 0.8) + ' 0 ' + (cy + 40) + ')">';
    s += '<circle cx="0" cy="' + cy + '" r="' + CABEZA.r + '" fill="' + HUESO + '"/>';
    s += '<g clip-path="url(#cab-' + id + ')"><rect x="-70" y="' + (cy - 52) + '" width="140" height="18" fill="' + LIMA + '"/></g>';
    s += '<path d="M' + (CABEZA.r - 6) + ' ' + (cy - 44) + ' l22 -10 l-4 18 z M' + (CABEZA.r - 6) + ' ' + (cy - 40) + ' l24 6 l-12 12 z" fill="' + LIMA + '"/>';
    s += '<g transform="translate(' + r1(mx) + ' ' + r1(my) + ')">';
    s += '<line x1="-34" y1="' + (cejaY + cejas[0]) + '" x2="-12" y2="' + (cejaY + cejas[0] + serias) + '" stroke="' + NEGRO + '" stroke-width="6" stroke-linecap="round"/>';
    s += '<line x1="12" y1="' + (cejaY + cejas[1] + serias) + '" x2="34" y2="' + (cejaY + cejas[1]) + '" stroke="' + NEGRO + '" stroke-width="6" stroke-linecap="round"/>';
    var ry = r1(Math.max(1.2, 10 * (1 - parpado))), brilloOjo = r1(2.6 * (1 - parpado));
    s += '<ellipse cx="-22" cy="' + (cy - 4) + '" rx="8" ry="' + ry + '" fill="' + NEGRO + '"/><ellipse cx="22" cy="' + (cy - 4) + '" rx="8" ry="' + ry + '" fill="' + NEGRO + '"/>';
    s += '<circle cx="-19" cy="' + (cy - 8) + '" r="' + brilloOjo + '" fill="' + HUESO + '"/><circle cx="25" cy="' + (cy - 8) + '" r="' + brilloOjo + '" fill="' + HUESO + '"/>';
    if (boca < 0.08) {
      s += '<path d="M-16 ' + (cy + 26) + ' Q0 ' + r1(cy + 26 + 14 * sonrisa) + ' 16 ' + (cy + 26) + '" fill="none" stroke="' + NEGRO + '" stroke-width="6" stroke-linecap="round"/>';
    } else {
      s += '<ellipse cx="0" cy="' + (cy + 30) + '" rx="' + r1(13 + 5 * boca) + '" ry="' + r1(3 + 15 * boca) + '" fill="' + NEGRO + '"/>';
      s += '<ellipse cx="0" cy="' + r1(cy + 30 + 9 * boca) + '" rx="' + r1(7 + 3 * boca) + '" ry="' + r1(2 + 5 * boca) + '" fill="#E2475B" opacity=".9"/>';
    }
    s += "</g></g>";
    return s;
  }

  // Muelle como el de los reels (damping 14, stiffness 170, mass 0,7): rebota un poco al cambiar de pose
  function muelle(seg) {
    if (seg >= 0.9) return 1;
    var w0 = 15.58, z = 0.642, wd = w0 * Math.sqrt(1 - z * z), e = Math.exp(-z * w0 * seg);
    return 1 - e * (Math.cos(wd * seg) + (z * w0 / wd) * Math.sin(wd * seg));
  }

  // ---------- Instancias ----------
  var reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var NS = "http://www.w3.org/2000/svg";
  var todos = [], n = 0;
  var ahora = function () { return performance.now(); };

  function Lac(el) {
    var self = this;
    this.el = el; this.id = "lac" + (++n);
    this.base = el.getAttribute("data-lac") || "normal";
    this.hover = el.getAttribute("data-lac-hover");
    this.cycle = (el.getAttribute("data-lac-cycle") || "").split(",").filter(Boolean);
    this.says = (el.getAttribute("data-lac-says") || "").split("|");
    this.k = -1;
    this.desfase = Math.random() * 100;
    this.mira = { x: 0, y: 0 }; this.miraObj = { x: 0, y: 0 };
    this.talkUntil = 0; this.visible = true;
    this.svg = document.createElementNS(NS, "svg");
    this.svg.setAttribute("viewBox", VB.x + " " + VB.y + " " + VB.w + " " + VB.h);
    this.svg.setAttribute("aria-hidden", "true");
    this.svg.setAttribute("focusable", "false");
    this.g = document.createElementNS(NS, "g");
    this.svg.appendChild(this.g);
    el.appendChild(this.svg);
    if (el.hasAttribute("data-lac-hello") || this.says.length > 1) {
      this.bubble = document.createElement("span");
      this.bubble.className = "lac-bubble";
      this.bubble.setAttribute("aria-live", "polite");
      el.appendChild(this.bubble);
    }
    var p = POSES[this.base] || POSES.normal;
    this.desde = p; this.hacia = this.base; this.t0 = -1e9; this.a0 = ahora();
    this.pinta(ahora());

    if (this.cycle.length) {
      el.addEventListener("click", function (ev) { ev.preventDefault(); self.siguiente(); });
    }
    if (this.hover) {
      var cont = el.parentElement;
      if (matchMedia("(hover: hover)").matches) {
        cont.addEventListener("mouseenter", function () { self.pose(self.hover); });
        cont.addEventListener("mouseleave", function () { self.pose(self.base); });
        cont.addEventListener("focusin", function () { self.pose(self.hover); });
        cont.addEventListener("focusout", function () { self.pose(self.base); });
      } else if (window.IntersectionObserver) {
        new IntersectionObserver(function (es) {
          es.forEach(function (e) { self.pose(e.intersectionRatio > 0.6 ? self.hover : self.base); });
        }, { threshold: [0, 0.6, 1] }).observe(cont);
      }
    }
    this.coloca();
    if (window.ResizeObserver) new ResizeObserver(function () { self.coloca(); }).observe(el.parentElement);
    window.addEventListener("resize", function () { self.coloca(); });
  }

  // Pone los pies de Lac donde dice data-lac-on
  Lac.prototype.coloca = function () {
    var el = this.el, cont = el.parentElement, on = el.getAttribute("data-lac-on") || "top";
    var h = el.offsetHeight, w = el.offsetWidth;
    if (!h) return;
    var cr = cont.getBoundingClientRect(), x, y;
    if (on.indexOf("chart:") === 0) {
      var svg = cont.querySelector("svg.chart");
      if (!svg || !svg.getScreenCTM) return;
      var xy = on.slice(6).split(",").map(Number), m = svg.getScreenCTM();
      if (!m) return;
      var pt = svg.createSVGPoint(); pt.x = xy[0]; pt.y = xy[1];
      var q = pt.matrixTransform(m);
      x = q.x - cr.left; y = q.y - cr.top;
    } else if (on === "img") {
      var img = cont.querySelector("img");
      if (!img) return;
      var ir = img.getBoundingClientRect();
      x = ir.right - cr.left - w * 0.55 - 8; y = ir.bottom - cr.top;
    } else if (on === "fixed") {
      return; // el acompañante va fijo en la esquina (CSS)
    } else {
      x = cr.width - w / 2 - 24; y = 0;
    }
    el.style.left = Math.round(x - w / 2) + "px";
    el.style.top = Math.round(y - h * (PIES - VB.y) / VB.h) + "px";
  };

  // Cambia de pose con transición
  Lac.prototype.pose = function (nombre) {
    if (nombre === this.hacia) return;
    var t = ahora();
    this.desde = this.actual || POSES[this.hacia] || POSES.normal;
    this.hacia = nombre; this.t0 = t; this.a0 = t;
    if (reduced) this.pinta(t);
  };

  Lac.prototype.habla = function (texto, ms) {
    if (!this.bubble || !texto) return;
    var self = this;
    this.bubble.textContent = texto;
    this.bubble.classList.add("is-on");
    this.talkUntil = ahora() + Math.min(2600, 380 + texto.length * 55);
    clearTimeout(this.tb);
    this.tb = setTimeout(function () { self.bubble.classList.remove("is-on"); }, ms || 3600);
    if (reduced) this.pinta(ahora());
  };

  Lac.prototype.siguiente = function () {
    this.k = (this.k + 1) % this.cycle.length;
    this.pose(this.cycle[this.k]);
    this.habla(this.says[this.k]);
  };

  Lac.prototype.pinta = function (t) {
    var f = reduced ? 0 : (t - this.a0) / 1000 * FPS;
    var fg = reduced ? 0 : t / 1000 * FPS;
    var tr = reduced ? 1 : muelle((t - this.t0) / 1000);
    var B = animar(POSES[this.hacia] || POSES.normal, f);
    var pose = tr >= 1 ? B.pose : mezclar(this.desde, B.pose, tr);
    if (tr > 0.5) pose.brillo = B.pose.brillo; else pose.brillo = this.desde.brillo;
    this.actual = pose;
    var dy = B.dy * Math.min(1, tr);

    // habla: la boca se abre y cierra con pausas entre palabras y los antebrazos acompañan
    var boca = 0;
    if (t < this.talkUntil && !reduced) {
      boca = Math.sin(fg * 0.45) < -0.55 ? 0 : Math.max(0, Math.min(1, 0.4 + 0.35 * Math.sin(fg * 1.7) + 0.3 * Math.sin(fg * 0.73 + 1)));
      if (!B.pose.anim && boca > 0.05) {
        var gst = Math.sin(fg / 5.5) * 7 * Math.min(1, boca * 2);
        pose = Object.assign({}, pose, { brazoI: [pose.brazoI[0], pose.brazoI[1] - gst], brazoD: [pose.brazoD[0], pose.brazoD[1] + gst], cabeza: pose.cabeza + gst * 0.25 });
      }
    } else if (t < this.talkUntil) boca = 0.5;

    var ciclo = Math.floor(fg + this.desfase) % 100;
    var parpado = reduced ? 0 : (ciclo < 3 ? [0.5, 1, 0.5][ciclo] : 0);
    var respira = reduced ? 0 : Math.sin((fg + this.desfase) / 20) * 4;
    var rebote = reduced ? 0 : Math.sin((fg + this.desfase) / 20) * 3;
    this.mira.x += (this.miraObj.x - this.mira.x) * 0.12;
    this.mira.y += (this.miraObj.y - this.mira.y) * 0.12;
    this.g.setAttribute("transform", "translate(0 " + r1(dy + rebote) + ")");
    this.g.innerHTML = dibujar(pose, boca, parpado, respira, fg, this.id, this.mira);
  };

  // Mira hacia el puntero (solo ratón)
  function mirar(ev) {
    todos.forEach(function (l) {
      if (!l.visible) return;
      var r = l.el.getBoundingClientRect();
      var cx = r.left + r.width / 2, cy = r.top + r.height * 0.2;
      var dx = (ev.clientX - cx) / 400, dy = (ev.clientY - cy) / 400;
      l.miraObj = { x: Math.max(-1, Math.min(1, dx)), y: Math.max(-1, Math.min(1, dy)) };
    });
  }

  function bucle(t) {
    todos.forEach(function (l) { if (l.visible) l.pinta(t); });
    requestAnimationFrame(bucle);
  }

  // El acompañante: cuando el Lac de arriba (portada o cabecera) sale de la pantalla,
  // aparece en la esquina inferior derecha y baja contigo. Corre mientras haces scroll,
  // se para cuando paras y se despide al llegar al pie. Se esconde si hay otro Lac grande a la vista.
  function crearAcompanante() {
    var guia = document.querySelector(".lac-hero, .lac-page");
    if (!guia) return null;
    var b = document.createElement("button");
    b.type = "button";
    b.className = "lac lac-sigue";
    b.setAttribute("data-lac", "normal");
    b.setAttribute("data-lac-on", "fixed");
    b.setAttribute("data-lac-cycle", "saluda,piensa,pulgar,celebra");
    b.setAttribute("data-lac-says", "¡Hola! Soy Lac.|Cada dato, con su fuente.|Si no se sabe, te lo digo.|¡Sigue así!");
    b.setAttribute("aria-label", "Lac, la mascota de Lactac. Púlsalo para que hable.");
    document.body.appendChild(b);
    return { el: b, guia: guia };
  }

  function activarAcompanante(a) {
    var lac = null;
    todos.forEach(function (l) { if (l.el === a.el) lac = l; });
    if (!lac || !window.IntersectionObserver) return;
    var tapan = [a.guia].concat(Array.prototype.slice.call(document.querySelectorAll(".lac-join")));
    var aVista = {}, pie = false, saludado = false, despedido = false, parado;
    var actualiza = function () {
      var otro = tapan.some(function (el, i) { return aVista[i]; });
      var dentro = !otro && window.scrollY > 40;
      if (dentro && !a.el.classList.contains("is-in")) {
        a.el.classList.add("is-in");
        if (!saludado) { saludado = true; lac.habla("¡Te acompaño!", 2200); }
      } else if (!dentro && a.el.classList.contains("is-in")) {
        a.el.classList.remove("is-in");
      }
      a.el.tabIndex = dentro ? 0 : -1;
    };
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { aVista[tapan.indexOf(e.target)] = e.isIntersecting; });
      actualiza();
    }, { threshold: 0.15 });
    tapan.forEach(function (el) { io.observe(el); });
    a.el.tabIndex = -1;

    var footer = document.querySelector(".footer");
    if (footer) new IntersectionObserver(function (es) {
      pie = es[0].isIntersecting;
      if (pie && !despedido && a.el.classList.contains("is-in")) {
        despedido = true; lac.pose("saluda"); lac.habla("¡Hasta la próxima!", 2600);
        setTimeout(function () { if (lac.hacia === "saluda") lac.pose("normal"); }, 2600);
      }
    }, { threshold: 0.3 }).observe(footer);

    if (reduced) return;
    window.addEventListener("scroll", function () {
      actualiza();
      if (!a.el.classList.contains("is-in")) return;
      if (lac.hacia !== "corre" && lac.hacia !== "saluda") lac.pose("corre");
      clearTimeout(parado);
      parado = setTimeout(function () { if (lac.hacia === "corre") lac.pose("normal"); }, 260);
    }, { passive: true });
  }

  function init() {
    var acomp = crearAcompanante();
    var els = Array.prototype.slice.call(document.querySelectorAll("[data-lac]"));
    if (!els.length) return;
    document.documentElement.classList.add("has-lac");
    els.forEach(function (el) {
      try { todos.push(new Lac(el)); } catch (e) { console.warn("[lac]", e); }
    });
    if (acomp) { try { activarAcompanante(acomp); } catch (e) { console.warn("[lac]", e); } }
    // Recoloca cuando cargan las fuentes (cambian la altura del texto)
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { todos.forEach(function (l) { l.coloca(); }); });
    window.addEventListener("load", function () { todos.forEach(function (l) { l.coloca(); }); });

    // Saludo al aparecer
    todos.forEach(function (l) {
      if (l.el.classList.contains("lac-sigue")) return; // el acompañante aparece por su cuenta
      var hola = l.el.getAttribute("data-lac-hello");
      var aparece = function () {
        l.el.classList.add("is-in");
        if (hola) { l.pose("saluda"); l.habla(hola, 3400); setTimeout(function () { if (l.hacia === "saluda") l.pose(l.base); }, 3000); }
      };
      if (reduced || !window.IntersectionObserver) { l.el.classList.add("is-in"); return; }
      var io = new IntersectionObserver(function (es) {
        if (es[0].isIntersecting) { io.disconnect(); setTimeout(aparece, l.el.hasAttribute("data-lac-delay") ? +l.el.getAttribute("data-lac-delay") : 150); }
      }, { threshold: 0.4 });
      io.observe(l.el);
    });

    if (reduced) return;
    if (window.IntersectionObserver) {
      var vis = new IntersectionObserver(function (es) {
        es.forEach(function (e) { todos.forEach(function (l) { if (l.el === e.target) l.visible = e.isIntersecting; }); });
      }, { rootMargin: "120px" });
      todos.forEach(function (l) { vis.observe(l.el); });
    }
    if (matchMedia("(pointer: fine)").matches) window.addEventListener("pointermove", mirar, { passive: true });
    requestAnimationFrame(bucle);
  }

  window.LAC = { poses: POSES };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
