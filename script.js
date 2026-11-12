const root = document.documentElement;
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---------- Mobile menu ---------- */
const menuButton = document.querySelector(".menu-toggle");
const navLinks = document.querySelector(".nav-links");

function setMenu(open) {
  navLinks.classList.toggle("open", open);
  menuButton.setAttribute("aria-expanded", String(open));
  menuButton.setAttribute("aria-label", open ? "Close navigation" : "Open navigation");
}

menuButton.addEventListener("click", () => setMenu(!navLinks.classList.contains("open")));
navLinks.querySelectorAll("a").forEach((link) => link.addEventListener("click", () => setMenu(false)));
document.addEventListener("keydown", (event) => { if (event.key === "Escape") setMenu(false); });

document.getElementById("year").textContent = new Date().getFullYear();

/* ---------- Header shadow + scroll progress ---------- */
const header = document.querySelector(".site-header");
const progressBar = document.querySelector(".scroll-progress");
let ticking = false;

function updateOnScroll() {
  const maxScroll = root.scrollHeight - window.innerHeight;
  header.classList.toggle("scrolled", window.scrollY > 10);
  progressBar.style.transform = `scaleX(${maxScroll > 0 ? window.scrollY / maxScroll : 0})`;
  ticking = false;
}

window.addEventListener("scroll", () => {
  if (!ticking) { requestAnimationFrame(updateOnScroll); ticking = true; }
}, { passive: true });
window.addEventListener("resize", updateOnScroll);
updateOnScroll();

/* ---------- Highlight the nav link for the section in view ---------- */
if ("IntersectionObserver" in window) {
  const links = new Map();
  navLinks.querySelectorAll('a[href^="#"]').forEach((a) => links.set(a.getAttribute("href").slice(1), a));

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      links.forEach((a) => a.classList.remove("active"));
      links.get(entry.target.id)?.classList.add("active");
    });
  }, { rootMargin: "-45% 0px -50% 0px" });

  document.querySelectorAll("main section[id]").forEach((section) => observer.observe(section));
}

/* ---------- Live code editor ---------- */
// Each line of code, and which part of the preview appears when it's finished.
const CODE_LINES = [
  { src: '<article class="profile">', step: 0 },
  { src: "  <h2>Mbali Malwane</h2>", step: 1 },
  { src: "  <p>Software &amp; web developer</p>", step: 2 },
  { src: '  <ul class="stack">' },
  { src: "    <li>C#</li> <li>.NET</li>", step: 3 },
  { src: "    <li>JavaScript</li> <li>Flutter</li>", step: 4 },
  { src: "  </ul>" },
  { src: '  <a href="#contact">Let\'s talk</a>', step: 5 },
  { src: "</article>" },
];

// Split a line of HTML into coloured tokens: [className, text]
function tokenize(src) {
  const tokens = [];
  const push = (cls, text) => {
    if (!text) return;
    const last = tokens[tokens.length - 1];
    if (last && last[0] === cls) last[1] += text;
    else tokens.push([cls, text]);
  };
  let i = 0;
  while (i < src.length) {
    if (src[i] === "<") {
      const open = src[i + 1] === "/" ? "</" : "<";
      push("tp", open);
      i += open.length;
      const name = /^[\w-]+/.exec(src.slice(i));
      if (name) { push("tn", name[0]); i += name[0].length; }
      while (i < src.length && src[i] !== ">") {
        const ch = src[i];
        if (ch === '"') {
          const end = src.indexOf('"', i + 1);
          push("st", src.slice(i, end + 1));
          i = end + 1;
        } else if (ch === "=") { push("tp", "="); i++; }
        else if (/\s/.test(ch)) { push("tx", ch); i++; }
        else {
          const attr = /^[\w-]+/.exec(src.slice(i));
          const text = attr ? attr[0] : ch;
          push("at", text);
          i += text.length;
        }
      }
      if (src[i] === ">") { push("tp", ">"); i++; }
    } else {
      const next = src.indexOf("<", i);
      const end = next === -1 ? src.length : next;
      push("tx", src.slice(i, end));
      i = end;
    }
  }
  return tokens;
}

const editor = document.getElementById("editor");
const codeEl = document.getElementById("code");
const runButton = document.getElementById("editor-run");
const previewParts = editor.querySelectorAll("[data-step]");
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let runId = 0;

function newLine() {
  const line = document.createElement("span");
  line.className = "code-line";
  codeEl.appendChild(line);
  return line;
}

function showStep(step) {
  previewParts.forEach((part) => {
    if (Number(part.dataset.step) <= step) part.classList.add("is-shown");
  });
}

function renderComplete() {
  codeEl.textContent = "";
  CODE_LINES.forEach(({ src }) => {
    const line = newLine();
    tokenize(src).forEach(([cls, text]) => {
      const span = document.createElement("span");
      span.className = cls;
      span.textContent = text;
      line.appendChild(span);
    });
  });
  previewParts.forEach((part) => part.classList.add("is-shown"));
}

async function typeCode() {
  const id = ++runId;
  const caret = document.createElement("span");
  caret.className = "caret";

  codeEl.textContent = "";
  previewParts.forEach((part) => part.classList.remove("is-shown"));
  editor.classList.add("is-live");
  runButton.hidden = true;

  await sleep(500);

  for (const { src, step } of CODE_LINES) {
    const line = newLine();
    line.appendChild(caret);
    const indent = src.match(/^ */)[0];

    for (const [cls, text] of tokenize(src)) {
      const span = document.createElement("span");
      span.className = cls;
      line.insertBefore(span, caret);
      for (const ch of text) {
        if (id !== runId) return; // a newer run started
        span.textContent += ch;
        // Indentation appears instantly, like an editor's auto-indent
        if (!(cls === "tx" && span.textContent.length <= indent.length && ch === " ")) await sleep(24);
      }
    }
    if (step !== undefined) showStep(step);
    await sleep(140);
  }
  runButton.hidden = false;
}

if (prefersReducedMotion) {
  renderComplete();
} else {
  // Only start typing when the editor is on screen
  const startObserver = new IntersectionObserver((entries, observer) => {
    if (entries.some((entry) => entry.isIntersecting)) {
      observer.disconnect();
      typeCode();
    }
  }, { threshold: 0.3 });
  renderComplete();          // full code visible until typing starts
  startObserver.observe(editor);
}

runButton.addEventListener("click", () => (prefersReducedMotion ? renderComplete() : typeCode()));

/* ---------- Copy email ---------- */
const copyButton = document.getElementById("copy-email");
const copyStatus = document.getElementById("copy-status");
let copyTimer;

copyButton.addEventListener("click", async () => {
  const email = copyButton.dataset.email;
  try {
    await navigator.clipboard.writeText(email);
    copyButton.textContent = "Copied";
    copyStatus.textContent = "Email address copied to your clipboard.";
  } catch {
    copyStatus.textContent = `Couldn't copy automatically. The address is ${email}.`;
  }
  clearTimeout(copyTimer);
  copyTimer = setTimeout(() => {
    copyButton.textContent = "Copy email";
    copyStatus.textContent = "";
  }, 2500);
});
