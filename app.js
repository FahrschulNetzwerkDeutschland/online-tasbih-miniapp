// ===== Online Tasbih – sauber + Multi-Page + Custom Dhikr (LocalStorage) =====

const CYCLE = 33;
const LS_KEY = "tasbih_miniapp_v3";

const DEFAULT_DHIKR = [
  { key: "subhanallah",  label: "سُبْحَانَ الله" },
  { key: "alhamdulillah", label: "ٱلْحَمْدُ لِلَّٰهِ" },
  { key: "allahuakbar",   label: "ٱللَّٰهُ أَكْبَر" },
  { key: "lailaha",       label: "لَا إِلٰهَ إِلَّا ٱللَّٰه" },
];

let state = {
  currentKey: "subhanallah",
  customDhikr: [],
  counts: {},   // { key: { total:number } }
  stars: 0
};

// ----- Elements -----
const countValue = document.getElementById("countValue");
const dhikrBtn = document.getElementById("dhikrBtn");
const counterBtn = document.getElementById("counterBtn");

const starValue = document.getElementById("starValue");
const beadsWrap = document.getElementById("beads");

const menuBtn = document.getElementById("menuBtn");
const menuPanel = document.getElementById("menuPanel");
const resetBtn = document.getElementById("resetBtn");

const customInput = document.getElementById("customInput");
const addBtn = document.getElementById("addBtn");
const clearCustomBtn = document.getElementById("clearCustomBtn");

const dhikrList = document.getElementById("dhikrList");

const navBtns = Array.from(document.querySelectorAll(".navBtn"));
const pages = {
  tasbih: document.getElementById("page-tasbih"),
  events: document.getElementById("page-events"),
  community: document.getElementById("page-community")
};

// ----- Helpers -----
function load(){
  try{
    const raw = localStorage.getItem(LS_KEY);
    if(!raw) return;
    const parsed = JSON.parse(raw);
    if(parsed && typeof parsed === "object"){
      state = {
        ...state,
        ...parsed,
        customDhikr: Array.isArray(parsed.customDhikr) ? parsed.customDhikr : [],
        counts: parsed.counts && typeof parsed.counts === "object" ? parsed.counts : {},
        stars: Number(parsed.stars || 0),
        currentKey: parsed.currentKey || "subhanallah"
      };
    }
  }catch(e){
    // ignore
  }
}

function save(){
  localStorage.setItem(LS_KEY, JSON.stringify(state));
}

function allDhikr(){
  return [...DEFAULT_DHIKR, ...state.customDhikr];
}

function ensureCount(key){
  if(!state.counts[key]) state.counts[key] = { total: 0 };
}

function getLabel(key){
  const item = allDhikr().find(d => d.key === key);
  return item ? item.label : "سُبْحَانَ الله";
}

function currentTotal(){
  ensureCount(state.currentKey);
  return state.counts[state.currentKey].total;
}

function currentInCycle(){
  return currentTotal() % CYCLE;
}

function setDhikr(key){
  state.currentKey = key;
  save();
  render();
}

function renderDhikrList(){
  dhikrList.innerHTML = "";

  allDhikr().forEach(d => {
    const btn = document.createElement("button");
    btn.className = "item";
    btn.textContent = d.label;
    btn.onclick = () => {
      setDhikr(d.key);
      menuPanel.classList.remove("open");
    };
    dhikrList.appendChild(btn);
  });
}

function renderBeads(){
  beadsWrap.innerHTML = "";
  const size = beadsWrap.getBoundingClientRect().width;
  const r = size * 0.42;
  const cx = size / 2;
  const cy = size / 2;

  const onCount = currentInCycle();

  for(let i=0;i<CYCLE;i++){
    const a = (Math.PI * 2 * i) / CYCLE - Math.PI/2;
    const x = cx + r * Math.cos(a);
    const y = cy + r * Math.sin(a);

    const bead = document.createElement("div");
    bead.className = "bead" + (i < onCount ? " on" : "");
    bead.style.left = (x - 7) + "px";
    bead.style.top  = (y - 7) + "px";
    beadsWrap.appendChild(bead);
  }
}

function render(){
  // stars
  starValue.textContent = String(state.stars || 0);

  // main
  const inCycle = currentInCycle();
  countValue.textContent = String(inCycle);
  dhikrBtn.textContent = getLabel(state.currentKey);

  renderBeads();
  renderDhikrList();
}

// ----- Actions -----
function increment(){
  ensureCount(state.currentKey);
  const before = currentInCycle();

  state.counts[state.currentKey].total += 1;

  const after = currentInCycle();

  // wenn ein 33er Zyklus voll ist -> +1 Stern
  if(before === CYCLE - 1 && after === 0){
    state.stars += 1;
  }

  save();
  render();
}

function resetCurrent(){
  ensureCount(state.currentKey);
  state.counts[state.currentKey].total = 0;
  save();
  render();
}

function addCustomDhikr(){
  const txt = (customInput.value || "").trim();
  if(!txt) return;

  // key generieren
  const key = "c_" + Date.now();

  state.customDhikr.push({ key, label: txt });
  customInput.value = "";
  save();
  render();
}

function clearCustom(){
  state.customDhikr = [];
  save();
  render();
}

// ----- Menu -----
menuBtn.addEventListener("click", () => {
  menuPanel.classList.toggle("open");
});

// ----- Main buttons -----
counterBtn.addEventListener("click", increment);
resetBtn.addEventListener("click", resetCurrent);

addBtn.addEventListener("click", addCustomDhikr);
clearCustomBtn.addEventListener("click", clearCustom);

// Enter im Input soll hinzufügen
customInput.addEventListener("keydown", (e) => {
  if(e.key === "Enter") addCustomDhikr();
});

// ----- Navigation -----
function showPage(name){
  Object.values(pages).forEach(p => p.classList.remove("active"));
  pages[name].classList.add("active");

  navBtns.forEach(b => b.classList.remove("active"));
  navBtns.find(b => b.dataset.page === name)?.classList.add("active");

  // Menü schließen, wenn Seite wechselt
  menuPanel.classList.remove("open");
}

navBtns.forEach(btn => {
  btn.addEventListener("click", () => {
    showPage(btn.dataset.page);
  });
});

// ----- Init -----
load();
ensureCount(state.currentKey);

// Telegram WebApp optional
try{
  const tg = window.Telegram?.WebApp;
  if(tg){
    tg.ready();
    tg.expand();
  }
}catch(e){}

render();
showPage("tasbih");