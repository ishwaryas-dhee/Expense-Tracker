const CATS = {
  Food:      {color:'var(--cat-food)'},
  Transport: {color:'var(--cat-transport)'},
  Shopping:  {color:'var(--cat-shopping)'},
  Bills:     {color:'var(--cat-bills)'},
  Health:    {color:'var(--cat-health)'},
  Fun:       {color:'var(--cat-fun)'},
  Other:     {color:'var(--cat-other)'},
};
const STORE_KEY = 'expenses';
let entries = [];
let loaded = false;

function fmt(n){
  return '₹' + Number(n).toLocaleString('en-IN', {minimumFractionDigits:2, maximumFractionDigits:2});
}
function todayISO(){ return new Date().toISOString().slice(0,10); }
function dayLabel(iso){
  const d = new Date(iso+'T00:00:00');
  const t = new Date(); t.setHours(0,0,0,0);
  const y = new Date(t); y.setDate(y.getDate()-1);
  const dd = new Date(d); dd.setHours(0,0,0,0);
  if(dd.getTime()===t.getTime()) return 'Today';
  if(dd.getTime()===y.getTime()) return 'Yesterday';
  return d.toLocaleDateString('en-IN', {day:'numeric', month:'short', year:'numeric'});
}

function loadEntries(){

  try{
    const data = localStorage.getItem(STORE_KEY);

    entries = data ? JSON.parse(data) : [];

  }catch(e){
    entries = [];
  }

  loaded = true;
  render();
}

function saveEntries(){

    try{

        localStorage.setItem(
            STORE_KEY,
            JSON.stringify(entries)
        );

    }
    catch(e){

        console.error("Could not save", e);

    }

}

function addEntry(amount, category, note){
  entries.unshift({
    id: 'e'+Date.now()+Math.random().toString(36).slice(2,6),
    amount: Math.round(amount*100)/100,
    category,
    note: note || category,
    date: todayISO(),
    ts: Date.now()
  });
  saveEntries();
  render();
}

function deleteEntry(id){
  entries = entries.filter(e=>e.id!==id);
  saveEntries();
  render();
}

function resetAll(){
  if(!confirm('Clear all recorded expenses? This cannot be undone.')) return;
  entries = [];
  saveEntries();
  render();
}

function groupByDay(list){
  const map = {};
  list.forEach(e=>{
    (map[e.date] = map[e.date] || []).push(e);
  });
  return Object.entries(map).sort((a,b)=> b[0].localeCompare(a[0]));
}

function render(){
  const app = document.getElementById('app');
  if(!loaded){ app.innerHTML = '<div class="status">Loading your ledger…</div>'; return; }

  const today = todayISO();
  const todayTotal = entries.filter(e=>e.date===today).reduce((s,e)=>s+e.amount,0);
  const monthKey = today.slice(0,7);
  const monthEntries = entries.filter(e=>e.date.slice(0,7)===monthKey);
  const monthTotal = monthEntries.reduce((s,e)=>s+e.amount,0);

  const byCat = {};
  monthEntries.forEach(e=>{ byCat[e.category] = (byCat[e.category]||0) + e.amount; });
  const catRows = Object.entries(byCat).sort((a,b)=>b[1]-a[1]);
  const maxCat = catRows.length ? catRows[0][1] : 1;

  let html = '';

  html += `
    <div class="receipt">
      <div class="receipt-label"><span>Spent Today</span><span>${today}</span></div>
      <div class="receipt-total">${fmt(todayTotal)}</div>
      <div class="receipt-sub">This month so far: <b>${fmt(monthTotal)}</b></div>
      <div class="breakdown">
        ${catRows.length ? catRows.map(([cat,amt])=>{
          const c = CATS[cat] ? CATS[cat].color : CATS.Other.color;
          const pct = Math.max(6, Math.round((amt/maxCat)*100));
          return `<div class="breakdown-row">
            <span class="dot" style="background:${c}"></span>
            <span class="name">${cat}</span>
            <span class="bar-track"><span class="bar-fill" style="width:${pct}%;background:${c}"></span></span>
            <span class="amt">${fmt(amt)}</span>
          </div>`;
        }).join('') : '<div class="breakdown-row"><span class="name">No expenses logged this month yet</span></div>'}
      </div>
    </div>

    <div class="add-card">
      <div class="row">
        <input id="amount" type="number" inputmode="decimal" step="0.01" min="0" placeholder="₹ 0.00">
        <select id="category">
          ${Object.keys(CATS).map(c=>`<option value="${c}">${c}</option>`).join('')}
        </select>
      </div>
      <div class="row">
        <input id="note" type="text" placeholder="What was it for? (optional)">
      </div>
      <button class="add-btn" id="addBtn">+ Add Expense</button>
    </div>
  `;

  const groups = groupByDay(entries);
  if(!groups.length){
    html += `<div class="empty">Nothing logged yet.<br>Add your first expense above.</div>`;
  }else{
    groups.forEach(([date, list])=>{
      const dayTotal = list.reduce((s,e)=>s+e.amount,0);
      html += `<div class="day-group">
        <div class="day-label"><span>${dayLabel(date)}</span><span>${fmt(dayTotal)}</span></div>
        ${list.sort((a,b)=>b.ts-a.ts).map(e=>{
          const c = CATS[e.category] ? CATS[e.category].color : CATS.Other.color;
          return `<div class="entry">
            <span class="dot" style="background:${c}"></span>
            <span class="desc" title="${e.note}">${e.note}</span>
            <span class="leader"></span>
            <span class="amt">${fmt(e.amount)}</span>
            <button class="del" data-id="${e.id}" title="Delete">✕</button>
          </div>`;
        }).join('')}
      </div>`;
    });
  }

  html += `<div class="footer-actions"><button class="reset-link" id="resetBtn">Clear all entries</button></div>`;

  app.innerHTML = html;

  document.getElementById('addBtn').addEventListener('click', ()=>{
    const amtEl = document.getElementById('amount');
    const catEl = document.getElementById('category');
    const noteEl = document.getElementById('note');
    const amt = parseFloat(amtEl.value);
    if(!amt || amt<=0){ amtEl.focus(); return; }
    addEntry(amt, catEl.value, noteEl.value.trim());
  });
  document.getElementById('note').addEventListener('keydown', (ev)=>{
    if(ev.key==='Enter') document.getElementById('addBtn').click();
  });
  document.getElementById('amount').addEventListener('keydown', (ev)=>{
    if(ev.key==='Enter') document.getElementById('addBtn').click();
  });
  document.getElementById('resetBtn').addEventListener('click', resetAll);
  app.querySelectorAll('.del').forEach(btn=>{
    btn.addEventListener('click', ()=> deleteEntry(btn.dataset.id));
  });
}

loadEntries();