// ===== Online Tasbih – mit eigenen Dhikr =====

const CYCLE = 33;
const LS_KEY = "tasbih_miniapp_v2";

const DEFAULT_DHIKR = [
  { key: "subhanallah",   label: "سبحان الله" },
  { key: "alhamdulillah", label: "الحمدالله" },
  { key: "allahuakbar",   label: "الله اکبر" },
  { key: "lailaha",       label: "لا اله الا الله" },
];

let currentKey = "subhanallah";

let state = {
  customDhikr: [],   // [{key,label}]
  counts: {},        // { key: {total, cycles} }
};

const tg = window.Telegram?.WebApp;

// UI (passt zu deinem HTML)
const countValue = document.getElementById("countValue");
const dhikrBtn = document.getElementById("dhikrBtn");
const counterBtn = document.getElementById("counterBtn");
const starValue = document.getElementById("starValue");

const menuBtn = document.getElementById("menuBtn");
const menuPanel = document.getElementById("menuPanel");
const resetBtn = document.getElementById("resetBtn");

const beadsWrap = document.getElementById("beads");
const burst = document.getElementById("burst");

const customInput = document.getElementById("customInput");
const addBtn = document.getElementById("addBtn");

// ===== Helpers =====
function allDhikr() {
  return [...DEFAULT_DHIKR, ...state.customDhikr];
}

function ensureCount(key){
  if(!state.counts[key]){
    state.counts[key] = { total: 0, cycles: 0 };
  }
}

function getLabelByKey(key){
  const item = allDhikr().find(d => d.key === key);
  return item ? item.label : "سبحان الله";
}

function slugKeyFromLabel(label){
  const base = label
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^\p{L}\p{N}_]+/gu, "");
  const rand = Math.random().toString(16).slice(2, 6);
  return `c_${base || "dhikr"}_${rand}`;
}

// ===== Beads (33) =====
function buildBeads(){
  beadsWrap.innerHTML = "";
  const n = CYCLE;

  const size = beadsWrap.getBoundingClientRect().width || 320;
  const r = size/2 - 12;
  const cx = size/2, cy = size/2;

  for(let i=0;i<n;i++){
    const a = (Math.PI*2) * (i/n) - Math.PI/2;
    const x = cx + r*Math.cos(a);
    const y = cy + r*Math.sin(a);

    const d = document.createElement("div");
    d.className = "bead";
    d.style.left = `${x}px`;
    d.style.top  = `${y}px`;
    beadsWrap.appendChild(d);
  }
}

// ===== Speicherung =====
async function loadState(){
  try{
    const raw = localStorage.getItem(LS_KEY);
    if(raw){
      const parsed = JSON.parse(raw);
      if(parsed?.state) state = parsed.state;
      if(parsed?.currentKey) currentKey = parsed.currentKey;
    }
  }catch(e){}

  if(tg?.CloudStorage){
    try{
      const raw = await new Promise((resolve, reject)=>{
        tg.CloudStorage.getItem(LS_KEY, (err, val)=>{
          if(err) reject(err); else resolve(val);
        });
      });
      if(raw){
        const parsed = JSON.parse(raw);
        if(parsed?.state) state = parsed.state;
        if(parsed?.currentKey) currentKey = parsed.currentKey;
      }
    }catch(e){}
  }

  allDhikr().forEach(d => ensureCount(d.key));
  ensureCount(currentKey);
}

async function saveState(){
  const payload = JSON.stringify({ state, currentKey });
  try{ localStorage.setItem(LS_KEY, payload); }catch(e){}
  if(tg?.CloudStorage){
    try{
      await new Promise((resolve, reject)=>{
        tg.CloudStorage.setItem(LS_KEY, payload, (err)=>{
          if(err) reject(err); else resolve(true);
        });
      });
    }catch(e){}
  }
}

// ===== Custom Items in Menü anzeigen =====
function renderCustomMenuItems(){
  // Entferne alte Custom-Buttons
  menuPanel.querySelectorAll('.item[data-custom="1"]').forEach(el => el.remove());

  // Default-Items im Panel finden
  const defaultItems = menuPanel.querySelectorAll(".item");
  const anchor = defaultItems[defaultItems.length - 1]; // nach letztem Default einfügen

  state.customDhikr.forEach(d => {
    const btn = document.createElement("button");
    btn.className = "item";
    btn.dataset.key = d.key;
    btn.dataset.custom = "1";
    btn.textContent = d.label;
    anchor.insertAdjacentElement("afterend", btn);
  });
}

