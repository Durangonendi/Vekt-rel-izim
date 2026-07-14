// İsimlik araci — metni opentype.js ile harf konturlarina cevirir, bir alt plaka
// ile birlikte kesime hazir SVG/DXF uretir. Harfler plakaya YAPISTIRILIR (2 katmanli
// tasarim) — bu sayede harflerin ic bosluklari (O, A, B ic konturlari) veya nokta gibi
// ayrik parcalar (i noktasi) icin herhangi bir birlestirme/bridge sorunu olmuyor;
// font'un kendi kontur yapisi zaten dogru sekilde kesiliyor, geri kalani yapistirma isi.
(function () {
  "use strict";
  const { buildDXF, download } = VC;
  const isEn = document.documentElement.lang === "en";
  const fontUrl = (isEn ? "../fonts/" : "fonts/") + "Poppins-Bold.ttf";

  let loadedFont = null;

  function flattenCubic(p0, p1, p2, p3, segments, out) {
    for (let i = 1; i <= segments; i++) {
      const t = i / segments, mt = 1 - t;
      out.push({
        x: mt * mt * mt * p0.x + 3 * mt * mt * t * p1.x + 3 * mt * t * t * p2.x + t * t * t * p3.x,
        y: mt * mt * mt * p0.y + 3 * mt * mt * t * p1.y + 3 * mt * t * t * p2.y + t * t * t * p3.y,
      });
    }
  }

  function flattenQuad(p0, p1, p2, segments, out) {
    for (let i = 1; i <= segments; i++) {
      const t = i / segments, mt = 1 - t;
      out.push({
        x: mt * mt * p0.x + 2 * mt * t * p1.x + t * t * p2.x,
        y: mt * mt * p0.y + 2 * mt * t * p1.y + t * t * p2.y,
      });
    }
  }

  function pathToContours(path) {
    const contours = [];
    let cur = null, last = { x: 0, y: 0 };
    for (const cmd of path.commands) {
      if (cmd.type === "M") {
        cur = [{ x: cmd.x, y: cmd.y }];
        last = { x: cmd.x, y: cmd.y };
      } else if (cmd.type === "L") {
        cur.push({ x: cmd.x, y: cmd.y });
        last = { x: cmd.x, y: cmd.y };
      } else if (cmd.type === "C") {
        flattenCubic(last, { x: cmd.x1, y: cmd.y1 }, { x: cmd.x2, y: cmd.y2 }, { x: cmd.x, y: cmd.y }, 8, cur);
        last = { x: cmd.x, y: cmd.y };
      } else if (cmd.type === "Q") {
        flattenQuad(last, { x: cmd.x1, y: cmd.y1 }, { x: cmd.x, y: cmd.y }, 8, cur);
        last = { x: cmd.x, y: cmd.y };
      } else if (cmd.type === "Z") {
        if (cur && cur.length >= 3) contours.push(cur);
        cur = null;
      }
    }
    return contours;
  }

  function textToContours(font, text, fontSize) {
    const glyphs = font.stringToGlyphs(text);
    let x = 0;
    const contours = [];
    for (const glyph of glyphs) {
      const gPath = glyph.getPath(x, 0, fontSize);
      for (const c of pathToContours(gPath)) contours.push(c);
      x += glyph.advanceWidth * (fontSize / font.unitsPerEm);
    }
    return contours;
  }

  function bboxOf(contours) {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const c of contours) for (const p of c) {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }
    return { minX, maxX, minY, maxY };
  }

  function buildIsimlik(font, text, heightMM, marginMM, addHole) {
    const probe = textToContours(font, text, font.unitsPerEm);
    const pb = bboxOf(probe);
    const scale = heightMM / (pb.maxY - pb.minY);
    const fontSize = font.unitsPerEm * scale;

    const contours = textToContours(font, text, fontSize);
    const b = bboxOf(contours);
    const textW = b.maxX - b.minX, textH = b.maxY - b.minY;
    const plateW = textW + 2 * marginMM, plateH = textH + 2 * marginMM;

    // opentype.js getPath() already returns y-down (canvas-style) coordinates
    // (baseline=0, ascenders negative) — no vertical flip needed here, just a shift.
    function toPlate(p) {
      return { x: p.x - b.minX + marginMM, y: p.y - b.minY + marginMM };
    }

    const panels = [];
    panels.push({
      points: [{ x: 0, y: 0 }, { x: plateW, y: 0 }, { x: plateW, y: plateH }, { x: 0, y: plateH }],
      ox: 0, oy: 0, name: isEn ? "Backing plate" : "Alt Plaka", isPlate: true,
    });

    if (addHole) {
      const holeR = 2.5, cx = plateW / 2, cy = Math.min(marginMM / 2, plateH * 0.15);
      const holePts = [];
      for (let i = 0; i < 24; i++) {
        const a = (i / 24) * Math.PI * 2;
        holePts.push({ x: cx + holeR * Math.cos(a), y: cy + holeR * Math.sin(a) });
      }
      panels.push({ points: holePts, ox: 0, oy: 0, name: isEn ? "Hanging hole" : "Asma Deliği", isHole: true });
    }

    for (const c of contours) {
      panels.push({ points: c.map(toPlate), ox: 0, oy: 0, name: isEn ? "Letter" : "Harf" });
    }

    return { panels, plateW, plateH };
  }

  function renderIsimlikSVG(build) {
    const pad = 10;
    let inner = `<rect x="0" y="0" width="${build.plateW.toFixed(2)}" height="${build.plateH.toFixed(2)}" fill="#F0F2F5" stroke="#1B2E4B" stroke-width="0.6"/>`;
    for (const p of build.panels) {
      if (p.isPlate) continue;
      const pts = p.points.map((pt) => `${pt.x.toFixed(2)},${pt.y.toFixed(2)}`).join(" ");
      const color = p.isHole ? "#3498DB" : "#E74C3C";
      inner += `<polygon points="${pts}" fill="${p.isHole ? "#fff" : "none"}" stroke="${color}" stroke-width="0.5"/>`;
    }
    const w = build.plateW + 2 * pad, h = build.plateH + 2 * pad;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-pad} ${-pad} ${w} ${h}" width="600" height="${Math.round((600 * h) / w)}">${inner}</svg>`;
  }

  let currentSVG = "", currentDXF = "";

  function ciz() {
    if (!loadedFont) return;
    const text = document.getElementById("metin").value.trim();
    const heightMM = Number(document.getElementById("harfYuksekligi").value);
    const marginMM = Number(document.getElementById("kenarPayi").value);
    const addHole = document.getElementById("askiDeligi").checked;

    if (!text) {
      document.getElementById("boyutBilgisi").textContent = isEn
        ? "Please enter some text."
        : "Lütfen bir metin girin.";
      return;
    }

    const build = buildIsimlik(loadedFont, text, heightMM, marginMM, addHole);
    currentSVG = renderIsimlikSVG(build);
    currentDXF = buildDXF(build.panels, build.plateH);

    document.getElementById("previewWrap").innerHTML = currentSVG;
    document.getElementById("boyutBilgisi").textContent = isEn
      ? `Plate size: ${Math.round(build.plateW)} x ${Math.round(build.plateH)} mm`
      : `Plaka ölçüsü: ${Math.round(build.plateW)} x ${Math.round(build.plateH)} mm`;
    document.getElementById("downloads").style.display = "flex";
  }

  document.getElementById("cizBtn").addEventListener("click", ciz);
  document.getElementById("svgBtn").addEventListener("click", () => download("isimlik.svg", currentSVG, "image/svg+xml"));
  document.getElementById("dxfBtn").addEventListener("click", () => download("isimlik.dxf", currentDXF, "application/dxf"));

  document.getElementById("boyutBilgisi").textContent = isEn ? "Loading font…" : "Font yükleniyor…";
  opentype.load(fontUrl, function (err, font) {
    if (err) {
      document.getElementById("boyutBilgisi").textContent = isEn
        ? "Font failed to load. Please refresh the page."
        : "Font yüklenemedi. Sayfayı yenileyin.";
      return;
    }
    loadedFont = font;
    ciz();
  });
})();
