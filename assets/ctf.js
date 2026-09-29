// Ryzen Ronin CTF — board + challenge page logic.

const CATEGORY_COLORS = {
  "Web": "#e5383b",
  "OSINT": "#3a86ff",
  "Cryptography": "#f2c14e",
  "Forensics": "#3ddc97",
  "Steganography": "#c77dff",
  "Reverse Engineering": "#ff7b00",
  "Pwn": "#ff4d8d",
  "Misc": "#9b98a6",
};
const catColor = c => CATEGORY_COLORS[c] || "#9b98a6";

const STORE_KEY = "ryzenronin-ctf-solved";
// { challengeId: submittedFlag }
function loadSolved() {
  try {
    const v = JSON.parse(localStorage.getItem(STORE_KEY));
    return v && typeof v === "object" && !Array.isArray(v) ? v : {};
  } catch (e) { return {}; }
}
function saveSolved(map) {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(map)); } catch (e) { /* storage blocked */ }
}
const isSolved = id => Object.prototype.hasOwnProperty.call(loadSolved(), id);

const esc = s => String(s).replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));

// Flags are checked with PBKDF2-SHA256 (300k rounds, per-challenge salt), so the hashes in
// challenges.js can't be cheaply brute-forced or dictionary-guessed offline.
const PBKDF2_ROUNDS = 300000;

async function flagHash(id, flag) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(flag), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: enc.encode("RyzenRonin|" + id), iterations: PBKDF2_ROUNDS }, key, 256);
  return [...new Uint8Array(bits)].map(b => b.toString(16).padStart(2, "0")).join("");
}

async function sha256Hex(text) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
}

// Solve proof: a code built from the real flags a player submitted. Organizers verify it offline.
async function makeProof(name) {
  const solved = loadSolved();
  const ids = Object.keys(solved).filter(id => CHALLENGES.some(c => c.id === id)).sort();
  const payload = ["RyzenRonin-proof", name.trim(), ...ids.map(id => id + "=" + solved[id])].join("|");
  const code = (await sha256Hex(payload)).slice(0, 20);
  return `${name.trim()} | ${ids.join(",") || "none"} | ${code}`;
}

// ---------- Board (index.html) ----------

let activeCategory = "All";

function renderBoard() {
  const grid = document.getElementById("board");
  if (!grid) return;
  const categories = [...new Set(CHALLENGES.map(c => c.category))];

  const chips = document.getElementById("chips");
  chips.innerHTML = "";
  ["All", ...categories].forEach(cat => {
    const count = cat === "All" ? CHALLENGES.length : CHALLENGES.filter(c => c.category === cat).length;
    const b = document.createElement("button");
    b.className = "chip";
    b.setAttribute("aria-pressed", String(cat === activeCategory));
    b.textContent = `${cat} (${count})`;
    b.addEventListener("click", () => { activeCategory = cat; renderBoard(); });
    chips.appendChild(b);
  });
  chips.hidden = CHALLENGES.length === 0;

  const list = CHALLENGES.filter(c => activeCategory === "All" || c.category === activeCategory);
  grid.innerHTML = list.length ? "" : `<div class="card empty" style="grid-column:1/-1">🏯 Challenges are being forged. Check back soon, ronin.</div>`;
  list.forEach(c => {
    const done = isSolved(c.id);
    const a = document.createElement("a");
    a.className = "card level chall" + (done ? " solved" : "");
    a.href = "challenge.html?id=" + encodeURIComponent(c.id);
    a.style.setProperty("--cat", catColor(c.category));
    a.innerHTML = `
      <div class="meta"><span class="badge">${esc(c.category)}</span><span>${esc(c.points)} pts</span></div>
      <h3>${esc(c.title)}</h3>
      <div class="by">by ${esc(c.author)} · ${esc(c.difficulty || "")}</div>
      <div class="tick">${done ? "✔ Solved" : ""}</div>`;
    grid.appendChild(a);
  });

  const total = CHALLENGES.reduce((s, c) => s + c.points, 0);
  const earned = CHALLENGES.filter(c => isSolved(c.id)).reduce((s, c) => s + c.points, 0);
  const nSolved = CHALLENGES.filter(c => isSolved(c.id)).length;
  document.getElementById("score").textContent = `${earned} / ${total} pts · ${nSolved} / ${CHALLENGES.length} flags`;
  document.getElementById("bar").style.width = total ? (earned / total * 100) + "%" : "0";
}

