const catalogs = {
  hager: [],
  legrand: [],
  schneider: [],
  sonepar: [],
  wurth: []
};

async function loadCatalog(name) {
  const res = await fetch(`${name}.json`);
  catalogs[name] = await res.json();
}

async function loadAllCatalogs() {
  await Promise.all([
    loadCatalog("hager"),
    loadCatalog("legrand"),
    loadCatalog("schneider"),
    loadCatalog("sonepar"),
    loadCatalog("wurth")
  ]);
}

loadAllCatalogs();
const catalogs = {};
const inventory = []; 
const STORAGE_KEY = 'inventaire_cabanon_v2';
document.addEventListener('DOMContentLoaded', async ()=>{
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

  const names = ['hager','legrand','schneider','sonepar','wurth'];
  for(const n of names){
    try{
      const r = await fetch('data/catalogs/'+n+'.json');
      catalogs[n] = await r.json();
    }catch(e){ catalogs[n]=[]; }
  }
  try{ const s = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); s.forEach(it=>inventory.push(it)); }catch(e){}

  function renderTable(filter=''){ tableBody.innerHTML=''; const f = filter.trim().toLowerCase(); inventory.forEach(it=>{ if(f && !(it.ref.toLowerCase().includes(f) || (it.designation||'').toLowerCase().includes(f))) return; const tr = document.createElement('tr'); tr.innerHTML = `<td>${it.ref}</td><td>${it.designation||''}</td><td>${it.category||''}</td><td>${it.qty}</td><td>${it.price?it.price.toFixed(2):''}</td><td>${(it.qty*(it.price||0)).toFixed(2)}</td><td><button class="editBtn">Modifier</button></td>`; tableBody.appendChild(tr); tr.querySelector('.editBtn').onclick = ()=> openPopup(it.ref); }); }
  renderTable();
  function saveLocal(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(inventory)); }
  searchBox.addEventListener('input', ()=> renderTable(searchBox.value));
  catalogSelect.addEventListener('change', ()=>{ const sel = catalogSelect.value; if(sel==='all'){ renderTable(searchBox.value); } else { tableBody.innerHTML=''; const arr = catalogs[sel] || []; arr.forEach(i=>{ const tr = document.createElement('tr'); tr.innerHTML = `<td>${i.ref}</td><td>${i.designation}</td><td>${i.category||''}</td><td>0</td><td></td><td>0.00</td><td><button class="addBtn">Ajouter</button></td>`; tableBody.appendChild(tr); tr.querySelector('.addBtn').onclick = ()=> openPopup(i.ref); }); } });

  function openPopup(ref=''){ popup.style.display='flex'; if(ref){ const it = inventory.find(x=>x.ref==ref); if(it){ refInput.value=it.ref; desInput.value=it.designation; catInput.value=it.category; qtyInput.value=it.qty; priceInput.value=it.price; return; } for(const k in catalogs){ const found = catalogs[k].find(x=>String(x.ref)==String(ref)); if(found){ refInput.value=found.ref; desInput.value=found.designation; catInput.value=found.category; priceInput.value=''; qtyInput.value=1; return; } } refInput.value=ref; desInput.value=''; catInput.value=''; qtyInput.value=1; priceInput.value=''; } else { refInput.value=''; desInput.value=''; catInput.value=''; qtyInput.value=1; priceInput.value=''; } }
  function closePopup(){ popup.style.display='none'; }
  saveBtn.onclick = ()=>{ const ref = refInput.value.trim(); const des = desInput.value.trim(); const cat = catInput.value.trim(); const qty = Number(qtyInput.value) || 0; const price = Number(priceInput.value) || 0; if(!ref || !des){ alert('Référence et désignation requises'); return; } const existing = inventory.find(x=>x.ref==ref); if(existing){ const replace = confirm('Référence existe. OK = Remplacer quantité, Cancel = Ajouter à l\\'existant'); existing.designation = des; existing.category=cat; existing.price=price; existing.qty = replace ? qty : (existing.qty + qty); } else { inventory.push({ref, designation:des, category:cat, qty, price}); } saveLocal(); renderTable(searchBox.value||''); closePopup(); };
  cancelBtn.onclick = ()=> closePopup();
  resetQtyBtn.onclick = ()=>{ if(confirm('Remettre toutes les quantités à zéro ?')){ inventory.forEach(i=>i.qty=0); saveLocal(); renderTable(); } };
  exportBtn.onclick = ()=>{ if(inventory.length==0){ alert('Aucune ligne'); return; } const rows = [['Ref','Designation','Category','Qty','Price','Total']]; inventory.forEach(i=> rows.push([i.ref,i.designation,i.category,i.qty,i.price,(i.qty*(i.price||0)).toFixed(2)])); const csv = rows.map(r=>r.map(c=>'\"'+String(c).replace(/\"/g,'\"\"')+'\"').join(';')).join('\\n'); const blob = new Blob([csv], {type:'text/csv'}); const a = document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='inventaire_export.csv'; a.click(); };
  importBtn.onclick = ()=>{ const f = fileImport.files[0]; if(!f){ alert('Choisir un fichier'); return; } const reader = new FileReader(); reader.onload = (e)=>{ const txt = e.target.result; const lines = txt.split(/\\r?\\n/); lines.forEach((ln,idx)=>{ if(!ln.trim()) return; const cols = ln.split(/;|,|\\t/); if(idx==0 && cols[0].toLowerCase().includes('ref')) return; const ref = cols[0]||''; const des = cols[1]||''; const cat = cols[2]||''; const price = parseFloat((cols[3]||'').replace(',', '.'))||0; if(!ref) return; catalogs['imported'] = catalogs['imported']||[]; catalogs['imported'].push({ref, designation:des, category:cat, price}); }); alert('Import terminé (vérifier dans recherche)'); }; reader.readAsText(f,'utf-8'); };
  let html5QrCode;
  scanBtn.onclick = ()=>{ if(scannerDiv.style.display === 'block'){ if(html5QrCode){ html5QrCode.stop().then(()=>{ scannerDiv.style.display='none'; }); } return; } scannerDiv.innerHTML = '<div id="reader" style="width:100%"></div>'; scannerDiv.style.display='block'; html5QrCode = new Html5Qrcode('reader'); Html5Qrcode.getCameras().then(cameras=>{ const cameraId = cameras.length ? cameras[0].id : null; html5QrCode.start(cameraId, {fps:10,qrbox:250}, decoded=>{ alert('Code détecté : '+decoded); html5QrCode.stop().then(()=>{ scannerDiv.style.display='none'; }); openPopup(decoded); }, err=>{}).catch(err=>{ alert('Erreur caméra: '+err); }); }).catch(err=>{ alert('Caméra non trouvée: '+err); }); };
  tableBody.addEventListener('click', e=>{ const tr = e.target.closest('tr'); if(!tr) return; const ref = tr.children[0].innerText; openPopup(ref); });
});
function findInCatalog(ref) {
  ref = ref.toUpperCase();

  for (const [brand, items] of Object.entries(catalogs)) {
    const found = items.find(
      item => item.ref.toUpperCase() === ref
    );

    if (found) {
      return {
        ref: found.ref,
        designation: found.designation,
        categorie: found.categorie || brand
      };
    }
  }
  return null;
}
