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

  // Front/Back paneli: genislik x H. Sol/sag kenarlar dikey dikislere parmakli (tam H boyunca).
  // Alt kenar: [duz(t)] + [parmakli orta kisim, taban paneline kilitlenir] + [duz(t)] — koseler duz
  // kalir cunku o bolgeler Sol/Sag panelin kalinligina denk gelir, taban orada degil.
  function frontBackPanel(width, H, t, kerf, nV, nH, rightOut, bottomOut) {
    const depth = t - kerf;
    let pts = [{ x: t, y: 0 }];
    pts = pts.concat(fingerEdge(pts[pts.length - 1], { x: 1, y: 0 }, { x: 0, y: -1 }, width - 2 * t, nH, depth, bottomOut)); // alt orta, parmakli
    pts.push({ x: width, y: 0 }); // sag alt koseye duz tamamlama
    pts = pts.concat(fingerEdge(pts[pts.length - 1], { x: 0, y: 1 }, { x: 1, y: 0 }, H, nV, depth, rightOut)); // sag kenar, yukari
    pts = pts.concat(straightEdge(pts[pts.length - 1], { x: -1, y: 0 }, width)); // ust: saga->sola, acik ust
    pts = pts.concat(fingerEdge(pts[pts.length - 1], { x: 0, y: -1 }, { x: -1, y: 0 }, H, nV, depth, !rightOut)); // sol kenar, asagi
    pts.push({ x: t, y: 0 }); // sol alt koseye duz tamamlama, kapanis
    return { points: pts, w: width, h: H };
  }

  // Sol/Sag paneli: Wi x H. On/arka kenarlar (front/back'in sag/sol kenarina) tam H boyunca parmakli.
  // Alt kenar tamamen parmakli (koseler yok, taban paneli buraya tam oturuyor).
  function leftRightPanel(Wi, H, t, kerf, nV, nH, rightOut, bottomOut) {
    const depth = t - kerf;
    let pts = [{ x: 0, y: 0 }];
    pts = pts.concat(fingerEdge(pts[pts.length - 1], { x: 1, y: 0 }, { x: 0, y: -1 }, Wi, nH, depth, bottomOut)); // alt kenar, tam parmakli
    pts = pts.concat(fingerEdge(pts[pts.length - 1], { x: 0, y: 1 }, { x: 1, y: 0 }, H, nV, depth, rightOut)); // sag kenar, yukari
    pts = pts.concat(straightEdge(pts[pts.length - 1], { x: -1, y: 0 }, Wi)); // ust, acik ust
    pts = pts.concat(fingerEdge(pts[pts.length - 1], { x: 0, y: -1 }, { x: -1, y: 0 }, H, nV, depth, !rightOut)); // sol kenar, asagi, otomatik kapanir
    return { points: pts, w: Wi, h: H };
  }

  // Taban paneli: Li x Wi, dort kenari de parmakli — iki uzun kenar (Li) On/Arka'nin orta
  // kismina, iki kisa kenar (Wi) Sol/Sag'in tam alt kenarina kilitlenir.
  function bottomPanel(Li, Wi, t, kerf, nH_L, nH_W) {
    const depth = t - kerf;
    let pts = [{ x: 0, y: 0 }];
    pts = pts.concat(fingerEdge(pts[pts.length - 1], { x: 1, y: 0 }, { x: 0, y: -1 }, Li, nH_L, depth, false)); // alt (Li) — On'un tamamlayicisi
    pts = pts.concat(fingerEdge(pts[pts.length - 1], { x: 0, y: 1 }, { x: 1, y: 0 }, Wi, nH_W, depth, false)); // sag (Wi) — Sag panelin tamamlayicisi
    pts = pts.concat(fingerEdge(pts[pts.length - 1], { x: -1, y: 0 }, { x: 0, y: 1 }, Li, nH_L, depth, false)); // ust (Li) — Arka'nin tamamlayicisi
    pts = pts.concat(fingerEdge(pts[pts.length - 1], { x: 0, y: -1 }, { x: -1, y: 0 }, Wi, nH_W, depth, false)); // sol (Wi) — Sol panelin tamamlayicisi
    return { points: pts, w: Li, h: Wi };
  }

  function buildPanels(L, W, H, t, kerf, fingerTarget) {
    const Wi = W - 2 * t; // Sol/Sag panel genisligi (On/Arka arasina oturur)
    const Li = L - 2 * t; // Taban panelinin uzun kenari, On/Arka'nin orta (parmakli) kismiyla ayni
    const nV = fingerCount(H, fingerTarget);
    const nH_L = fingerCount(Li, fingerTarget);
    const nH_W = fingerCount(Wi, fingerTarget);

    const front = frontBackPanel(L, H, t, kerf, nV, nH_L, true, true);
    const back = frontBackPanel(L, H, t, kerf, nV, nH_L, true, true);
    const left = leftRightPanel(Wi, H, t, kerf, nV, nH_W, false, true);
    const right = leftRightPanel(Wi, H, t, kerf, nV, nH_W, false, true);
    const bottom = bottomPanel(Li, Wi, t, kerf, nH_L, nH_W);

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