// ---------- Challenge page (challenge.html) ----------

function renderChallenge() {
  const root = document.getElementById("challenge");
  if (!root) return;
  const id = new URLSearchParams(location.search).get("id");
  const c = CHALLENGES.find(x => x.id === id);
  if (!c) {
    root.innerHTML = `<div class="card empty">Challenge not found. <a href="index.html">Back to the board</a></div>`;
    return;
  }
  document.title = `${c.title} · Ryzen Ronin CTF`;
  root.style.setProperty("--cat", catColor(c.category));
  const done = isSolved(c.id);

  const files = (c.files || []).map(f => `<a href="${esc(f.path)}" download>⬇ ${esc(f.name)}</a>`).join("");
  const links = (c.links || []).map(l => `<a href="${esc(l.url)}" target="_blank" rel="noopener">🔗 ${esc(l.name)}</a>`).join("");
  const hints = (c.hints || []).map((h, i) => `<details class="hint"><summary>Hint ${i + 1}</summary><p>${h}</p></details>`).join("");

  root.innerHTML = `
    <div class="meta" style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:10px">
      <span class="badge">${esc(c.category)}</span>
      <span class="pill">${esc(c.points)} PTS${c.difficulty ? " · " + esc(c.difficulty).toUpperCase() : ""}</span>
    </div>
    <h1>${esc(c.title)}</h1>
    <p class="lede">Challenge by <strong style="color:var(--text)">${esc(c.author)}</strong></p>

    <div class="card story desc" style="border-left-color:var(--cat)">${c.description}</div>

    ${files || links ? `<div class="card files"><h3>${files ? "Files" : "Links"}</h3>${files}${links}</div>` : ""}

    <div class="card">
      <h3>Submit flag</h3>
      <div class="row">
        <input type="text" id="flag" placeholder="RyzenRonin{...}" aria-label="Flag" ${done ? "disabled" : ""}>
        <button class="btn" id="submit" ${done ? "disabled" : ""}>Submit</button>
      </div>
      <div class="status" id="status" style="margin-top:8px">${done ? "✔ Solved" : ""}</div>
    </div>

    ${hints ? `<div class="card">${hints}</div>` : ""}`;

  if (done) document.getElementById("status").style.color = "var(--ok)";

  const input = document.getElementById("flag");
  const status = document.getElementById("status");
  const submit = async () => {
    const guess = input.value.trim();
    if (!/^RyzenRonin\{.+\}$/.test(guess)) {
      status.className = "status bad";
      status.textContent = "Flag format is RyzenRonin{...}";
      return;
    }
    status.className = "status";
    status.textContent = "Checking…";
    if ((await flagHash(c.id, guess)) === c.hash) {
      const map = loadSolved();
      map[c.id] = guess;
      saveSolved(map);
      renderChallenge();
    } else {
      status.className = "status bad";
      status.textContent = "✘ Not quite. Keep hunting.";
    }
  };
  document.getElementById("submit").addEventListener("click", submit);
  input.addEventListener("keydown", e => { if (e.key === "Enter") submit(); });
}

function resetProgress() {
  if (confirm("Wipe your progress?")) { saveSolved({}); renderBoard(); }
}

async function showProof() {
  const name = document.getElementById("proof-name").value;
  const out = document.getElementById("proof-out");
  if (!name.trim()) { out.hidden = false; out.className = "denied"; out.textContent = "Enter your name first."; return; }
  out.hidden = false;
  out.className = "flagbox";
  out.textContent = await makeProof(name);
}

document.addEventListener("DOMContentLoaded", () => { renderBoard(); renderChallenge(); });
