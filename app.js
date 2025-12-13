/* ================================
   Inventaire Cabanon – app.js
================================ */

console.log("✅ app.js chargé");

const STORAGE_KEY = "inventaire_cabanon_v2";

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
  const catalogSelect = document.getElementById("catalogSelect");
  const scanBtn = document.getElementById("scanBtn");
  const addManualBtn = document.getElementById("addManualBtn");
  const resetQtyBtn = document.getElementById("resetQtyBtn");
  const exportBtn = document.getElementById("exportBtn");

  const popup = document.getElementById("popup");
  const refInput = document.getElementById("refInput");
  const desInput = document.getElementById("desInput");
  const catInput = document.getElementById("catInput");
  const qtyInput = document.getElementById("qtyInput");
  const priceInput = document.getElementById("priceInput");
  const saveBtn = document.getElementById("saveBtn");
  const cancelBtn = document.getElementById("cancelBtn");

  const scannerDiv = document.getElementById("scanner");

  /* === Load catalogs (JSON at root) === */
  const names = ["hager", "legrand", "schneider", "sonepar", "wurth"];
  for (const n of names) {
    try {
      const r = await fetch(`${n}.json`);
      catalogs[n] = await r.json();
    } catch {
      catalogs[n] = [];
    }
  }

  /* === Load inventory === */
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

  function openPopup(item = null) {
    popup.style.display = "flex";
    if (item) {
      refInput.value = item.ref;
      desInput.value = item.designation;
      catInput.value = item.category || "";
      qtyInput.value = item.qty;
      priceInput.value = item.price || "";
    } else {
      refInput.value = "";
      desInput.value = "";
      catInput.value = "";
      qtyInput.value = 1;
      priceInput.value = "";
    }
  }

  function closePopup() {
    popup.style.display = "none";
  }

  /* === Events === */

  searchBox.addEventListener("input", () => renderTable(searchBox.value));

  catalogSelect.addEventListener("change", () => {
    if (catalogSelect.value === "all") {
      renderTable(searchBox.value);
      return;
    }

    tableBody.innerHTML = "";
    catalogs[catalogSelect.value].forEach(i => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${i.ref}</td>
        <td>${i.designation}</td>
        <td>${i.category || ""}</td>
        <td>0</td>
        <td></td>
        <td>0.00</td>
        <td><button class="addBtn">Ajouter</button></td>
      `;
      tr.querySelector(".addBtn").onclick = () =>
        openPopup({
          ref: i.ref,
          designation: i.designation,
          category: i.category,
          qty: 1,
          price: 0
        });
      tableBody.appendChild(tr);
    });
  });

  addManualBtn.addEventListener("click", () => openPopup());

  saveBtn.addEventListener("click", () => {
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
  });

  cancelBtn.addEventListener("click", closePopup);

  resetQtyBtn.addEventListener("click", () => {
    if (!confirm("Remettre toutes les quantités à zéro ?")) return;
    inventory.forEach(i => i.qty = 0);
    saveLocal();
    renderTable();
  });

  exportBtn.addEventListener("click", () => {
    if (!inventory.length) return alert("Inventaire vide");

    const rows = [
      ["Ref", "Désignation", "Catégorie", "Qté", "Prix", "Total"]
    ];

    inventory.forEach(i =>
      rows.push([
        i.ref,
        i.designation,
        i.category,
        i.qty,
        i.price,
        (i.qty * (i.price || 0)).toFixed(2)
      ])
    );

    const csv = rows.map(r => r.join(";")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "inventaire.csv";
    a.click();
  });

    /* === Camera === */
let qr = null;

scanBtn.addEventListener("click", async () => {
  scannerDiv.style.display = "block";
  scannerDiv.innerHTML = "<div id='reader' style='width:100%'></div>";

  try {
    qr = new Html5Qrcode("reader");

    await qr.start(
      { facingMode: "environment" }, // ✅ caméra arrière forcée
      {
        fps: 10,
        qrbox: { width: 280, height: 180 }
      },
      decodedText => {
        qr.stop();
        scannerDiv.style.display = "none";

        openPopup({
          ref: decodedText,
          designation: "",
          category: "",
          qty: 1,
          price: 0
        });
      }
    );
  } catch (err) {
    alert("Erreur caméra : " + err);
    scannerDiv.style.display = "none";
  }
});
