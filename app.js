// ---------- Dhikr Daten ----------
const DHIKR = {
  subhanallah:   { label: "سبحان الله" },
  alhamdulillah: { label: "الحمدالله" },
  allahuakbar:   { label: "الله اکبر" },
  lailaha:       { label: "لا اله الا الله" },
};

const CYCLE = 33;

let currentKey = "subhanallah";
let state = {
  subhanallah:   { total: 0, cycles: 0 },
  alhamdulillah: { total: 0, cycles: 0 },
  allahuakbar:   { total: 0, cycles: 0 },
  lailaha:       { total: 0, cycles: 0 },
};

// ---------- UI ----------
const tg = window.Telegram?.WebApp;
const countValue = document.getElementById("countValue");
const dhikrBtn = document.getElementById("dhikrBtn");
const counterBtn = document.getElementById("counterBtn");
const starValue = document.getElementById("starValue");

const menuBtn = document.getElementById("menuBtn");
const menuPanel = document.getElementById("menuPanel");
const resetBtn = document.getElementById("resetBtn");

const beadsWrap = document.getElementById("beads");
const burst = document.getElementById("burst");

// ---------- Beads erzeugen (33 Punkte im Kreis) ----------
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

// ---------- Speicherung ----------
const LS_KEY = "tasbih_miniapp_v1";

async function loadState(){
  // 1) localStorage
  try{
    const raw = localStorage.getItem(LS_KEY);
    if(raw){
      const parsed = JSON.parse(raw);
      if(parsed?.state) state = parsed.state;
      if(parsed?.currentKey) currentKey = parsed.currentKey;
      return;
    }
  }catch(e){}

  // 2) Telegram CloudStorage (optional)
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

// ---------- Render ----------
function render(){
  const s = state[currentKey] || { total: 0, cycles: 0 };
  const total = Number(s.total || 0);
  const cycles = Number(s.cycles || 0);

  countValue.textContent = String(total);
  dhikrBtn.textContent = DHIKR[currentKey]?.label || "سبحان الله";
  starValue.textContent = String(cycles);

  const progress = total % CYCLE; // 0..32
  const beads = beadsWrap.querySelectorAll(".bead");
  beads.forEach((b, idx)=>{
    const step = idx+1;
    if(progress !== 0 && step <= progress) b.classList.add("on");
    else b.classList.remove("on");
  });
}

// ---------- 33er "Platz" Effekt ----------
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

// ---------- Aktionen ----------
function increment(){
  const s = state[currentKey];
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
  state[currentKey] = { total: 0, cycles: 0 };
  render();
  saveState();
}

// ---------- Events ----------
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
  if(!DHIKR[key]) return;
  currentKey = key;
  menuPanel.classList.remove("open");
  render();
  saveState();
});

resetBtn.addEventListener("click", ()=>{
  resetCurrent();
  menuPanel.classList.remove("open");
});

// ---------- Init ----------
(async function init(){
  if(tg){
    tg.ready();
    tg.expand();
    tg.setHeaderColor?.("#0f141a");
    tg.setBackgroundColor?.("#0f141a");
  }

  buildBeads();
  await loadState();
  render();

  window.addEventListener("resize", ()=>{
    buildBeads();
    render();
  });
})();
