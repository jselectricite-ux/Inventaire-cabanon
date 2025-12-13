/* =============================
   Inventaire Cabanon – app.js
   ============================= */

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
  /* === Éléments DOM === */
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

  /* === Chargement inventaire local === */
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    JSON.parse(saved).forEach(i => inventory.push(i));
  }

  /* === Fonctions === */

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
        <td>${item.price ? item.price.toFixed(2) : ""}</td>
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

  /* === Événements === */

  addManualBtn.onclick = () => openPopup();

  cancelBtn.onclick = closePopup;

  saveBtn.onclick = () => {
    const ref = refInput.value.trim();
    const des = desInput.value.trim();
    const cat = catInput.value.trim();
    const qty = Number(qtyInput.value);
    const price = Number(priceInput.value);

    if (!ref || !des) {
      alert("Référence et désignation obligatoires");
      return;
    }

    const existing = inventory.find(i => i.ref === ref);
    if (existing) {
      existing.qty += qty;
      existing.designation = des;
      existing.category = cat;
      existing.price = price;
    } else {
      inventory.push({ ref, designation: des, category: cat, qty, price });
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
      ["Ref", "Désignation", "Catégorie", "Qté", "Prix", "Total"],
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

  searchBox.oninput = () => renderTable(searchBox.value);

  renderTable();
});
