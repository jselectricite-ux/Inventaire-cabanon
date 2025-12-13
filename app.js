/* ================================
   Inventaire Cabanon – app.js
   Version PRO – Stable
================================ */

console.log("✅ app.js chargé");

const STORAGE_KEY = "inventaire_cabanon_v5";

/* === Catalogues fournisseurs === */
const catalogs = {
  hager: [],
  legrand: [],
  schneider: [],
  sonepar: [],
  wurth: []
};

const inventory = [];

document.addEventListener("DOMContentLoaded", async () => {

  /* ========= DOM ========= */
  const tableBody = document.querySelector("#table tbody");
  const searchBox = document.getElementById("searchBox");
  const scanBtn = document.getElementById("scanBtn");
  const addManualBtn = document.getElementById("addManualBtn");
  const resetQtyBtn = document.getElementById("resetQtyBtn");
  const exportBtn = document.getElementById("exportBtn");

  const fileInput = document.getElementById("fileImport");
  const importBtn = document.getElementById("importBtn");

  const popup = document.getElementById("popup");
  const refInput = document.getElementById("refInput");
  const desInput = document.getElementById("desInput");
  const catInput = document.getElementById("catInput");
  const qtyInput = document.getElementById("qtyInput");
  const priceInput = document.getElementById("priceInput");
  const saveBtn = document.getElementById("saveBtn");
  const cancelBtn = document.getElementById("cancelBtn");

  const scannerDiv = document.getElementById("scanner");

  /* ========= LOAD CATALOGS ========= */
  for (const name of Object.keys(catalogs)) {
    try {
      const r = await fetch(`${name}.json`);
      catalogs[name] = await r.json();
      console.log(`📦 Catalogue chargé : ${name}`);
    } catch {
      catalogs[name] = [];
    }
  }

  /* ========= LOAD INVENTORY ========= */
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) inventory.push(...JSON.parse(saved));

  /* ========= HELPERS ========= */
  function saveLocal() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(inventory));
  }

  function renderTable(filter = "") {
    tableBody.innerHTML = "";
    const f = filter.toLowerCase();

    inventory.forEach(item => {
      if (
        f &&
        !item.ref.toLowerCase().includes(f) &&
        !item.designation.toLowerCase().includes(f)
      ) return;

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${item.ref}</td>
        <td>${item.designation}</td>
        <td>${item.category || ""}</td>
        <td>${item.qty}</td>
        <td>${item.price || ""}</td>
        <td>${(item.qty * (item.price || 0)).toFixed(2)}</td>
        <td><button class="editBtn">Modifier</button></td>
      `;

      tr.querySelector(".editBtn").onclick = () => openPopup(item);
      tableBody.appendChild(tr);
    });
  }

  function openPopup(item = {}) {
    popup.style.display = "flex";
    refInput.value = item.ref || "";
    desInput.value = item.designation || "";
    catInput.value = item.category || "";
    qtyInput.value = item.qty ?? 1;
    priceInput.value = item.price ?? "";
  }

  function closePopup() {
    popup.style.display = "none";
  }

  function findInCatalogs(code) {
    for (const supplier in catalogs) {
      const found = catalogs[supplier].find(
        i => i.ean === code || i.ref === code
      );
      if (found) return found;
    }
    return null;
  }

  /* ========= EVENTS ========= */
  searchBox.oninput = () => renderTable(searchBox.value);
  addManualBtn.onclick = () => openPopup();
  cancelBtn.onclick = closePopup;

  saveBtn.onclick = () => {
    const ref = refInput.value.trim();
    const designation = desInput.value.trim();
    if (!ref || !designation) {
      alert("Référence et désignation obligatoires");
      return;
    }

    const qty = Number(qtyInput.value) || 0;
    const price = Number(priceInput.value) || 0;

    const existing = inventory.find(i => i.ref === ref);
    if (existing) {
      existing.designation = designation;
      existing.category = catInput.value;
      existing.qty += qty;
      existing.price = price;
    } else {
      inventory.push({
        ref,
        designation,
        category: catInput.value,
        qty,
        price
      });
    }

    saveLocal();
    renderTable(searchBox.value);
    closePopup();
  };

  resetQtyBtn.onclick = () => {
    if (!confirm("Remettre toutes les quantités à zéro ?")) return;
    inventory.forEach(i => i.qty = 0);
    saveLocal();
    renderTable();
  };

  exportBtn.onclick = () => {
    if (!inventory.length) return alert("Inventaire vide");

    const rows = [
      ["Ref","Désignation","Catégorie","Qté","Prix","Total"],
      ...inventory.map(i => [
        i.ref,
        i.designation,
        i.category,
        i.qty,
        i.price,
        (i.qty * (i.price || 0)).toFixed(2)
      ])
    ];

    const csv = rows.map(r => r.join(";")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "inventaire.csv";
    a.click();
  };

  /* ========= IMPORT CSV FOURNISSEUR ========= */
  importBtn.onclick = () => {
    if (!fileInput.files.length) {
      alert("Sélectionne un fichier CSV");
      return;
    }

    const reader = new FileReader();
    reader.onload = e => importCSV(e.target.result);
    reader.readAsText(fileInput.files[0], "UTF-8");
  };

  function importCSV(csvText) {
    const lines = csvText.split(/\r?\n/).filter(l => l.trim());
    if (lines.length < 2) return alert("CSV invalide");

    let added = 0, updated = 0;

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(";");
      const ref = cols[0]?.trim();
      const designation = cols[1]?.trim();
      const category = cols[2]?.trim() || "";
      const price = parseFloat(cols[3]?.replace(",", ".")) || 0;

      if (!ref || !designation) continue;

      const existing = inventory.find(it => it.ref === ref);
      if (existing) {
        existing.designation = designation;
        existing.category = category;
        existing.price = price;
        updated++;
      } else {
        inventory.push({ ref, designation, category, qty: 0, price });
        added++;
      }
    }

    saveLocal();
    renderTable(searchBox.value);
    alert(`Import terminé\nAjoutés: ${added}\nMis à jour: ${updated}`);
  }

  /* ========= SCANNER CODE-BARRES ========= */
  let qr = null;

  scanBtn.onclick = async () => {
    scannerDiv.style.display = "block";
    scannerDiv.innerHTML = `
      <button id="stopScanBtn">✖ Fermer</button>
      <div id="reader"></div>
    `;

    qr = new Html5Qrcode("reader");

    document.getElementById("stopScanBtn").onclick = async () => {
      await qr.stop();
      scannerDiv.style.display = "none";
    };

    await qr.start(
      { facingMode: "environment" },
      {
        fps: 10,
        qrbox: { width: 300, height: 200 },
        formatsToSupport: [
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.QR_CODE
        ]
      },
      code => {
        qr.stop();
        scannerDiv.style.display = "none";

        const found = findInCatalogs(code);
        openPopup(found ? {
          ref: found.ref || code,
          designation: found.designation,
          category: found.category,
          price: found.price || 0,
          qty: 1
        } : { ref: code, qty: 1 });
      }
    );
  };

  renderTable();
});
