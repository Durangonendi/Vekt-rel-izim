// Raf / Organizer aracı — dış gövde Açık Kutu ile aynı (VC.buildOpenBoxPanels, tamamen parmak
// geçmeli), içine N-1 tane düz (parmaksız) bölme paneli eklenir. Bölmeler kutunun iç genişliğine
// (Wi) tam oturacak şekilde kesilir, sıkı geçme ile yerinde durur — ek bağlantı elemanı gerekmez.
(function () {
  "use strict";
  const { buildOpenBoxPanels, layoutPanels, renderSVG, buildDXF, download } = VC;

  function dividerPanel(Wi, H) {
    return { points: [{ x: 0, y: 0 }, { x: Wi, y: 0 }, { x: Wi, y: H }, { x: 0, y: H }], w: Wi, h: H };
  }

  function buildPanels(L, W, H, t, kerf, fingerTarget, bolmeSayisi) {
    const { Wi, bottom, front, back, left, right } = buildOpenBoxPanels(L, W, H, t, kerf, fingerTarget);
    const isEn = document.documentElement.lang === "en";
    const N = isEn
      ? { bottom: "Bottom", front: "Front", back: "Back", left: "Left", right: "Right", div: "Divider" }
      : { bottom: "Alt", front: "Ön", back: "Arka", left: "Sol", right: "Sağ", div: "Bölme" };

    const panels = [
      { name: N.bottom, ...bottom },
      { name: N.front, ...front },
      { name: N.back, ...back },
      { name: N.left, ...left },
      { name: N.right, ...right },
    ];

    const dividerCount = Math.max(0, bolmeSayisi - 1);
    for (let i = 0; i < dividerCount; i++) {
      panels.push({ name: `${N.div} ${i + 1}`, ...dividerPanel(Wi, H) });
    }
    return panels;
  }

  let currentSVG = "", currentDXF = "";

  function ciz() {
    const L = Number(document.getElementById("uzunluk").value);
    const W = Number(document.getElementById("genislik").value);
    const H = Number(document.getElementById("yukseklik").value);
    const t = Number(document.getElementById("kalinlik").value);
    const fingerTarget = Number(document.getElementById("parmakHedef").value);
    const kerf = Number(document.getElementById("kerf").value);
    const bolmeSayisi = Math.max(1, Number(document.getElementById("bolmeSayisi").value) || 1);
    const isEn = document.documentElement.lang === "en";

    if (W - 2 * t <= 5 || L - 2 * t <= 5) {
      document.getElementById("boyutBilgisi").textContent = isEn
        ? "Length/Width too small for this material thickness. Check your dimensions."
        : "Uzunluk/Genişlik, malzeme kalınlığına göre çok küçük. Ölçüleri kontrol edin.";
      return;
    }

    const panels = buildPanels(L, W, H, t, kerf, fingerTarget, bolmeSayisi);
    const { placed, totalW, totalH } = layoutPanels(panels, 10);

    currentSVG = renderSVG(placed, totalW, totalH);
    currentDXF = buildDXF(placed, totalH);

    document.getElementById("previewWrap").innerHTML = currentSVG;
    const compartmentWidth = ((L - 2 * t) / bolmeSayisi).toFixed(1);
    document.getElementById("boyutBilgisi").textContent = isEn
      ? `Total layout area: ${Math.round(totalW)} x ${Math.round(totalH)} mm · ${bolmeSayisi} compartments, ~${compartmentWidth} mm each`
      : `Toplam yerleşim alanı: ${Math.round(totalW)} x ${Math.round(totalH)} mm · ${bolmeSayisi} bölme, her biri ~${compartmentWidth} mm`;
    document.getElementById("downloads").style.display = "flex";
  }

  document.getElementById("cizBtn").addEventListener("click", ciz);
  document.getElementById("svgBtn").addEventListener("click", () => download("raf.svg", currentSVG, "image/svg+xml"));
  document.getElementById("dxfBtn").addEventListener("click", () => download("raf.dxf", currentDXF, "application/dxf"));

  ciz();
})();
