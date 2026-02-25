// ===== Online Tasbih – mit eigenen Dhikr =====

const CYCLE = 33;
const LS_KEY = "tasbih_miniapp_v2";

// Standard-Dhikr (fix)
const DEFAULT_DHIKR = [
  { key: "subhanallah",   label: "سبحان الله" },
  { key: "alhamdulillah", label: "الحمدالله" },
  { key: "allahuakbar",   label: "الله اکبر" },
  { key: "lailaha",       label: "لا اله الا الله" },
];

// State
let currentKey = "subhanallah";

// state.counts[key] = { total, cycles }
let state = {
  customDhikr: [],   // [{key,label}]
  counts: {},        // dict
};

// Telegram
const tg = window.Telegram?.WebApp;

// UI
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
  // sichere key erzeugung
  const base = label
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^\p{L}\p{N}_]+/gu, ""); // unicode letters/numbers
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

// ===== Menü dynamisch rendern =====
function renderMenuList(){
  // Wir nutzen die bestehenden 4 Default-Buttons im HTML als "Anker"
  // und hängen die Custom-Items darunter ein.

  // Alle vorhandenen Items aus dem DOM lesen:
  const existing = menuPanel.querySelectorAll(".item");
  // Custom Items entfernen (die mit data-custom="1")
  menuPanel.querySelectorAll('.item[data-custom="1"]').forEach(el => el.remove());

  // Nach dem letzten Default-Item einfügen:
  const lastDefault = existing[existing.length - 1];

  state.customDhikr.forEach(d => {
    const btn = document.createElement("button");
    btn.className = "item";
    btn.dataset.key = d.key;
    btn.dataset.custom = "1";
    btn.textContent = d.label;
    lastDefault.insertAdjacentElement("afterend", btn);
  });
}

// ===== Speicherung =====
async function loadState(){
  // localStorage zuerst
  try{
    const raw = localStorage.getItem(LS_KEY);
    if(raw){
      const parsed = JSON.parse(raw);
      if(parsed?.state) state = parsed.state;
      if(parsed?.currentKey) currentKey = parsed.currentKey;
    }
  }catch(e){}

  // Telegram CloudStorage optional
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

  // counts für alle dhikr sicherstellen
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

// ===== Render =====
function render(){
  ensureCount(currentKey);
  const s = state.counts[currentKey];

  const total = Number(s.total || 0);
  const cycles = Number(s.cycles || 0);

  countValue.textContent = String(total);
  dhikrBtn.textContent = getLabelByKey(currentKey);

  // Stern zeigt Pakete (33er)
  starValue.textContent = String(cycles);

  // beads progress
  const progress = total % CYCLE; // 0..32
  const beads = beadsWrap.querySelectorAll(".bead");
  beads.forEach((b, idx)=>{
    const step = idx+1;
    if(progress !== 0 && step <= progress) b.classList.add("on");
    else b.classList.remove("on");
  });

  renderMenuList();
}

// ===== 33er Effekt =====
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

  // Duplikate vermeiden (gleicher Text)
  const exists = state.customDhikr.some(d => d.label.trim() === label);
  if(exists){
    customInput.value = "";
    return;
  }

  const key = slugKeyFromLabel(label);
  state.customDhikr.push({ key, label });
  ensureCount(key);

  // sofort auswählen
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

  // existiert?
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