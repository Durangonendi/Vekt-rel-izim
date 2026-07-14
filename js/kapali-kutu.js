// Parmak geçmeli (finger joint) kapalı kutu paneli üretici — 6 panel, tamamen kilitli.
// Eksen sozlesmesi kutu.js ile ayni: Z=yukseklik (Ön/Arka=true, Sol/Sag=false),
// X=uzunluk yonu (Ön/Arka=true, Alt/Ust=false), Y=genislik yonu (Sol/Sag=true, Alt/Ust=false).
(function () {
  "use strict";
  const { fingerEdge, fingerCount, outStartFor, layoutPanels, renderSVG, buildDXF, download } = VC;

  const Z_WALL = true, Z_ENDWALL = false;
  const X_WALL = true, X_CAP = false;
  const Y_WALL = true, Y_CAP = false;

  // Front/Back paneli: genislik x H. Alt VE ust kenarlar [duz(t)]+[parmakli orta, X ekseni]+[duz(t)].
  // Sag/sol kenarlar Z ekseninde parmakli.
  function frontBackPanel(width, H, t, kerf, nV, nH) {
    const depth = t - kerf;
    let pts = [{ x: t, y: 0 }];
    pts = pts.concat(fingerEdge(pts[pts.length - 1], { x: 1, y: 0 }, { x: 0, y: -1 }, width - 2 * t, nH, depth, outStartFor(true, nH, X_WALL)));
    pts.push({ x: width, y: 0 });
    pts = pts.concat(fingerEdge(pts[pts.length - 1], { x: 0, y: 1 }, { x: 1, y: 0 }, H, nV, depth, outStartFor(true, nV, Z_WALL)));
    pts.push({ x: width, y: H });
    pts = pts.concat(fingerEdge(pts[pts.length - 1], { x: -1, y: 0 }, { x: 0, y: 1 }, width - 2 * t, nH, depth, outStartFor(false, nH, X_WALL)));
    pts.push({ x: 0, y: H });
    pts = pts.concat(fingerEdge(pts[pts.length - 1], { x: 0, y: -1 }, { x: -1, y: 0 }, H, nV, depth, outStartFor(false, nV, Z_WALL)));
    pts.push({ x: t, y: 0 });
    return { points: pts, w: width, h: H };
  }

  // Sol/Sag paneli: Wi x H. Alt VE ust kenarlar Y ekseninde tam parmakli. Sag/sol kenarlar Z ekseninde parmakli.
  function leftRightPanel(Wi, H, t, kerf, nV, nH) {
    const depth = t - kerf;
    let pts = [{ x: 0, y: 0 }];
    pts = pts.concat(fingerEdge(pts[pts.length - 1], { x: 1, y: 0 }, { x: 0, y: -1 }, Wi, nH, depth, outStartFor(true, nH, Y_WALL)));
    pts = pts.concat(fingerEdge(pts[pts.length - 1], { x: 0, y: 1 }, { x: 1, y: 0 }, H, nV, depth, outStartFor(true, nV, Z_ENDWALL)));
    pts = pts.concat(fingerEdge(pts[pts.length - 1], { x: -1, y: 0 }, { x: 0, y: 1 }, Wi, nH, depth, outStartFor(false, nH, Y_WALL)));
    pts = pts.concat(fingerEdge(pts[pts.length - 1], { x: 0, y: -1 }, { x: -1, y: 0 }, H, nV, depth, outStartFor(false, nV, Z_ENDWALL)));
    return { points: pts, w: Wi, h: H };
  }

  // Alt/Ust paneli: Li x Wi, dort kenari de parmakli (ayni sekil, ikisi de ayni fonksiyonla uretilir).
  function capPanel(Li, Wi, t, kerf, nH_L, nH_W) {
    const depth = t - kerf;
    let pts = [{ x: 0, y: 0 }];
    pts = pts.concat(fingerEdge(pts[pts.length - 1], { x: 1, y: 0 }, { x: 0, y: -1 }, Li, nH_L, depth, outStartFor(true, nH_L, X_CAP)));
    pts = pts.concat(fingerEdge(pts[pts.length - 1], { x: 0, y: 1 }, { x: 1, y: 0 }, Wi, nH_W, depth, outStartFor(true, nH_W, Y_CAP)));
    pts = pts.concat(fingerEdge(pts[pts.length - 1], { x: -1, y: 0 }, { x: 0, y: 1 }, Li, nH_L, depth, outStartFor(false, nH_L, X_CAP)));
    pts = pts.concat(fingerEdge(pts[pts.length - 1], { x: 0, y: -1 }, { x: -1, y: 0 }, Wi, nH_W, depth, outStartFor(false, nH_W, Y_CAP)));
    return { points: pts, w: Li, h: Wi };
  }

  function buildPanels(L, W, H, t, kerf, fingerTarget) {
    const Wi = W - 2 * t;
    const Li = L - 2 * t;
    const nV = fingerCount(H, fingerTarget);
    const nH_L = fingerCount(Li, fingerTarget);
    const nH_W = fingerCount(Wi, fingerTarget);

    const front = frontBackPanel(L, H, t, kerf, nV, nH_L);
    const back = frontBackPanel(L, H, t, kerf, nV, nH_L);
    const left = leftRightPanel(Wi, H, t, kerf, nV, nH_W);
    const right = leftRightPanel(Wi, H, t, kerf, nV, nH_W);
    const bottom = capPanel(Li, Wi, t, kerf, nH_L, nH_W);
    const top = capPanel(Li, Wi, t, kerf, nH_L, nH_W);
    const isEn = document.documentElement.lang === "en";
    const N = isEn
      ? { bottom: "Bottom", top: "Top", front: "Front", back: "Back", left: "Left", right: "Right" }
      : { bottom: "Alt", top: "Üst", front: "Ön", back: "Arka", left: "Sol", right: "Sağ" };

    return [
      { name: N.bottom, ...bottom },
      { name: N.top, ...top },
      { name: N.front, ...front },
      { name: N.back, ...back },
      { name: N.left, ...left },
      { name: N.right, ...right },
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

    const isEn = document.documentElement.lang === "en";

    if (W - 2 * t <= 5 || L - 2 * t <= 5) {
      document.getElementById("boyutBilgisi").textContent = isEn
        ? "Length/Width too small for this material thickness. Check your dimensions."
        : "Uzunluk/Genişlik, malzeme kalınlığına göre çok küçük. Ölçüleri kontrol edin.";
      return;
    }

    const panels = buildPanels(L, W, H, t, kerf, fingerTarget);
    const { placed, totalW, totalH } = layoutPanels(panels, 10);

    currentSVG = renderSVG(placed, totalW, totalH);
    currentDXF = buildDXF(placed, totalH);

    document.getElementById("previewWrap").innerHTML = currentSVG;
    document.getElementById("boyutBilgisi").textContent = isEn
      ? `Total layout area: ${Math.round(totalW)} x ${Math.round(totalH)} mm`
      : `Toplam yerleşim alanı: ${Math.round(totalW)} x ${Math.round(totalH)} mm`;
    document.getElementById("downloads").style.display = "flex";
  }

  document.getElementById("cizBtn").addEventListener("click", ciz);
  document.getElementById("svgBtn").addEventListener("click", () => download("kapali-kutu.svg", currentSVG, "image/svg+xml"));
  document.getElementById("dxfBtn").addEventListener("click", () => download("kapali-kutu.dxf", currentDXF, "application/dxf"));

  ciz();
})();
