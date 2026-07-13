// Parmak geçmeli (finger joint) kutu paneli üretici — açık üstlü, 5 panel, tamamen kilitli (yapıştırıcısız).
(function () {
  "use strict";
  const { fingerCount, fingerEdge, straightEdge, layoutPanels, renderSVG, buildDXF, download } = VC;

  // Front/Back paneli: genislik x H. Sol/sag kenarlar dikey dikislere parmakli (tam H boyunca).
  // Alt kenar: [duz(t)] + [parmakli orta kisim, taban paneline kilitlenir] + [duz(t)] — koseler duz
  // kalir cunku o bolgeler Sol/Sag panelin kalinligina denk gelir, taban orada degil.
  function frontBackPanel(width, H, t, kerf, nV, nH, rightOut, bottomOut) {
    const depth = t - kerf;
    let pts = [{ x: t, y: 0 }];
    pts = pts.concat(fingerEdge(pts[pts.length - 1], { x: 1, y: 0 }, { x: 0, y: -1 }, width - 2 * t, nH, depth, bottomOut));
    pts.push({ x: width, y: 0 });
    pts = pts.concat(fingerEdge(pts[pts.length - 1], { x: 0, y: 1 }, { x: 1, y: 0 }, H, nV, depth, rightOut));
    pts = pts.concat(straightEdge(pts[pts.length - 1], { x: -1, y: 0 }, width)); // ust: acik
    pts = pts.concat(fingerEdge(pts[pts.length - 1], { x: 0, y: -1 }, { x: -1, y: 0 }, H, nV, depth, !rightOut));
    pts.push({ x: t, y: 0 });
    return { points: pts, w: width, h: H };
  }

  // Sol/Sag paneli: Wi x H. On/arka kenarlar (front/back'in sag/sol kenarina) tam H boyunca parmakli.
  // Alt kenar tamamen parmakli (koseler yok, taban paneli buraya tam oturuyor).
  function leftRightPanel(Wi, H, t, kerf, nV, nH, rightOut, bottomOut) {
    const depth = t - kerf;
    let pts = [{ x: 0, y: 0 }];
    pts = pts.concat(fingerEdge(pts[pts.length - 1], { x: 1, y: 0 }, { x: 0, y: -1 }, Wi, nH, depth, bottomOut));
    pts = pts.concat(fingerEdge(pts[pts.length - 1], { x: 0, y: 1 }, { x: 1, y: 0 }, H, nV, depth, rightOut));
    pts = pts.concat(straightEdge(pts[pts.length - 1], { x: -1, y: 0 }, Wi)); // ust: acik
    pts = pts.concat(fingerEdge(pts[pts.length - 1], { x: 0, y: -1 }, { x: -1, y: 0 }, H, nV, depth, !rightOut));
    return { points: pts, w: Wi, h: H };
  }

  // Taban paneli: Li x Wi, dort kenari de parmakli.
  function bottomPanel(Li, Wi, t, kerf, nH_L, nH_W) {
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

    // rightOut degerleri kasitli farkli: Ön'un sag kenari Sag panelin bir kenarina, Arka'nin
    // sag kenari Sag panelin OBUR kenarina kilitleniyor — dordu de ayni degeri kullanirsa
    // Ön/Arka'dan biri Sag panelle ayni fazda cakisir (kilitlenmez). Bkz. kullanicinin
    // 2026-07-13/14 gece yakaladigi görsel hata.
    const front = frontBackPanel(L, H, t, kerf, nV, nH_L, true, true);
    const back = frontBackPanel(L, H, t, kerf, nV, nH_L, false, true);
    const left = leftRightPanel(Wi, H, t, kerf, nV, nH_W, true, true);
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
