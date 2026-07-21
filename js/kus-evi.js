// Kuş Evi aracı — gövde (taban + 2 düz duvar + 2 alınlık/gable duvar) TAMAMEN parmak geçmeli,
// aynı test edilmiş kutu motorunu (VC.fingerEdge/outStartFor mantığı) kullanır. Çatı da
// YAPIŞTIRMA GEREKTİRMEZ (çocuklar için tehlikeli olacağından) — düz duvarların üst kenarına
// açılan düz yuvalara, çatı panellerinden sarkan düz tırnaklar oturuyor (Raf'taki bölme
// yuvası ile aynı prensip, sadece açılı değil düz kesim olduğu için ekstra risk yok).
(function () {
  "use strict";
  const { fingerCount, fingerEdge, straightEdge, outStartFor, leftRightPanel, bottomCapPanel, layoutPanels, renderSVG, buildDXF, download } = VC;

  const NOTCH_FRACS = [0.3, 0.7]; // duvar uzunluğu boyunca tırnak/yuva pozisyonları (oran)
  const TAB_W = 14;   // mm, tırnak genişliği
  const TAB_DEPTH = 8; // mm, tırnağın yuvaya girme derinliği

  // leftRightPanel ile aynı kenar-fazı kuralını kullanan, üstüne çatı üçgeni eklenmiş alınlık paneli.
  // Y_WALL/Z_ENDWALL burada common.js'teki AYNI değerlerle (true/false) elle tekrarlanıyor çünkü
  // bu ikisi export edilmiyor — ama leftRightPanel'in kendi iç mantığıyla birebir aynı olmalı.
  function gablePanel(Wi, wallH, peakH, t, kerf, nV, nH) {
    const depth = t - kerf;
    const Y_WALL = true, Z_ENDWALL = false;
    let pts = [{ x: 0, y: 0 }];
    pts = pts.concat(fingerEdge(pts[pts.length - 1], { x: 1, y: 0 }, { x: 0, y: -1 }, Wi, nH, depth, outStartFor(true, nH, Y_WALL)));
    pts = pts.concat(fingerEdge(pts[pts.length - 1], { x: 0, y: 1 }, { x: 1, y: 0 }, wallH, nV, depth, outStartFor(true, nV, Z_ENDWALL)));
    // düz üst kenar yerine çatı üçgeni: sağ üst köşeden tepe noktasına, oradan sol üst köşeye
    pts.push({ x: Wi / 2, y: wallH + peakH });
    pts.push({ x: 0, y: wallH });
    pts = pts.concat(fingerEdge(pts[pts.length - 1], { x: 0, y: -1 }, { x: -1, y: 0 }, wallH, nV, depth, outStartFor(false, nV, Z_ENDWALL)));
    return { points: pts, w: Wi, h: wallH + peakH };
  }

  // frontBackPanel ile AYNI kenar-fazı kuralı (X_WALL/Z_WALL), ama düz üst kenar yerine
  // çatı tırnaklarının oturacağı 2 düz yuva var. common.js'teki paylaşılan frontBackPanel'i
  // (Kutu/Kapalı Kutu'nun kullandığı) DEĞİŞTİRMEMEK için burada ayrı bir kopya olarak yazıldı.
  function duzDuvarPaneli(width, wallH, t, kerf, nV, nH, notchFracs, tabW, tabDepth) {
    const depth = t - kerf;
    const X_WALL = true, Z_WALL = true;
    let pts = [{ x: t, y: 0 }];
    pts = pts.concat(fingerEdge(pts[pts.length - 1], { x: 1, y: 0 }, { x: 0, y: -1 }, width - 2 * t, nH, depth, outStartFor(true, nH, X_WALL)));
    pts.push({ x: width, y: 0 });
    pts = pts.concat(fingerEdge(pts[pts.length - 1], { x: 0, y: 1 }, { x: 1, y: 0 }, wallH, nV, depth, outStartFor(true, nV, Z_WALL)));
    // üst kenar (width -> 0 yönünde), her yuva için: içeri gir, aşağı in, karşıya geç, yukarı çık
    const notchHalfW = (tabW - kerf) / 2; // yuva, tırnaktan kerf kadar dar açılır ki sıkı otursun
    const centersDesc = notchFracs.map((f) => f * width).sort((a, b) => b - a);
    for (const cx of centersDesc) {
      pts.push({ x: cx + notchHalfW, y: wallH });
      pts.push({ x: cx + notchHalfW, y: wallH - tabDepth });
      pts.push({ x: cx - notchHalfW, y: wallH - tabDepth });
      pts.push({ x: cx - notchHalfW, y: wallH });
    }
    pts.push({ x: 0, y: wallH });
    pts = pts.concat(fingerEdge(pts[pts.length - 1], { x: 0, y: -1 }, { x: -1, y: 0 }, wallH, nV, depth, outStartFor(false, nV, Z_WALL)));
    pts.push({ x: t, y: 0 });
    return { points: pts, w: width, h: wallH };
  }

  // Çatı: düz eğik panel, alınlıkların eğik hattı üzerine oturur. Saçak (eave) kenarından
  // sarkan düz tırnaklar, duzDuvarPaneli'nin üst kenarındaki yuvalara geçiyor — YAPIŞTIRMA YOK.
  function catiPaneli(uzunlukOuter, tasmaOn, tasmaEave, egimUzunlugu, notchFracs, tabW, tabDepth) {
    const w = uzunlukOuter + 2 * tasmaOn;
    const h = egimUzunlugu + tasmaEave; // y=0 mahya (ridge), y=h saçak (eave)
    const tabHalfW = tabW / 2;
    const centersDesc = notchFracs.map((f) => tasmaOn + f * uzunlukOuter).sort((a, b) => b - a);
    const pts = [{ x: 0, y: 0 }, { x: w, y: 0 }, { x: w, y: h }];
    for (const cx of centersDesc) {
      pts.push({ x: cx + tabHalfW, y: h });
      pts.push({ x: cx + tabHalfW, y: h + tabDepth });
      pts.push({ x: cx - tabHalfW, y: h + tabDepth });
      pts.push({ x: cx - tabHalfW, y: h });
    }
    pts.push({ x: 0, y: h });
    return { points: pts, w, h: h + tabDepth };
  }

  function buildPanels(params) {
    const { uzunluk, genislik, duvarYuksekligi, catiYuksekligi, t, kerf, fingerTarget, girisDeligiCap, girisDeligiYukseklik, catiTasmaOn, catiTasmaEave } = params;
    const isEn = document.documentElement.lang === "en";

    const Da_inner = uzunluk - 2 * t;   // düz duvarların iç açıklığı (taban ile eşleşir)
    const Db_inner = genislik - 2 * t;  // alınlık (gable) duvarların iç açıklığı
    const nV = fingerCount(duvarYuksekligi, fingerTarget);
    const nH_Da = fingerCount(Da_inner, fingerTarget);
    const nH_Db = fingerCount(Db_inner, fingerTarget);

    const taban = bottomCapPanel(Da_inner, Db_inner, t, kerf, nH_Da, nH_Db);
    const duvarSol = duzDuvarPaneli(uzunluk, duvarYuksekligi, t, kerf, nV, nH_Da, NOTCH_FRACS, TAB_W, TAB_DEPTH);
    const duvarSag = duzDuvarPaneli(uzunluk, duvarYuksekligi, t, kerf, nV, nH_Da, NOTCH_FRACS, TAB_W, TAB_DEPTH);
    const alinlikOn = gablePanel(Db_inner, duvarYuksekligi, catiYuksekligi, t, kerf, nV, nH_Db);
    const alinlikArka = gablePanel(Db_inner, duvarYuksekligi, catiYuksekligi, t, kerf, nV, nH_Db);

    const N = isEn
      ? { taban: "Floor", sol: "Left Wall", sag: "Right Wall", on: "Front Gable", arka: "Back Gable", cati: "Roof" }
      : { taban: "Taban", sol: "Sol Duvar", sag: "Sağ Duvar", on: "Ön Alınlık", arka: "Arka Alınlık", cati: "Çatı" };

    const panels = [
      { name: N.taban, ...taban },
      { name: N.sol, ...duvarSol },
      { name: N.sag, ...duvarSag },
      { name: N.on, ...alinlikOn },
      { name: N.arka, ...alinlikArka },
    ];

    // giriş deliği: ön alınlığın kendi yerel çerçevesinde, yatayda ortalanmış
    const holeR = girisDeligiCap / 2;
    const hole = girisDeligiHelper(Db_inner, girisDeligiYukseklik, holeR);
    panels.push({ name: isEn ? "Entry Hole" : "Giriş Deliği", points: hole, w: 2 * holeR, h: 2 * holeR, isHole: true, hostIndex: 3 });

    const egimUzunlugu = Math.sqrt(Math.pow(genislik / 2, 2) + Math.pow(catiYuksekligi, 2));
    const catiSol = catiPaneli(uzunluk, catiTasmaOn, catiTasmaEave, egimUzunlugu, NOTCH_FRACS, TAB_W, TAB_DEPTH);
    const catiSag = catiPaneli(uzunluk, catiTasmaOn, catiTasmaEave, egimUzunlugu, NOTCH_FRACS, TAB_W, TAB_DEPTH);
    panels.push({ name: N.cati + " (Sol Eğim)", ...catiSol });
    panels.push({ name: N.cati + " (Sağ Eğim)", ...catiSag });

    return { panels, egimUzunlugu };
  }

  function girisDeligiHelper(Db_inner, yukseklik, r) {
    const cx = Db_inner / 2;
    const cy = yukseklik;
    const pts = [];
    const n = 32;
    for (let i = 0; i < n; i++) {
      const a = (2 * Math.PI * i) / n;
      pts.push({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) });
    }
    return pts;
  }

  let currentSVG = "", currentDXF = "";

  function ciz() {
    const uzunluk = Number(document.getElementById("uzunluk").value);
    const genislik = Number(document.getElementById("genislik").value);
    const duvarYuksekligi = Number(document.getElementById("duvarYuksekligi").value);
    const catiYuksekligi = Number(document.getElementById("catiYuksekligi").value);
    const t = Number(document.getElementById("kalinlik").value);
    const fingerTarget = Number(document.getElementById("parmakHedef").value);
    const kerf = Number(document.getElementById("kerf").value);
    const girisDeligiCap = Number(document.getElementById("girisDeligiCap").value);
    const girisDeligiYukseklik = Number(document.getElementById("girisDeligiYukseklik").value);
    const catiTasmaOn = Number(document.getElementById("catiTasmaOn").value);
    const catiTasmaEave = Number(document.getElementById("catiTasmaEave").value);
    const isEn = document.documentElement.lang === "en";

    if (genislik - 2 * t <= 20 || uzunluk - 2 * t <= 20) {
      document.getElementById("boyutBilgisi").textContent = isEn
        ? "Length/Width too small for this material thickness. Check your dimensions."
        : "Uzunluk/Genişlik, malzeme kalınlığına göre çok küçük. Ölçüleri kontrol edin.";
      return;
    }
    if (girisDeligiYukseklik + girisDeligiCap / 2 > duvarYuksekligi + catiYuksekligi - 5) {
      document.getElementById("boyutBilgisi").textContent = isEn
        ? "Entry hole is too high for the gable — lower it or increase wall/peak height."
        : "Giriş deliği alınlık için çok yüksekte kalıyor — yüksekliğini azaltın ya da duvar/çatı yüksekliğini artırın.";
      return;
    }

    const { panels, egimUzunlugu } = buildPanels({
      uzunluk, genislik, duvarYuksekligi, catiYuksekligi, t, kerf, fingerTarget,
      girisDeligiCap, girisDeligiYukseklik, catiTasmaOn, catiTasmaEave,
    });

    const { placed, totalW, totalH } = layoutPanels(panels.filter(p => !p.isHole), 10);

    // giriş deliğini konak panelin (ön alınlık) yerleştiği yere göre ekle
    const holePanel = panels.find(p => p.isHole);
    const hostPlaced = placed[holePanel.hostIndex];
    placed.push({ points: holePanel.points, ox: hostPlaced.ox, oy: hostPlaced.oy, name: holePanel.name, w: holePanel.w, h: holePanel.h });

    currentSVG = renderSVG(placed, totalW, totalH);
    currentDXF = buildDXF(placed, totalH);

    document.getElementById("previewWrap").innerHTML = currentSVG;
    document.getElementById("boyutBilgisi").textContent = isEn
      ? `Total layout area: ${Math.round(totalW)} x ${Math.round(totalH)} mm · roof slope length ~${egimUzunlugu.toFixed(0)}mm`
      : `Toplam yerleşim alanı: ${Math.round(totalW)} x ${Math.round(totalH)} mm · çatı eğim uzunluğu ~${egimUzunlugu.toFixed(0)}mm`;
    document.getElementById("downloads").style.display = "flex";
  }

  document.getElementById("cizBtn").addEventListener("click", ciz);
  document.getElementById("svgBtn").addEventListener("click", () => download("kus-evi.svg", currentSVG, "image/svg+xml"));
  document.getElementById("dxfBtn").addEventListener("click", () => download("kus-evi.dxf", currentDXF, "application/dxf"));

  ciz();
})();