// ===== Render =====
function render(){
  ensureCount(currentKey);
  const s = state.counts[currentKey];

  const total = Number(s.total || 0);
  const cycles = Number(s.cycles || 0);

  countValue.textContent = String(total);
  dhikrBtn.textContent = getLabelByKey(currentKey);

  // Stern = 33er Pakete
  starValue.textContent = String(cycles);

  // beads progress
  const progress = total % CYCLE;
  const beads = beadsWrap.querySelectorAll(".bead");
  beads.forEach((b, idx)=>{
    const step = idx+1;
    if(progress !== 0 && step <= progress) b.classList.add("on");
    else b.classList.remove("on");
  });

  renderCustomMenuItems();
}

// ===== Effekt =====
function popEffect(){
  const rect = counterBtn.getBoundingClientRect();
  const cx = rect.left + rect.width/2;
  const cy = rect.top + rect.height/2;

  for(let i=0;i<18;i++){
    const p = document.createElement("div");
    p.className = "pop";
    const angle = Math.random()*Math.PI*2;
    const dist = 80 + Math.random()*80;
    const dx = Math.cos(angle)*dist;
    const dy = Math.sin(angle)*dist;

    p.style.left = `${cx}px`;
    p.style.top  = `${cy}px`;
    p.style.setProperty("--dx", `${dx}px`);
    p.style.setProperty("--dy", `${dy}px`);

    burst.appendChild(p);
    setTimeout(()=>p.remove(), 700);
  }

  if(tg?.HapticFeedback){
    tg.HapticFeedback.notificationOccurred("success");
  }
}

// ===== Aktionen =====
function increment(){
  ensureCount(currentKey);
  const s = state.counts[currentKey];
  s.total += 1;

  if(s.total % CYCLE === 0){
    s.cycles += 1;
    popEffect();
  }else{
    if(tg?.HapticFeedback){
      tg.HapticFeedback.impactOccurred("light");
    }
  }

  render();
  saveState();
}

function resetCurrent(){
  state.counts[currentKey] = { total: 0, cycles: 0 };
  render();
  saveState();
}

function addCustomDhikr(){
  const label = (customInput?.value || "").trim();
  if(!label) return;

  // Duplikat-Check
  const existsDefault = DEFAULT_DHIKR.some(d => d.label.trim() === label);
  const existsCustom  = state.customDhikr.some(d => d.label.trim() === label);
  if(existsDefault || existsCustom){
    customInput.value = "";
    return;
  }

  const key = slugKeyFromLabel(label);
  state.customDhikr.push({ key, label });
  ensureCount(key);

  currentKey = key;
  customInput.value = "";

  render();
  saveState();
}

// ===== Events =====
counterBtn.addEventListener("click", increment);

dhikrBtn.addEventListener("click", ()=>{
  menuPanel.classList.toggle("open");
});

menuBtn.addEventListener("click", ()=>{
  menuPanel.classList.toggle("open");
});

menuPanel.addEventListener("click", (e)=>{
  const btn = e.target.closest(".item");
  if(!btn) return;

  const key = btn.dataset.key;
  if(!key) return;

  const ok = allDhikr().some(d => d.key === key);
  if(!ok) return;

  currentKey = key;
  menuPanel.classList.remove("open");
  render();
  saveState();
});

resetBtn.addEventListener("click", ()=>{
  resetCurrent();
  menuPanel.classList.remove("open");
});

addBtn?.addEventListener("click", addCustomDhikr);

customInput?.addEventListener("keydown", (e)=>{
  if(e.key === "Enter") addCustomDhikr();
});

// ===== Init =====
(async function init(){
  if(tg){
    tg.ready();
    tg.expand();
  }

  buildBeads();
  await loadState();
  render();

  window.addEventListener("resize", ()=>{
    buildBeads();
    render();
  });
})();
/* ===== PAGE NAVIGATION ===== */

const navButtons = document.querySelectorAll(".navBtn");
const pages = document.querySelectorAll(".page");

navButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    const target = btn.dataset.page;

    // Buttons active
    navButtons.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");

    // Pages wechseln
    pages.forEach(page => {
      page.classList.remove("active");
    });

    document.getElementById("page-" + target).classList.add("active");
  });
});