// Raf / Organizer aracı — dış gövde Açık Kutu ile aynı (VC.buildOpenBoxPanels, tamamen parmak
// geçmeli). Bölmeler yapıştırma değil, GEÇMELİ (slot+tab) — alt plakaya her bölme için tam
// derinlikte (Wi boyunca, öndem arkaya komple) bir yarık açılıyor, bölme paneli de bu yarıktan
// geçecek kadar (H + malzeme kalınlığı) uzun kesiliyor. Bölme yukarıdan kaydırılıp alt plakadaki
// yarığa oturtulunca kendiliğinden sabitleniyor, ek bağlantı/yapıştırma gerekmiyor.
(function () {
  "use strict";
  const { buildOpenBoxPanels, layoutPanels, renderSVG, buildDXF, download } = VC;

  function dividerPanel(Wi, H, tabDepth) {
    const h = H + tabDepth;
    return { points: [{ x: 0, y: 0 }, { x: Wi, y: 0 }, { x: Wi, y: h }, { x: 0, y: h }], w: Wi, h };
  }

  // Alt plakanın kendi yerel çerçevesinde (x:[0,Li], y:[0,Wi]) bir bölme yarığı — tam Wi
  // boyunca (y:0'dan Wi'ye) uzanır, genişligi malzeme kalinligina (kerf'e gore) sıkı gelir.
  function dividerSlot(xCenter, Wi, t, kerf) {
    const halfW = (t - kerf) / 2;
    const x1 = xCenter - halfW, x2 = xCenter + halfW;
    return [{ x: x1, y: 0 }, { x: x2, y: 0 }, { x: x2, y: Wi }, { x: x1, y: Wi }];
  }

  function buildPanels(L, W, H, t, kerf, fingerTarget, bolmeSayisi) {
    const { Li, Wi, bottom, front, back, left, right } = buildOpenBoxPanels(L, W, H, t, kerf, fingerTarget);
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
    const slots = [];
    for (let i = 0; i < dividerCount; i++) {
      panels.push({ name: `${N.div} ${i + 1}`, ...dividerPanel(Wi, H, t) });
      const xCenter = ((i + 1) * Li) / bolmeSayisi;
      slots.push(dividerSlot(xCenter, Wi, t, kerf));
    }
    return { panels, slots };
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

    const { panels, slots } = buildPanels(L, W, H, t, kerf, fingerTarget, bolmeSayisi);
    const { placed, totalW, totalH } = layoutPanels(panels, 10);

    // Yarıklar alt plakanın kendi yerel çerçevesinde hesaplandı; alt plaka layoutPanels
    // tarafından nereye yerleştirildiyse (ox,oy) yarıklar da aynı ofsetle oraya eklenir.
    const bottomPlaced = placed[0];
    const isEnName = isEn ? "Hole" : "Yarık";
    for (let i = 0; i < slots.length; i++) {
      placed.push({ points: slots[i], ox: bottomPlaced.ox, oy: bottomPlaced.oy, name: `${isEnName} ${i + 1}` });
    }

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
