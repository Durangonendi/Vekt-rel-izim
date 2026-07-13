// Parmak geçmeli (finger joint) kapalı kutu paneli üretici — 6 panel, tamamen kilitli.
(function () {
  "use strict";
  const { fingerCount, fingerEdge, straightEdge, layoutPanels, renderSVG, buildDXF, download } = VC;

  // Front/Back paneli: genislik x H. Alt VE ust kenarlar [duz(t)]+[parmakli orta]+[duz(t)].
  // Sol/sag kenarlar dikey dikislere tam H boyunca parmakli.
  function frontBackPanel(width, H, t, kerf, nV, nH, rightOut, bottomOut, topOut) {
    const depth = t - kerf;
    let pts = [{ x: t, y: 0 }];
    pts = pts.concat(fingerEdge(pts[pts.length - 1], { x: 1, y: 0 }, { x: 0, y: -1 }, width - 2 * t, nH, depth, bottomOut));
    pts.push({ x: width, y: 0 });
    pts = pts.concat(fingerEdge(pts[pts.length - 1], { x: 0, y: 1 }, { x: 1, y: 0 }, H, nV, depth, rightOut));
    pts.push({ x: width, y: H });
    pts = pts.concat(fingerEdge(pts[pts.length - 1], { x: -1, y: 0 }, { x: 0, y: 1 }, width - 2 * t, nH, depth, topOut));
    pts.push({ x: 0, y: H });
    pts = pts.concat(fingerEdge(pts[pts.length - 1], { x: 0, y: -1 }, { x: -1, y: 0 }, H, nV, depth, !rightOut));
    pts.push({ x: t, y: 0 });
    return { points: pts, w: width, h: H };
  }

  // Sol/Sag paneli: Wi x H. Alt VE ust kenarlar tamamen parmakli. On/arka kenarlar tam H boyunca parmakli.
  function leftRightPanel(Wi, H, t, kerf, nV, nH, rightOut, bottomOut, topOut) {
    const depth = t - kerf;
    let pts = [{ x: 0, y: 0 }];
    pts = pts.concat(fingerEdge(pts[pts.length - 1], { x: 1, y: 0 }, { x: 0, y: -1 }, Wi, nH, depth, bottomOut));
    pts = pts.concat(fingerEdge(pts[pts.length - 1], { x: 0, y: 1 }, { x: 1, y: 0 }, H, nV, depth, rightOut));
    pts = pts.concat(fingerEdge(pts[pts.length - 1], { x: -1, y: 0 }, { x: 0, y: 1 }, Wi, nH, depth, topOut));
    pts = pts.concat(fingerEdge(pts[pts.length - 1], { x: 0, y: -1 }, { x: -1, y: 0 }, H, nV, depth, !rightOut));
    return { points: pts, w: Wi, h: H };
  }

  // Alt/Ust paneli: Li x Wi, dort kenari de parmakli (ayni sekil, ikisi de ayni fonksiyonla uretilir).
  function capPanel(Li, Wi, t, kerf, nH_L, nH_W) {
    const depth = t - kerf;
    let pts = [{ x: 0, y: 0 }];
    pts = pts.concat(fingerEdge(pts[pts.length - 1], { x: 1, y: 0 }, { x: 0, y: -1 }, Li, nH_L, depth, false));
    pts = pts.concat(fingerEdge(pts[pts.length - 1], { x: 0, y: 1 }, { x: 1, y: 0 }, Wi, nH_W, depth, false));
    pts = pts.concat(fingerEdge(pts[pts.length - 1], { x: -1, y: 0 }, { x: 0, y: 1 }, Li, nH_L, depth, false));
    pts = pts.concat(fingerEdge(pts[pts.length - 1], { x: 0, y: -1 }, { x: -1, y: 0 }, Wi, nH_W, depth, false));
    return { points: pts, w: Li, h: Wi };
  }

  function buildPanels(L, W, H, t, kerf, fingerTarget) {
    const Wi = W - 2 * t;
    const Li = L - 2 * t;
    const nV = fingerCount(H, fingerTarget);
    const nH_L = fingerCount(Li, fingerTarget);
    const nH_W = fingerCount(Wi, fingerTarget);

    // rightOut degerleri kasitli farkli — bkz. kutu.js'teki ayni duzeltmenin aciklamasi:
    // Ön/Arka'nin Sag (ve Sol) panelle kesistigi iki ayri kenar farkli fazda olmali.
    const front = frontBackPanel(L, H, t, kerf, nV, nH_L, true, true, true);
    const back = frontBackPanel(L, H, t, kerf, nV, nH_L, false, true, true);
    const left = leftRightPanel(Wi, H, t, kerf, nV, nH_W, true, true, true);
    const right = leftRightPanel(Wi, H, t, kerf, nV, nH_W, false, true, true);
    const bottom = capPanel(Li, Wi, t, kerf, nH_L, nH_W);
    const top = capPanel(Li, Wi, t, kerf, nH_L, nH_W);

    return [
      { name: "Alt", ...bottom },
      { name: "Üst", ...top },
      { name: "Ön", ...front },
      { name: "Arka", ...back },
      { name: "Sol", ...left },
      { name: "Sağ", ...right },
    ];
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
  document.getElementById("svgBtn").addEventListener("click", () => download("kapali-kutu.svg", currentSVG, "image/svg+xml"));
  document.getElementById("dxfBtn").addEventListener("click", () => download("kapali-kutu.dxf", currentDXF, "application/dxf"));

  ciz();
})();
