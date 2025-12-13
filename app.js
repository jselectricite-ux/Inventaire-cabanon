/* ================================
   Inventaire Cabanon – app.js
   Version PRO + PWA Install
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

  /* === DOM === */
  const tableBody = document.querySelector("#table tbody");
  const searchBox = document.getElementById("searchBox");
  const scanBtn = document.getElementById("scanBtn");
  const addManualBtn = document.getElementById("addManualBtn");
  const resetQtyBtn = document.getElementById("resetQtyBtn");
  const exportBtn = document.getElementById("exportBtn");
  const installBtn = document.getElementById("installBtn");

  const popup = document.getElementById("popup");
  const refInput = document.getElementById("refInput");
  const desInput = document.getElementById("desInput");
  const catInput = document.getElementById("catInput");
  const supplierInput = document.getElementById("supplierInput");
  const qtyInput = document.getElementById("qtyInput");
  const minQtyInput = document.getElementById("minQtyInput");
  const priceInput = document.getElementById("priceInput");
  const saveBtn = document.getElementById("saveBtn");
  const cancelBtn = document.getElementById("cancelBtn");

  const scannerDiv = document.getElementById("scanner");

  /* === PWA INSTALL === */
  let deferredPrompt = null;

  window.addEventListener("beforeinstallprompt", e => {
    e.preventDefault();
    deferredPrompt = e;
    if (installBtn) installBtn.style.display = "inline-block";
  });

  installBtn?.addEventListener("click", async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === "accepted") {
      console.log("✅ App installée");
    }
    deferredPrompt = null;
    installBtn.style.display = "none";
  });

  window.addEventListener("appinstalled", () => {
    console.log("📲 Application installée");
    if (installBtn) installBtn.style.display = "none";
  });

  /* === Chargement catalogues === */
  for (const name of Object.keys(catalogs)) {
    try {
      const r = await fetch(`${name}.json`);
      catalogs[name] = await r.json();
    } catch {
      catalogs[name] = [];
    }
  }

  /* === Chargement inventaire === */
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) JSON.parse(saved).forEach(i => inventory.push(i));

  /* === Helpers === */
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

      const lowStock = item.minQty && item.qty < item.minQty;
      const tr = document.createElement("tr");
      if (lowStock) tr.style.background = "#ffcccc";

      tr.innerHTML = `
        <td>${item.ref}</td>
        <td>${item.designation}</td>
        <td>${item.category || ""}</td>
        <td>${item.supplier || ""}</td>
        <td>${item.qty}</td>
        <td>${item.minQty ?? "-"}</td>
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
    supplierInput.value = item.supplier || "";
    qtyInput.value = item.qty ?? 1;
    minQtyInput.value = item.minQty ?? 0;
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
      if (found) return { ...found, supplier };
    }
    return null;
  }

  /* === EVENTS === */
  searchBox.oninput = () => renderTable(searchBox.value);
  addManualBtn.onclick = () => openPopup();

  saveBtn.onclick = () => {
    const ref = refInput.value.trim();
    const designation = desInput.value.trim();
    if (!ref || !designation) return alert("Référence et désignation obligatoires");

    const qty = Number(qtyInput.value) || 0;
    const minQty = Number(minQtyInput.value) || 0;
    const price = Number(priceInput.value) || 0;

    const existing = inventory.find(i => i.ref === ref);
    if (existing) {
      existing.designation = designation;
      existing.category = catInput.value;
      existing.supplier = supplierInput.value;
      existing.qty += qty;
      existing.minQty = minQty;
      existing.price = price;
      existing.lastUpdate = new Date().toISOString();
    } else {
      inventory.push({
        ref,
        designation,
        category: catInput.value,
        supplier: supplierInput.value,
        qty,
        minQty,
        price,
        lastUpdate: new Date().toISOString()
      });
    }

    saveLocal();
    renderTable(searchBox.value);
    closePopup();
  };

  cancelBtn.onclick = closePopup;

  resetQtyBtn.onclick = () => {
    if (!confirm("Remettre toutes les quantités à zéro ?")) return;
    inventory.forEach(i => i.qty = 0);
    saveLocal();
    renderTable();
  };

  exportBtn.onclick = () => {
    const rows = [
      ["Ref","Désignation","Catégorie","Fournisseur","Qté","Mini","Prix","Total"],
      ...inventory.map(i => [
        i.ref,
        i.designation,
        i.category,
        i.supplier,
        i.qty,
        i.minQty,
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
/* === Import catalogue fournisseur (CSV) === */

const fileInput = document.getElementById("fileImport");
const importBtn = document.getElementById("importBtn");

importBtn.addEventListener("click", () => {
  if (!fileInput.files.length) {
    alert("Sélectionne un fichier CSV fournisseur");
    return;
  }

  const file = fileInput.files[0];
  const reader = new FileReader();

  reader.onload = e => {
    const text = e.target.result;
    importCSV(text);
  };

  reader.readAsText(file, "UTF-8");
});

function importCSV(csvText) {
  const lines = csvText.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) {
    alert("Fichier CSV invalide");
    return;
  }

  const headers = lines[0].toLowerCase();

  const refIndex = headers.indexOf("ref");
  const desIndex = headers.indexOf("désignation") !== -1
    ? headers.indexOf("désignation")
    : headers.indexOf("designation");
  const catIndex = headers.indexOf("cat");
  const priceIndex = headers.indexOf("prix");

  let added = 0;
  let updated = 0;

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(";");

    const ref = cols[0]?.trim();
    const designation = cols[1]?.trim();
    const category = cols[2]?.trim() || "";
    const price = parseFloat(
      cols[3]?.replace(",", ".")
    ) || 0;

    if (!ref || !designation) continue;

    const existing = inventory.find(it => it.ref === ref);

    if (existing) {
      existing.designation = designation;
      existing.category = category;
      existing.price = price;
      updated++;
    } else {
      inventory.push({
        ref,
        designation,
        category,
        qty: 0,
        price
      });
      added++;
    }
  }

  saveLocal();
  renderTable(searchBox.value);

  alert(`Import terminé ✅
Ajoutés : ${added}
Mis à jour : ${updated}`);
}
  /* === SCANNER === */
  let qr = null;

  scanBtn.onclick = async () => {
    scannerDiv.style.display = "block";
    scannerDiv.innerHTML = `<div id="reader"></div>`;

    qr = new Html5Qrcode("reader");
    await qr.start(
      { facingMode: "environment" },
      {
        fps: 10,
        qrbox: { width: 300, height: 200 }
      },
      code => {
        qr.stop();
        scannerDiv.style.display = "none";

        const found = findInCatalogs(code);
        openPopup(found ? {
          ref: found.ref || code,
          designation: found.designation,
          category: found.category,
          supplier: found.supplier,
          price: found.price || 0,
          qty: 1
        } : { ref: code, qty: 1 });
      }
    );
  };

  renderTable();
});
