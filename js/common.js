// Vektörel Çizim ortak geometri/render/indirme yardımcıları.
const VC = (function () {
  "use strict";

  function fingerCount(edgeLen, target) {
    let n = Math.round(edgeLen / target);
    if (n < 3) n = 3;
    return n;
  }

  // start: {x,y} baslangic noktasi, dir: birim yon vektoru, perp: disari dogru birim dik vektor
  // count: parca sayisi, depth: parmak derinligi (malzeme kalinligi - kerf), outStart: ilk parca disa mi
  function fingerEdge(start, dir, perp, length, count, depth, outStart) {
    const segLen = length / count;
    const pts = [];
    let cur = { x: start.x, y: start.y };
    let out = outStart;
    for (let i = 0; i < count; i++) {
      if (out) {
        const p1 = { x: cur.x + perp.x * depth, y: cur.y + perp.y * depth };
        const p2 = { x: p1.x + dir.x * segLen, y: p1.y + dir.y * segLen };
        const p3 = { x: p2.x - perp.x * depth, y: p2.y - perp.y * depth };
        pts.push(p1, p2, p3);
        cur = p3;
      } else {
        const p1 = { x: cur.x + dir.x * segLen, y: cur.y + dir.y * segLen };
        pts.push(p1);
        cur = p1;
      }
      out = !out;
    }
    return pts;
  }

  function straightEdge(start, dir, length) {
    return [{ x: start.x + dir.x * length, y: start.y + dir.y * length }];
  }

  // Bir dikişte iki panel ortak bir eksende (ör. yükseklik) parmak geçme yapacaksa, o eksendeki
  // "düşük uçta" (ör. z=0) hangi panelde çıkıntı olacağını (wantTabAtLowEnd) tayin edip, HER
  // panelin KENDİ çizim yönüne (artan mı azalan mı) göre doğru outStart değerini hesaplar.
  // Bu, "outStart'ı ters çevir" gibi basit bir kural yerine kullanılmalı — çünkü kenar azalan
  // yönde çiziliyorsa (parcayı kapatmak için ters taraftan gelince), gerekli outStart parça
  // sayısının tek/çift olmasına göre değişir. Bu fonksiyon o inceliği tek yerde çözer.
  function outStartFor(increasing, count, wantTabAtLowEnd) {
    if (increasing) return wantTabAtLowEnd;
    const lastFlipped = (count - 1) % 2 === 1;
    return wantTabAtLowEnd !== lastFlipped;
  }

  // Acik ustlu, tamamen parmak gecmeli 5 panelli kutu govdesi — Kutu ve Raf araclarinin ikisi de
  // kullanir. Eksen sozlesmesi: Z=yukseklik (Ön/Arka=true, Sol/Sag=false), X=uzunluk yonu
  // (Ön/Arka=true, Alt=false), Y=genislik yonu (Sol/Sag=true, Alt=false).
  const Z_WALL = true, Z_ENDWALL = false, X_WALL = true, X_CAP = false, Y_WALL = true, Y_CAP = false;

  function frontBackPanel(width, H, t, kerf, nV, nH) {
    const depth = t - kerf;
    let pts = [{ x: t, y: 0 }];
    pts = pts.concat(fingerEdge(pts[pts.length - 1], { x: 1, y: 0 }, { x: 0, y: -1 }, width - 2 * t, nH, depth, outStartFor(true, nH, X_WALL)));
    pts.push({ x: width, y: 0 });
    pts = pts.concat(fingerEdge(pts[pts.length - 1], { x: 0, y: 1 }, { x: 1, y: 0 }, H, nV, depth, outStartFor(true, nV, Z_WALL)));
    pts = pts.concat(straightEdge(pts[pts.length - 1], { x: -1, y: 0 }, width));
    pts = pts.concat(fingerEdge(pts[pts.length - 1], { x: 0, y: -1 }, { x: -1, y: 0 }, H, nV, depth, outStartFor(false, nV, Z_WALL)));
    pts.push({ x: t, y: 0 });
    return { points: pts, w: width, h: H };
  }

  function leftRightPanel(Wi, H, t, kerf, nV, nH) {
    const depth = t - kerf;
    let pts = [{ x: 0, y: 0 }];
    pts = pts.concat(fingerEdge(pts[pts.length - 1], { x: 1, y: 0 }, { x: 0, y: -1 }, Wi, nH, depth, outStartFor(true, nH, Y_WALL)));
    pts = pts.concat(fingerEdge(pts[pts.length - 1], { x: 0, y: 1 }, { x: 1, y: 0 }, H, nV, depth, outStartFor(true, nV, Z_ENDWALL)));
    pts = pts.concat(straightEdge(pts[pts.length - 1], { x: -1, y: 0 }, Wi));
    pts = pts.concat(fingerEdge(pts[pts.length - 1], { x: 0, y: -1 }, { x: -1, y: 0 }, H, nV, depth, outStartFor(false, nV, Z_ENDWALL)));
    return { points: pts, w: Wi, h: H };
  }

  function bottomCapPanel(Li, Wi, t, kerf, nH_L, nH_W) {
    const depth = t - kerf;
    let pts = [{ x: 0, y: 0 }];
    pts = pts.concat(fingerEdge(pts[pts.length - 1], { x: 1, y: 0 }, { x: 0, y: -1 }, Li, nH_L, depth, outStartFor(true, nH_L, X_CAP)));
    pts = pts.concat(fingerEdge(pts[pts.length - 1], { x: 0, y: 1 }, { x: 1, y: 0 }, Wi, nH_W, depth, outStartFor(true, nH_W, Y_CAP)));
    pts = pts.concat(fingerEdge(pts[pts.length - 1], { x: -1, y: 0 }, { x: 0, y: 1 }, Li, nH_L, depth, outStartFor(false, nH_L, X_CAP)));
    pts = pts.concat(fingerEdge(pts[pts.length - 1], { x: 0, y: -1 }, { x: -1, y: 0 }, Wi, nH_W, depth, outStartFor(false, nH_W, Y_CAP)));
    return { points: pts, w: Li, h: Wi };
  }

  function buildOpenBoxPanels(L, W, H, t, kerf, fingerTarget) {
    const Wi = W - 2 * t;
    const Li = L - 2 * t;
    const nV = fingerCount(H, fingerTarget);
    const nH_L = fingerCount(Li, fingerTarget);
    const nH_W = fingerCount(Wi, fingerTarget);
    return {
      Wi, Li, nV, nH_L, nH_W,
      bottom: bottomCapPanel(Li, Wi, t, kerf, nH_L, nH_W),
      front: frontBackPanel(L, H, t, kerf, nV, nH_L),
      back: frontBackPanel(L, H, t, kerf, nV, nH_L),
      left: leftRightPanel(Wi, H, t, kerf, nV, nH_W),
      right: leftRightPanel(Wi, H, t, kerf, nV, nH_W),
    };
  }

  function layoutPanels(panels, gap) {
    let x = 0, y = 0, rowH = 0;
    const maxRowW = 900;
    const placed = [];
    for (const p of panels) {
      if (x + p.w > maxRowW && x > 0) {
        x = 0;
        y += rowH + gap;
        rowH = 0;
      }
      placed.push({ ...p, ox: x, oy: y });
      x += p.w + gap;
      rowH = Math.max(rowH, p.h);
    }
    const totalW = Math.max(...placed.map((p) => p.ox + p.w));
    const totalH = y + rowH;
    return { placed, totalW, totalH };
  }

  function pointsToSvgPolygon(points, ox, oy) {
    return points.map((p) => `${(p.x + ox).toFixed(2)},${(p.y + oy).toFixed(2)}`).join(" ");
  }

  function renderSVG(placed, totalW, totalH) {
    const pad = 10;
    let inner = "";
    for (const p of placed) {
      inner += `<polygon points="${pointsToSvgPolygon(p.points, p.ox, p.oy)}" fill="none" stroke="#E74C3C" stroke-width="0.5"/>`;
      inner += `<text x="${p.ox + p.w / 2}" y="${p.oy + p.h / 2}" font-size="8" fill="#1B2E4B" text-anchor="middle" dominant-baseline="middle">${p.name}</text>`;
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-pad} ${-pad} ${totalW + 2 * pad} ${totalH + 2 * pad}" width="600" height="${Math.round((600 * (totalH + 2 * pad)) / (totalW + 2 * pad))}">${inner}</svg>`;
  }

  // DXF/CAD gorutucler (LightBurn dahil) Y eksenini YUKARI artan kabul eder; bizim tum
  // geometrimiz (SVG onizleme dahil) ekran usulu Y AŞAĞI artan kullanıyor. Bu fark kutu
  // panellerinde sorun yaratmiyordu (butun parca birlikte aynali oldugu icin parmak gecmeler
  // yine birbirine uyuyor) ama metin/yazi iceren cizimlerde ters (bas asagi) gorunmeye
  // sebep oluyor. totalH ile tum cizimi tek seferde dikey aynalayip DXF'i dogru yone ceviriyoruz.
  function buildDXF(placed, totalH) {
    let entities = "";
    for (const p of placed) {
      const pts = p.points.map((pt) => ({ x: pt.x + p.ox, y: totalH - (pt.y + p.oy) }));
      let verts = "";
      for (const v of pts) {
        verts += `10\n${v.x.toFixed(3)}\n20\n${v.y.toFixed(3)}\n`;
      }
      entities += `0\nLWPOLYLINE\n8\n0\n90\n${pts.length}\n70\n1\n43\n0\n${verts}`;
    }
    return `0\nSECTION\n2\nENTITIES\n${entities}0\nENDSEC\n0\nEOF\n`;
  }

  function download(filename, content, mime) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return { fingerCount, fingerEdge, straightEdge, outStartFor, buildOpenBoxPanels, layoutPanels, renderSVG, buildDXF, download };
})();
