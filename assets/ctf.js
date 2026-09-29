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
function loadSolved() {
  try { return JSON.parse(localStorage.getItem(STORE_KEY)) || []; } catch (e) { return []; }
}
function saveSolved(list) {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(list)); } catch (e) { /* storage blocked */ }
}

const esc = s => String(s).replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));

// SHA-256: Web Crypto when available, pure-JS fallback otherwise (e.g. file://).
async function sha256Hex(text) {
  if (window.crypto && crypto.subtle) {
    try {
      const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
      return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
    } catch (e) { /* fall through */ }
  }
  return sha256Fallback(text);
}

function sha256Fallback(ascii) {
  const K = [], H = [];
  let n = 2, found = 0;
  const isPrime = x => { for (let f = 2; f * f <= x; f++) if (x % f === 0) return false; return true; };
  const frac = x => ((x - Math.floor(x)) * 4294967296) | 0;
  while (found < 64) {
    if (isPrime(n)) { if (found < 8) H[found] = frac(Math.pow(n, 1 / 2)); K[found++] = frac(Math.pow(n, 1 / 3)); }
    n++;
  }
  const bytes = Array.from(new TextEncoder().encode(ascii));
  const bitLen = bytes.length * 8;
  bytes.push(0x80);
  while (bytes.length % 64 !== 56) bytes.push(0);
  for (let i = 7; i >= 0; i--) bytes.push(i >= 4 ? 0 : (bitLen >>> (i * 8)) & 0xff);
  const rotr = (x, r) => (x >>> r) | (x << (32 - r));
  for (let off = 0; off < bytes.length; off += 64) {
    const w = new Array(64);
    for (let i = 0; i < 16; i++) w[i] = (bytes[off + i * 4] << 24) | (bytes[off + i * 4 + 1] << 16) | (bytes[off + i * 4 + 2] << 8) | bytes[off + i * 4 + 3];
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
    }
    let [a, b, c, d, e, f, g, h] = H;
    for (let i = 0; i < 64; i++) {
      const t1 = (h + (rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)) + ((e & f) ^ (~e & g)) + K[i] + w[i]) | 0;
      const t2 = ((rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) | 0;
      h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
    }
    [a, b, c, d, e, f, g, h].forEach((v, i) => { H[i] = (H[i] + v) | 0; });
  }
  return H.map(v => (v >>> 0).toString(16).padStart(8, "0")).join("");
}

// ---------- Board (index.html) ----------

let activeCategory = "All";

function renderBoard() {
  const grid = document.getElementById("board");
  if (!grid) return;
  const solved = loadSolved();
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
    const done = solved.includes(c.id);
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
  const earned = CHALLENGES.filter(c => solved.includes(c.id)).reduce((s, c) => s + c.points, 0);
  const nSolved = CHALLENGES.filter(c => solved.includes(c.id)).length;
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
  const done = loadSolved().includes(c.id);

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
    if ((await sha256Hex(guess)) === c.hash) {
      const list = loadSolved();
      if (!list.includes(c.id)) list.push(c.id);
      saveSolved(list);
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
  if (confirm("Wipe your progress?")) { saveSolved([]); renderBoard(); }
}

document.addEventListener("DOMContentLoaded", () => { renderBoard(); renderChallenge(); });
