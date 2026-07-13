// Parmak geçmeli (finger joint) kutu paneli üretici — açık üstlü, 5 panel.
(function () {
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

  // Front/Back paneli: L x H, sol/sag kenarlar parmakli (dikey dikislere), ust/alt duz.
  function sideWallPanel(L, H, t, kerf, nV, rightOut) {
    const depth = t - kerf;
    let pts = [{ x: 0, y: 0 }];
    pts = pts.concat(straightEdge(pts[pts.length - 1], { x: 1, y: 0 }, L)); // alt: sola->saga
    pts = pts.concat(fingerEdge(pts[pts.length - 1], { x: 0, y: 1 }, { x: 1, y: 0 }, H, nV, depth, rightOut)); // sag kenar, yukari, disa=+x
    pts = pts.concat(straightEdge(pts[pts.length - 1], { x: -1, y: 0 }, L)); // ust: saga->sola
    pts = pts.concat(fingerEdge(pts[pts.length - 1], { x: 0, y: -1 }, { x: -1, y: 0 }, H, nV, depth, !rightOut)); // sol kenar, asagi, disa=-x
    return { points: pts, w: L, h: H };
  }

  // Sol/Sag paneli: (W-2t) x H, on/arka kenarlar parmakli (front panelin sag/sol kenariyla tamamlayici).
  function endWallPanel(Wi, H, t, kerf, nV, rightOut) {
    return sideWallPanel(Wi, H, t, kerf, nV, rightOut);
  }

  function bottomPanel(Li, Wi) {
    return {
      points: [{ x: 0, y: 0 }, { x: Li, y: 0 }, { x: Li, y: Wi }, { x: 0, y: Wi }],
      w: Li, h: Wi,
    };
  }

  function buildPanels(L, W, H, t, kerf, fingerTarget) {
    const Wi = W - 2 * t; // yan panellerin genisligi (on/arka arasina oturur)
    const Li = L - 2 * t; // alt panelin uzunlugu
    const nV = fingerCount(H, fingerTarget);

    const front = sideWallPanel(L, H, t, kerf, nV, true);
    const back = sideWallPanel(L, H, t, kerf, nV, true);
    const left = endWallPanel(Wi, H, t, kerf, nV, false);
    const right = endWallPanel(Wi, H, t, kerf, nV, false);
    const bottom = bottomPanel(Li, Wi);

    return [
      { name: "Alt", ...bottom },
      { name: "Ön", ...front },
      { name: "Arka", ...back },
      { name: "Sol", ...left },
      { name: "Sağ", ...right },
    ];
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
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-pad} ${-pad} ${totalW + 2 * pad} ${totalH + 2 * pad}" width="600" height="${Math.round((600 * (totalH + 2 * pad)) / (totalW + 2 * pad))}">${inner}</svg>`;
    return svg;
  }

  function buildDXF(placed) {
    let entities = "";
    for (const p of placed) {
      const pts = p.points.map((pt) => ({ x: pt.x + p.ox, y: pt.y + p.oy }));
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

  let currentSVG = "", currentDXF = "";

  function ciz() {
    const L = Number(document.getElementById("uzunluk").value);
    const W = Number(document.getElementById("genislik").value);
    const H = Number(document.getElementById("yukseklik").value);
    const t = Number(document.getElementById("kalinlik").value);
    const fingerTarget = Number(document.getElementById("parmakHedef").value);
    const kerf = Number(document.getElementById("kerf").value);

    if (W - 2 * t <= 5 || L - 2 * t <= 5) {
      document.getElementById("boyutBilgisi").textContent = "Uzunluk/Genişlik, malzeme kalınlığına göre çok küçük. Ölçüleri kontrol edin.";
      return;
    }

    const panels = buildPanels(L, W, H, t, kerf, fingerTarget);
    const { placed, totalW, totalH } = layoutPanels(panels, 10);

    currentSVG = renderSVG(placed, totalW, totalH);
    currentDXF = buildDXF(placed);

    document.getElementById("previewWrap").innerHTML = currentSVG;
    document.getElementById("boyutBilgisi").textContent = `Toplam yerleşim alanı: ${Math.round(totalW)} x ${Math.round(totalH)} mm`;
    document.getElementById("downloads").style.display = "flex";
  }

  document.getElementById("cizBtn").addEventListener("click", ciz);
  document.getElementById("svgBtn").addEventListener("click", () => download("kutu.svg", currentSVG, "image/svg+xml"));
  document.getElementById("dxfBtn").addEventListener("click", () => download("kutu.dxf", currentDXF, "application/dxf"));

  ciz();
})();
