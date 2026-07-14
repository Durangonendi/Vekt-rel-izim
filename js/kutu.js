// Açık Kutu aracı — govde uretimi artik common.js'teki VC.buildOpenBoxPanels() ile paylasiliyor
// (Raf araci da ayni fonksiyonu kullaniyor). Bu dosya sadece form/DOM baglantisini yapar.
(function () {
  "use strict";
  const { buildOpenBoxPanels, layoutPanels, renderSVG, buildDXF, download } = VC;

  function buildPanels(L, W, H, t, kerf, fingerTarget) {
    const { bottom, front, back, left, right } = buildOpenBoxPanels(L, W, H, t, kerf, fingerTarget);
    const isEn = document.documentElement.lang === "en";
    const N = isEn
      ? { bottom: "Bottom", front: "Front", back: "Back", left: "Left", right: "Right" }
      : { bottom: "Alt", front: "Ön", back: "Arka", left: "Sol", right: "Sağ" };

    return [
      { name: N.bottom, ...bottom },
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
    currentDXF = buildDXF(placed);

    document.getElementById("previewWrap").innerHTML = currentSVG;
    document.getElementById("boyutBilgisi").textContent = isEn
      ? `Total layout area: ${Math.round(totalW)} x ${Math.round(totalH)} mm`
      : `Toplam yerleşim alanı: ${Math.round(totalW)} x ${Math.round(totalH)} mm`;
    document.getElementById("downloads").style.display = "flex";
  }

  document.getElementById("cizBtn").addEventListener("click", ciz);
  document.getElementById("svgBtn").addEventListener("click", () => download("kutu.svg", currentSVG, "image/svg+xml"));
  document.getElementById("dxfBtn").addEventListener("click", () => download("kutu.dxf", currentDXF, "application/dxf"));

  ciz();
})();
