/* =========================
   INVENTAIRE CABANON - APP
   ========================= */

const catalogs = {};
const inventory = [];
const STORAGE_KEY = 'inventaire_cabanon_v2';

document.addEventListener('DOMContentLoaded', async () => {

  /* ===== ELEMENTS DOM ===== */
  const tableBody = document.querySelector('#table tbody');
  const searchBox = document.getElementById('searchBox');
  const catalogSelect = document.getElementById('catalogSelect');
  const scanBtn = document.getElementById('scanBtn');
  const scannerDiv = document.getElementById('scanner');
  const fileImport = document.getElementById('fileImport');
  const importBtn = document.getElementById('importBtn');
  const resetQtyBtn = document.getElementById('resetQtyBtn');
  const exportBtn = document.getElementById('exportBtn');

  const popup = document.getElementById('popup');
  const refInput = document.getElementById('refInput');
  const desInput = document.getElementById('desInput');
  const catInput = document.getElementById('catInput');
  const qtyInput = document.getElementById('qtyInput');
  const priceInput = document.getElementById('priceInput');
  const saveBtn = document.getElementById('saveBtn');
  const cancelBtn = document.getElementById('cancelBtn');

  /* ===== CHARGEMENT CATALOGUES ===== */
  const names = ['hager', 'legrand', 'schneider', 'sonepar', 'wurth'];

  for (const name of names) {
    try {
      const res = await fetch(`data/catalogs/${name}.json`);
      catalogs[name] = await res.json();
    } catch (e) {
      catalogs[name] = [];
      console.warn(`Catalogue ${name} non chargé`);
    }
  }

  /* ===== CHARGEMENT INVENTAIRE ===== */
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    saved.forEach(i => inventory.push(i));
  } catch (e) {}

  /* ===== RENDU TABLE ===== */
  function renderTable(filter = '') {
    tableBody.innerHTML = '';
    const f = filter.toLowerCase();

    inventory.forEach(item => {
      if (
        f &&
        !item.ref.toLowerCase().includes(f) &&
        !item.designation.toLowerCase().includes(f)
      ) return;

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${item.ref}</td>
        <td>${item.designation}</td>
        <td>${item.category || ''}</td>
        <td>${item.qty}</td>
        <td>${item.price ? item.price.toFixed(2) : ''}</td>
        <td>${(item.qty * (item.price || 0)).toFixed(2)}</td>
        <td><button class="editBtn">Modifier</button></td>
      `;

      tr.querySelector('.editBtn').onclick = () => openPopup(item.ref);
      tableBody.appendChild(tr);
    });
  }

  renderTable();

  function saveLocal() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(inventory));
  }

  /* ===== RECHERCHE ===== */
  searchBox.addEventListener('input', () => renderTable(searchBox.value));

  /* ===== FILTRE CATALOGUE ===== */
  catalogSelect.addEventListener('change', () => {
    const sel = catalogSelect.value;
    tableBody.innerHTML = '';

    if (sel === 'all') {
      renderTable(searchBox.value);
      return;
    }

    (catalogs[sel] || []).forEach(item => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${item.ref}</td>
        <td>${item.designation}</td>
        <td>${item.category || sel}</td>
        <td>0</td>
        <td></td>
        <td>0.00</td>
        <td><button class="addBtn">Ajouter</button></td>
      `;

      tr.querySelector('.addBtn').onclick = () => openPopup(item.ref);
      tableBody.appendChild(tr);
    });
  });

  /* ===== POPUP ===== */
  function openPopup(ref = '') {
    popup.style.display = 'flex';

    if (ref) {
      const existing = inventory.find(i => i.ref === ref);
      if (existing) {
        refInput.value = existing.ref;
        desInput.value = existing.designation;
        catInput.value = existing.category || '';
        qtyInput.value = existing.qty;
        priceInput.value = existing.price || '';
        return;
      }

      const found = findInCatalog(ref);
      if (found) {
        refInput.value = found.ref;
        desInput.value = found.designation;
        catInput.value = found.category;
        qtyInput.value = 1;
        priceInput.value = '';
        return;
      }
    }

    refInput.value = ref;
    desInput.value = '';
    catInput.value = '';
    qtyInput.value = 1;
    priceInput.value = '';
  }

  function closePopup() {
    popup.style.display = 'none';
  }

  saveBtn.onclick = () => {
    const ref = refInput.value.trim();
    const des = desInput.value.trim();
    const cat = catInput.value.trim();
    const qty = Number(qtyInput.value) || 0;
    const price = Number(priceInput.value) || 0;

    if (!ref || !des) {
      alert('Référence et désignation obligatoires');
      return;
    }

    const existing = inventory.find(i => i.ref === ref);

    if (existing) {
      const replace = confirm(
        'Référence existante.\nOK = Remplacer quantité\nAnnuler = Ajouter'
      );
      existing.designation = des;
      existing.category = cat;
      existing.price = price;
      existing.qty = replace ? qty : existing.qty + qty;
    } else {
      inventory.push({ ref, designation: des, category: cat, qty, price });
    }

    saveLocal();
    renderTable(searchBox.value);
    closePopup();
  };

  cancelBtn.onclick = closePopup;

  /* ===== RESET QTY ===== */
  resetQtyBtn.onclick = () => {
    if (confirm('Remettre toutes les quantités à zéro ?')) {
      inventory.forEach(i => i.qty = 0);
      saveLocal();
      renderTable();
    }
  };

  /* ===== EXPORT CSV ===== */
  exportBtn.onclick = () => {
    if (!inventory.length) return alert('Aucune donnée');

    const rows = [
      ['Ref', 'Designation', 'Category', 'Qty', 'Price', 'Total'],
      ...inventory.map(i => [
        i.ref,
        i.designation,
        i.category,
        i.qty,
        i.price,
        (i.qty * (i.price || 0)).toFixed(2)
      ])
    ];

    const csv = rows.map(r =>
      r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(';')
    ).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'inventaire.csv';
    a.click();
  };

  /* ===== IMPORT CSV ===== */
  importBtn.onclick = () => {
    const f = fileImport.files[0];
    if (!f) return alert('Choisir un fichier');

    const reader = new FileReader();
    reader.onload = e => {
      e.target.result.split(/\r?\n/).forEach((line, i) => {
        if (!line.trim() || i === 0) return;
        const [ref, des, cat, price] = line.split(/;|,|\t/);
        if (!ref) return;
        catalogs.imported = catalogs.imported || [];
        catalogs.imported.push({
          ref, designation: des, category: cat, price: Number(price) || 0
        });
      });
      alert('Import terminé');
    };
    reader.readAsText(f, 'utf-8');
  };

  /* ===== CAMERA SCAN ===== */
  let html5QrCode;

  scanBtn.onclick = () => {
    if (scannerDiv.style.display === 'block') {
      html5QrCode?.stop().then(() => scannerDiv.style.display = 'none');
      return;
    }

    scannerDiv.innerHTML = '<div id="reader" style="width:100%"></div>';
    scannerDiv.style.display = 'block';

    html5QrCode = new Html5Qrcode('reader');

    Html5Qrcode.getCameras().then(cameras => {
      if (!cameras.length) throw 'Aucune caméra';

      html5QrCode.start(
        cameras[0].id,
        { fps: 10, qrbox: 250 },
        decoded => {
          html5QrCode.stop();
          scannerDiv.style.display = 'none';
          openPopup(decoded);
        }
      );
    }).catch(err => alert('Erreur caméra : ' + err));
  };
});

/* ===== RECHERCHE DANS CATALOGUES ===== */
function findInCatalog(ref) {
  ref = String(ref).toUpperCase();

  for (const brand in catalogs) {
    const found = (catalogs[brand] || []).find(
      i => String(i.ref).toUpperCase() === ref
    );
    if (found) {
      return {
        ref: found.ref,
        designation: found.designation,
        category: found.category || brand
      };
    }
  }
  return null;
                          }
