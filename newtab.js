/* ═══════════════════════════════════════════════
   LUMINA — New Tab Extension
   ═══════════════════════════════════════════════ */

// ─── STATE ───────────────────────────────────────
const DEFAULT_STATE = {
  links: [
    { id: 'ql-claude', url: 'https://claude.ai', label: 'Claude AI', favicon: null, section: 'default' },
    { id: 'ql-gmail', url: 'https://mail.google.com', label: 'Gmail', favicon: null, section: 'default' },
    { id: 'ql-gh', url: 'https://github.com', label: 'GitHub', favicon: null, section: 'default' },
    { id: 'ql-yt', url: 'https://youtube.com', label: 'YouTube', favicon: null, section: 'default' },
  ],
  themes: ['cosmic'],
  intensity: 'medium',
  animateBg: true,
  showClock: true,
  showQuote: true,
  showGrain: true,
  searchEngine: 'claude',
  focusText: '',
  postalCode: '',
  weatherUnit: 'f',
  useGeoLocation: true,
  wallpaperThemes: [],
  bgMode: 'colors',
  focusLines: null,
  greetingName: '',
  greetingCustom: false,
  greetingCustomText: '',
  panelTheme: 'dark',
  bmFolderId: null,
  bmAutoSync: false,
  bmMerge: true,
  notesPanelOpen: true,
  qlIconsOnly: false,
  qlSections: [{ id: 'default', label: 'Quick Links' }],
  qlCollapsed: {},
  notes: null,
  activeNoteId: null,
  addressBook: [],
  savedFaviconBg: 'white',
};

let state = JSON.parse(localStorage.getItem('lumina_state') || 'null') || DEFAULT_STATE;
// Migrate single wallpaperTheme → wallpaperThemes array
if (state.wallpaperTheme !== undefined) {
  state.wallpaperThemes = state.wallpaperTheme ? [state.wallpaperTheme] : [];
  delete state.wallpaperTheme;
}
if (!Array.isArray(state.wallpaperThemes)) state.wallpaperThemes = [];

if (!Array.isArray(state.notes)) state.notes = [];
if (!state.activeNoteId || !state.notes.find(n => n.id === state.activeNoteId)) {
  state.activeNoteId = state.notes[0]?.id || 'note-1';
}
if (!Array.isArray(state.addressBook)) state.addressBook = [];
let editingId = null;
let animFrameId = null;
let bgTime = Math.random() * 10000;
let archiveDebounceTimer = null;

function saveState(opts) {
  localStorage.setItem('lumina_state', JSON.stringify(state));
  if (Array.isArray(state.addressBook) && typeof chrome !== 'undefined' && chrome.storage?.local) {
    chrome.storage.local.set({ lumina_address_book: state.addressBook }).catch(() => {});
  }
  // Debounced settings archive — snapshot every 30s at most
  if (!opts?.skipSchedule) {
    clearTimeout(archiveDebounceTimer);
    archiveDebounceTimer = setTimeout(() => {
      if (typeof archiveCurrentSettings === 'function') archiveCurrentSettings();
    }, 30000);
  }
  if (opts?.skipSchedule) return;
  schedulePush();
}

// ─── BACKGROUND THEMES ───────────────────────────
const THEMES = {
  cosmic: {
    name: 'Cosmic',
    desc: 'Deep space nebulae',
    colors: [
      [15, 10, 40], [45, 20, 80], [80, 30, 120], [20, 5, 60],
      [10, 40, 90], [50, 10, 100], [5, 5, 30]
    ],
    preview: 'linear-gradient(135deg,#0f0a28,#2d1450,#0a2850)'
  },
  aurora: {
    name: 'Aurora',
    desc: 'Northern lights',
    colors: [
      [5, 30, 25], [10, 80, 60], [20, 60, 90], [5, 40, 50],
      [15, 90, 70], [8, 50, 40], [3, 20, 35]
    ],
    preview: 'linear-gradient(135deg,#051e19,#0a503c,#14325a)'
  },
  sunset: {
    name: 'Sunset',
    desc: 'Golden hour glow',
    colors: [
      [80, 20, 10], [140, 60, 10], [180, 80, 30], [100, 30, 5],
      [160, 40, 20], [200, 100, 40], [60, 15, 8]
    ],
    preview: 'linear-gradient(135deg,#501408,#8c3c0a,#b4501e)'
  },
  ocean: {
    name: 'Ocean',
    desc: 'Abyssal depths',
    colors: [
      [5, 20, 60], [10, 40, 90], [5, 60, 80], [8, 30, 70],
      [3, 15, 50], [15, 50, 100], [2, 10, 40]
    ],
    preview: 'linear-gradient(135deg,#05143c,#0a285a,#053c50)'
  },
  forest: {
    name: 'Forest',
    desc: 'Midnight canopy',
    colors: [
      [10, 30, 10], [20, 50, 15], [5, 40, 20], [15, 60, 10],
      [8, 25, 15], [25, 45, 12], [6, 20, 8]
    ],
    preview: 'linear-gradient(135deg,#0a1e0a,#143214,#05280a)'
  },
  ember: {
    name: 'Ember',
    desc: 'Smoldering heat',
    colors: [
      [60, 10, 5], [100, 25, 8], [80, 15, 10], [120, 40, 5],
      [50, 8, 3], [140, 50, 10], [40, 5, 2]
    ],
    preview: 'linear-gradient(135deg,#3c0a05,#641908,#500f0a)'
  },
  minimal: {
    name: 'Minimal',
    desc: 'Clean monochrome',
    colors: [
      [12, 12, 14], [20, 20, 22], [8, 8, 10], [16, 16, 18],
      [25, 25, 28], [10, 10, 12], [6, 6, 8]
    ],
    preview: 'linear-gradient(135deg,#0c0c0e,#141416,#08080a)'
  },
  candy: {
    name: 'Candy',
    desc: 'Sweet pastels',
    colors: [
      [60, 10, 50], [100, 20, 80], [80, 30, 90], [120, 40, 60],
      [50, 15, 70], [140, 50, 90], [40, 8, 45]
    ],
    preview: 'linear-gradient(135deg,#3c0a32,#641450,#50205a)'
  },
};

// ─── BACKGROUND RENDERER ─────────────────────────
const canvas = document.getElementById('bg-canvas');
const ctx = canvas.getContext('2d');
let blobs = [];

// Returns the single color theme active for this page load (consistent within load, advances next load)
function getActiveColorTheme() {
  const themes = (state.themes && state.themes.length) ? state.themes : ['cosmic'];
  if (themes.length === 1) return themes[0];
  const cached = sessionStorage.getItem('lumina_color_theme');
  if (cached && themes.includes(cached)) return cached;
  const idx = nextLoadIdx('lumina_color_idx', themes.length);
  const theme = themes[idx];
  sessionStorage.setItem('lumina_color_theme', theme);
  return theme;
}

function randomBlob(w, h, colors) {
  const c = colors[Math.floor(Math.random() * colors.length)];
  return {
    x: Math.random() * w, y: Math.random() * h,
    r: (Math.random() * 0.45 + 0.2) * Math.max(w, h),
    vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.3,
    color: c,
    ox: Math.random() * Math.PI * 2, oy: Math.random() * Math.PI * 2,
    speed: 0.0003 + Math.random() * 0.0004,
    amp: 80 + Math.random() * 120,
  };
}

function buildBlobs() {
  const W = canvas.width, H = canvas.height;
  const activeTheme = getActiveColorTheme();
  const colors = THEMES[activeTheme]?.colors || THEMES.cosmic.colors;
  blobs = Array.from({ length: 7 }, () => randomBlob(W, H, colors));
}

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  buildBlobs();
}

function renderBg(ts) {
  const W = canvas.width, H = canvas.height;
  const intensity = state.intensity === 'subtle' ? 0.55 : state.intensity === 'vivid' ? 0.85 : 0.70;

  // background fill
  const activeTheme = getActiveColorTheme();
  const baseColors = THEMES[activeTheme]?.colors || THEMES.cosmic.colors;
  const bc = baseColors[0];
  ctx.fillStyle = `rgb(${bc[0]},${bc[1]},${bc[2]})`;
  ctx.fillRect(0, 0, W, H);

  if (state.animateBg) bgTime = ts * 0.001;

  blobs.forEach((b, i) => {
    const px = b.x + Math.sin(bgTime * b.speed * 1000 + b.ox) * b.amp;
    const py = b.y + Math.cos(bgTime * b.speed * 800 + b.oy) * b.amp;

    const grad = ctx.createRadialGradient(px, py, 0, px, py, b.r);
    const [r, g, bl] = b.color;
    grad.addColorStop(0, `rgba(${r},${g},${bl},${intensity * 0.8})`);
    grad.addColorStop(0.5, `rgba(${r},${g},${bl},${intensity * 0.3})`);
    grad.addColorStop(1, 'rgba(0,0,0,0)');

    ctx.fillStyle = grad;
    ctx.globalCompositeOperation = i === 0 ? 'source-over' : 'screen';
    ctx.fillRect(0, 0, W, H);
  });

  ctx.globalCompositeOperation = 'source-over';

  // dark vignette
  const vign = ctx.createRadialGradient(W/2,H/2,0,W/2,H/2,Math.max(W,H)*0.75);
  vign.addColorStop(0, 'rgba(0,0,0,0)');
  vign.addColorStop(1, 'rgba(0,0,0,0.65)');
  ctx.fillStyle = vign;
  ctx.fillRect(0, 0, W, H);

  if (state.animateBg) animFrameId = requestAnimationFrame(renderBg);
}

function startBg() {
  if (animFrameId) cancelAnimationFrame(animFrameId);
  if (state.animateBg) {
    animFrameId = requestAnimationFrame(renderBg);
  } else {
    renderBg(bgTime * 1000);
  }
}

// ─── CLOCK ───────────────────────────────────────
function updateClock() {
  const now = new Date();
  const h = now.getHours(), m = now.getMinutes();
  const hr = h % 12 || 12;
  const ampm = h < 12 ? 'AM' : 'PM';
  document.getElementById('clock').textContent = `${hr}:${String(m).padStart(2,'0')} ${ampm}`;

  const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  document.getElementById('date').textContent = `${days[now.getDay()]}, ${months[now.getMonth()]} ${now.getDate()}`;

  let greetText;
  if (state.greetingCustom) {
    greetText = state.greetingCustomText ?? '';
  } else {
    const base = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
    const name = state.greetingName?.trim();
    greetText = name ? `${base}, ${name}` : base;
  }
  document.getElementById('greeting').textContent = greetText;
}

// ─── SEARCH ──────────────────────────────────────
const SEARCH_URLS = {
  claude: 'https://claude.ai/new?q=',
  gemini: 'https://gemini.google.com/app?q=',
  chatgpt: 'https://chatgpt.com/?q=',
  perplexity: 'https://www.perplexity.ai/search?q=',
  google: 'https://google.com/search?q=',
  googleai: 'https://www.google.com/search?udm=50&q=',
  bing: 'https://bing.com/search?q=',
  duckduckgo: 'https://duckduckgo.com/?q=',
  github: 'https://github.com/search?q=',
  stackoverflow: 'https://stackoverflow.com/search?q=',
};

document.getElementById('search-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') doSearch();
});
document.getElementById('search-btn').addEventListener('click', doSearch);

function doSearch() {
  const input = document.getElementById('search-input');
  const q = input.value.trim();
  if (!q) return;
  const base = SEARCH_URLS[state.searchEngine] || SEARCH_URLS.claude;
  window.open(base + encodeURIComponent(q), '_blank');
  input.value = '';
}

// Auto-focus search on load
window.addEventListener('load', () => {
  setTimeout(() => document.getElementById('search-input').focus(), 300);
});

// ─── FAVICON HELPER ──────────────────────────────
// Primary: Google service — knows most sites' favicons and serves them at proper resolution.
// Problem: returns HTTP 200 with a 16×16 generic globe for unknown domains, so onerror
// never fires. We detect this in onload by checking naturalWidth <= 16.
// Fallback: site's own /favicon.ico — proper 404 on miss so onerror fires the letter fallback.
function getFaviconUrl(url) {
  try {
    const { hostname } = new URL(url);
    return `https://www.google.com/s2/favicons?sz=64&domain=${hostname}`;
  } catch { return null; }
}


// Detect generic/low-detail favicons by drawing to canvas and checking color variance.
// Returns true if the image is mostly a single flat color (default/placeholder icon).
// Uses a re-fetch with a blob to avoid CORS tainting the canvas.
function checkGenericFavicon(img) {
  const fallback = img.nextElementSibling;
  if (!fallback) return;
  const src = img.src;
  fetch(src).then(r => r.blob()).then(blob => {
    const blobUrl = URL.createObjectURL(blob);
    const test = new Image();
    test.onload = () => {
      try {
        const size = 32;
        const canvas = document.createElement('canvas');
        canvas.width = size; canvas.height = size;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(test, 0, 0, size, size);
        const { data } = ctx.getImageData(0, 0, size, size);
        const total = data.length / 4;
        let rSum = 0, gSum = 0, bSum = 0, opaque = 0;
        for (let i = 0; i < data.length; i += 4) {
          if (data[i + 3] < 30) continue;
          opaque++;
          rSum += data[i]; gSum += data[i + 1]; bSum += data[i + 2];
        }
        const isGeneric = opaque < total * 0.1 || (() => {
          const rAvg = rSum / opaque, gAvg = gSum / opaque, bAvg = bSum / opaque;
          let variance = 0;
          for (let i = 0; i < data.length; i += 4) {
            if (data[i + 3] < 30) continue;
            variance += (data[i] - rAvg) ** 2 + (data[i + 1] - gAvg) ** 2 + (data[i + 2] - bAvg) ** 2;
          }
          return (variance / (opaque * 3)) < 200;
        })();
        if (isGeneric) {
          img.style.display = 'none';
          fallback.style.display = 'flex';
        }
      } catch {}
      URL.revokeObjectURL(blobUrl);
    };
    test.onerror = () => URL.revokeObjectURL(blobUrl);
    test.src = blobUrl;
  }).catch(() => {});
}

// Build favicon <img> HTML:
//   Google service → if 16px generic globe, low-detail, or network error → letter
function faviconImgHtml(url, label, cssClass, bgOverride) {
  const googleUrl = getFaviconUrl(url);
  const letter = (label || '?')[0].toUpperCase();
  const fallbackDiv = `<div class="${cssClass} fallback" style="display:none">${letter}</div>`;
  if (!googleUrl) return `<div class="${cssClass} fallback">${letter}</div>`;
  const bgStyle = bgOverride ? ` style="background:${bgOverride}"` : '';
  const onload = `if(this.naturalWidth<=16&&this.naturalHeight<=16){this.style.display='none';this.nextElementSibling.style.display='flex'}else{checkGenericFavicon(this)}`;
  const onerror = `this.style.display='none';this.nextElementSibling.style.display='flex'`;
  return `<img class="${cssClass}" src="${googleUrl}" alt=""${bgStyle} onload="${onload}" onerror="${onerror}" />${fallbackDiv}`;
}

// ─── HEROICONS ───────────────────────────────────
const HEROICONS = {
  'home':                   `<path stroke-linecap="round" stroke-linejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />`,
  'globe-alt':              `<path stroke-linecap="round" stroke-linejoin="round" d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 0 1 3 12c0-1.605.42-3.113 1.157-4.418" />`,
  'magnifying-glass':       `<path stroke-linecap="round" stroke-linejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />`,
  'arrow-top-right':        `<path stroke-linecap="round" stroke-linejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />`,
  'bookmark':               `<path stroke-linecap="round" stroke-linejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z" />`,
  'star':                   `<path stroke-linecap="round" stroke-linejoin="round" d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />`,
  'heart':                  `<path stroke-linecap="round" stroke-linejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />`,
  'bell':                   `<path stroke-linecap="round" stroke-linejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />`,
  'cog-6-tooth':            `<path stroke-linecap="round" stroke-linejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" /><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />`,
  'envelope':               `<path stroke-linecap="round" stroke-linejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />`,
  'chat-bubble-left':       `<path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12.76c0 1.6 1.123 2.994 2.707 3.227 1.068.157 2.148.279 3.238.364.466.037.893.281 1.153.671L12 21l2.652-3.978c.26-.39.687-.634 1.153-.67 1.09-.086 2.17-.208 3.238-.365 1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />`,
  'at-symbol':              `<path stroke-linecap="round" stroke-linejoin="round" d="M16.5 12a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Zm0 0c0 1.657 1.007 3 2.25 3S21 13.657 21 12a9 9 0 1 0-2.636 6.364M16.5 12V8.25" />`,
  'phone':                  `<path stroke-linecap="round" stroke-linejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" />`,
  'video-camera':           `<path stroke-linecap="round" stroke-linejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />`,
  'play':                   `<path stroke-linecap="round" stroke-linejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" />`,
  'document-text':          `<path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />`,
  'folder':                 `<path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" />`,
  'photo':                  `<path stroke-linecap="round" stroke-linejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />`,
  'musical-note':           `<path stroke-linecap="round" stroke-linejoin="round" d="m9 9 10.5-3m0 6.553v3.75a2.25 2.25 0 0 1-1.632 2.163l-1.32.377a1.803 1.803 0 1 1-.99-3.467l2.31-.66a2.25 2.25 0 0 0 1.632-2.163Zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 0 1-1.632 2.163l-1.32.377a1.803 1.803 0 0 1-.99-3.467l2.31-.66A2.25 2.25 0 0 0 9 15.553Z" />`,
  'microphone':             `<path stroke-linecap="round" stroke-linejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />`,
  'book-open':              `<path stroke-linecap="round" stroke-linejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />`,
  'newspaper':              `<path stroke-linecap="round" stroke-linejoin="round" d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 0 1-2.25 2.25M16.5 7.5V18a2.25 2.25 0 0 0 2.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 0 0 2.25 2.25h13.5M6 7.5h3v3H6v-3Z" />`,
  'pencil':                 `<path stroke-linecap="round" stroke-linejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />`,
  'paint-brush':            `<path stroke-linecap="round" stroke-linejoin="round" d="M9.53 16.122a3 3 0 0 0-5.78 1.128 2.25 2.25 0 0 1-2.4 2.245 4.5 4.5 0 0 0 8.4-2.245c0-.399-.078-.78-.22-1.128Zm0 0a15.998 15.998 0 0 0 3.388-1.62m-5.043-.025a15.994 15.994 0 0 1 1.622-3.395m3.42 3.42a15.995 15.995 0 0 0 4.764-4.648l3.876-5.814a1.151 1.151 0 0 0-1.597-1.597L14.146 6.32a15.996 15.996 0 0 0-4.649 4.763m3.42 3.42a6.776 6.776 0 0 0-3.42-3.42" />`,
  'code-bracket':           `<path stroke-linecap="round" stroke-linejoin="round" d="M17.25 6.75 22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3-4.5 16.5" />`,
  'command-line':           `<path stroke-linecap="round" stroke-linejoin="round" d="m6.75 7.5 3 2.25-3 2.25m4.5 0h3m-9 8.25h13.5A2.25 2.25 0 0 0 21 18V6a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 6v12a2.25 2.25 0 0 0 2.25 2.25Z" />`,
  'server':                 `<path stroke-linecap="round" stroke-linejoin="round" d="M21.75 17.25v.75a3 3 0 0 1-3 3h-15a3 3 0 0 1-3-3v-.75m19.5 0a3 3 0 0 0 3-3v-1.5a3 3 0 0 0-3-3m0 7.5h-19.5m19.5-7.5h-19.5m19.5 0a3 3 0 0 0 3-3v-1.5a3 3 0 0 0-3-3m-19.5 7.5a3 3 0 0 1-3-3v-1.5a3 3 0 0 1 3-3m0 7.5h19.5m-19.5-7.5h19.5" />`,
  'cpu-chip':               `<path stroke-linecap="round" stroke-linejoin="round" d="M8.25 3v1.5M4.5 8.25H3m18 0h-1.5M4.5 12H3m18 0h-1.5m-15 3.75H3m18 0h-1.5M8.25 19.5V21M12 3v1.5m0 15V21m3.75-18v1.5m0 15V21m-9-1.5h10.5a2.25 2.25 0 0 0 2.25-2.25V6.75a2.25 2.25 0 0 0-2.25-2.25H6.75A2.25 2.25 0 0 0 4.5 6.75v10.5a2.25 2.25 0 0 0 2.25 2.25Zm.75-12h9v9h-9v-9Z" />`,
  'circle-stack':           `<path stroke-linecap="round" stroke-linejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />`,
  'wrench-screwdriver':     `<path stroke-linecap="round" stroke-linejoin="round" d="M11.42 15.17 17.25 21A2.652 2.652 0 0 0 21 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 1 1-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 0 0 4.486-6.336l-3.276 3.277a3.004 3.004 0 0 1-2.25-2.25l3.276-3.276a4.5 4.5 0 0 0-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437 1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008Z" />`,
  'credit-card':            `<path stroke-linecap="round" stroke-linejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 3.75 19.5Z" />`,
  'currency-dollar':        `<path stroke-linecap="round" stroke-linejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />`,
  'shopping-cart':          `<path stroke-linecap="round" stroke-linejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />`,
  'banknotes':              `<path stroke-linecap="round" stroke-linejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" />`,
  'user':                   `<path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />`,
  'user-group':             `<path stroke-linecap="round" stroke-linejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />`,
  'chart-bar':              `<path stroke-linecap="round" stroke-linejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />`,
  'presentation-chart-line':`<path stroke-linecap="round" stroke-linejoin="round" d="M3.75 3v11.25A2.25 2.25 0 0 0 6 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0 1 18 16.5h-2.25m-7.5 0h7.5m-7.5 0-1 3m8.5-3 1 3m0 0 .5 1.5m-.5-1.5h-9.5m0 0-.5 1.5m.75-9 3-3 2.148 2.148A12.061 12.061 0 0 1 16.5 7.605" />`,
  'calendar':               `<path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />`,
  'clock':                  `<path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />`,
  'fire':                   `<path stroke-linecap="round" stroke-linejoin="round" d="M15.362 5.214A8.252 8.252 0 0 1 12 21 8.25 8.25 0 0 1 6.038 7.047 8.287 8.287 0 0 0 9 9.601a8.983 8.983 0 0 1 3.361-6.867 8.21 8.21 0 0 0 3 2.48Z" /><path stroke-linecap="round" stroke-linejoin="round" d="M12 18a3.75 3.75 0 0 0 .495-7.468 5.99 5.99 0 0 0-1.925 3.547 5.975 5.975 0 0 1-2.133-1.001A3.75 3.75 0 0 0 12 18Z" />`,
  'bolt':                   `<path stroke-linecap="round" stroke-linejoin="round" d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" />`,
  'academic-cap':           `<path stroke-linecap="round" stroke-linejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 3.741-3.342M6.75 15a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0 0v-3.675A55.378 55.378 0 0 1 12 8.443m-7.007 11.55A5.981 5.981 0 0 0 6.75 15.75v-1.5" />`,
  'map-pin':                `<path stroke-linecap="round" stroke-linejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />`,
  'building-office':        `<path stroke-linecap="round" stroke-linejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />`,
  'building-storefront':    `<path stroke-linecap="round" stroke-linejoin="round" d="M13.5 21v-7.5a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 .75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349M3.75 21V9.349m0 0a3.001 3.001 0 0 0 3.75-.615A2.993 2.993 0 0 0 9.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 0 0 2.25 1.016c.896 0 1.7-.393 2.25-1.015a3.001 3.001 0 0 0 3.75.614m-16.5 0a3.004 3.004 0 0 1-.621-4.72l1.189-1.19A1.5 1.5 0 0 1 5.378 3h13.243a1.5 1.5 0 0 1 1.06.44l1.19 1.189a3 3 0 0 1-.621 4.72M6.75 18h3.75a.75.75 0 0 0 .75-.75V13.5a.75.75 0 0 0-.75-.75H6.75a.75.75 0 0 0-.75.75v3.75c0 .414.336.75.75.75Z" />`,
  'rocket-launch':          `<path stroke-linecap="round" stroke-linejoin="round" d="M15.59 14.37a6 6 0 0 1-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 0 0 6.16-12.12A14.98 14.98 0 0 0 9.631 8.41m5.96 5.96a14.926 14.926 0 0 1-5.841 2.58m-.119-8.54a6 6 0 0 0-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 0 0-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 0 1-2.448-2.448 14.9 14.9 0 0 1 .06-.312m-2.24 2.39a4.493 4.493 0 0 0-1.757 4.306 4.493 4.493 0 0 0 4.306-1.758M16.5 9a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z" />`,
  'shield-check':           `<path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />`,
  'lock-closed':            `<path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />`,
  'key':                    `<path stroke-linecap="round" stroke-linejoin="round" d="M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 0 1 21.75 8.25Z" />`,
  'link':                   `<path stroke-linecap="round" stroke-linejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />`,
  'rss':                    `<path stroke-linecap="round" stroke-linejoin="round" d="M12.75 19.5v-.75a7.5 7.5 0 0 0-7.5-7.5H4.5m0-6.75h.75c7.87 0 14.25 6.38 14.25 14.25v.75M6 18.75a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />`,
  'wifi':                   `<path stroke-linecap="round" stroke-linejoin="round" d="M8.288 15.038a5.25 5.25 0 0 1 7.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0M1.924 8.674c5.565-5.565 14.587-5.565 20.152 0M12.53 18.22l-.53.53-.53-.53a.75.75 0 0 1 1.06 0Z" />`,
  'moon':                   `<path stroke-linecap="round" stroke-linejoin="round" d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z" />`,
  'sun':                    `<path stroke-linecap="round" stroke-linejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" />`,
};

function heroiconSvg(name, size = 20) {
  const inner = HEROICONS[name];
  if (!inner) return '';
  return `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" width="${size}" height="${size}">${inner}</svg>`;
}

let _modalIconName = null;
let _modalFaviconBg = 'white';

function setModalFaviconBg(val) {
  _modalFaviconBg = val || 'white';
  document.querySelectorAll('.modal-fav-bg-btn').forEach(b => {
    b.style.outline = b.dataset.bg === _modalFaviconBg ? '2px solid var(--accent)' : 'none';
    b.style.outlineOffset = '2px';
  });
}

document.querySelectorAll('.modal-fav-bg-btn').forEach(b => {
  b.addEventListener('click', () => setModalFaviconBg(b.dataset.bg));
});

function setModalIcon(name) {
  _modalIconName = name;
  const preview = document.getElementById('modal-icon-preview');
  preview.innerHTML = name ? heroiconSvg(name, 18) : '';
  // update selected state in picker
  document.querySelectorAll('.hero-icon-opt').forEach(el => {
    el.classList.toggle('selected', el.dataset.icon === name);
  });
}

function buildIconPicker() {
  const picker = document.getElementById('modal-icon-picker');
  picker.innerHTML = Object.keys(HEROICONS).map(name =>
    `<div class="hero-icon-opt${_modalIconName === name ? ' selected' : ''}" data-icon="${name}" title="${name}">${heroiconSvg(name, 16)}</div>`
  ).join('');
  picker.querySelectorAll('.hero-icon-opt').forEach(el => {
    el.addEventListener('click', () => {
      setModalIcon(el.dataset.icon);
      document.getElementById('modal-icon-picker').style.display = 'none';
    });
  });
}

document.getElementById('modal-icon-pick-btn').addEventListener('click', () => {
  const picker = document.getElementById('modal-icon-picker');
  if (picker.style.display === 'none') {
    buildIconPicker();
    picker.style.display = 'grid';
  } else {
    picker.style.display = 'none';
  }
});

document.getElementById('modal-icon-clear-btn').addEventListener('click', () => {
  setModalIcon(null);
  document.getElementById('modal-icon-picker').style.display = 'none';
});

function getUrlLabel(url) {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, '');
  } catch { return url; }
}

// ─── QUICKLINKS ──────────────────────────────────
function renderLinks() {
  const grid = document.getElementById('ql-grid');
  const empty = document.getElementById('ql-empty');

  Array.from(grid.querySelectorAll('.ql-item, .ql-section-header, .ql-section-items')).forEach(el => el.remove());

  const sections = state.qlSections?.length ? state.qlSections : [{ id: 'default', label: 'Quick Links' }];
  const iconMode = !!state.qlIconsOnly;
  const showHeaders = sections.length > 1;

  grid.classList.toggle('icons-only', iconMode);
  document.getElementById('ql-icon-toggle').classList.toggle('on', iconMode);

  if (!state.links.length) {
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';

  // Ensure all links have a valid section
  const firstSectionId = sections[0].id;
  state.links.forEach(l => {
    if (!l.section || !sections.find(s => s.id === l.section)) l.section = firstSectionId;
  });

  let animIdx = 0;
  sections.forEach(section => {
    const sectionLinks = state.links.filter(l => l.section === section.id);
    const isCollapsed = !!(state.qlCollapsed?.[section.id]);
    if (showHeaders) {
      const header = document.createElement('div');
      header.className = 'ql-section-header';
      header.dataset.sectionId = section.id;
      header.innerHTML = `
        <button class="ql-section-caret${isCollapsed ? '' : ' expanded'}" title="Toggle section">▶</button>
        <input class="ql-section-label" value="${escHtml(section.label)}" spellcheck="false" />
        <div class="ql-section-sep"></div>
        <button class="ql-section-btn ql-section-del-btn" title="Delete section" ${sectionLinks.length ? 'disabled style="opacity:0.25;cursor:default"' : ''}>✕</button>
      `;
      const labelInput = header.querySelector('.ql-section-label');
      labelInput.addEventListener('blur', () => {
        const s = state.qlSections.find(s => s.id === section.id);
        if (s) {
          s.label = labelInput.value.trim() || section.label;
          saveState();
          if (s.fromBookmark && s.id.startsWith('bms-') && chrome?.bookmarks) {
            chrome.bookmarks.update(s.id.slice(4), { title: s.label }).catch(() => {});
          }
        }
      });
      labelInput.addEventListener('keydown', e => { if (e.key === 'Enter') labelInput.blur(); });
      header.querySelector('.ql-section-caret').addEventListener('click', () => {
        if (!state.qlCollapsed) state.qlCollapsed = {};
        state.qlCollapsed[section.id] = !state.qlCollapsed[section.id];
        saveState(); renderLinks();
      });
      header.querySelector('.ql-section-del-btn').addEventListener('click', () => {
        const hasLinks = state.links.some(l => l.section === section.id);
        if (hasLinks) { showToast('Move or delete all links in this section first'); return; }
        state.qlSections = state.qlSections.filter(s => s.id !== section.id);
        saveState(); renderLinks();
      });
      grid.appendChild(header);
    }

    if (isCollapsed) return;

    const itemRow = document.createElement('div');
    itemRow.className = 'ql-section-items';
    grid.appendChild(itemRow);

    sectionLinks.forEach(link => {
      const item = document.createElement('a');
      item.className = 'ql-item' + (iconMode ? ' icon-only' : '');
      item.href = link.url;
      item.dataset.id = link.id;
      item.style.animationDelay = `${animIdx++ * 0.04}s`;

      const _favBg = link.faviconBg === 'dark' ? 'rgba(20,15,40,0.75)' : link.faviconBg === 'transparent' ? 'transparent' : null;
      const _favBgStyle = _favBg ? ` style="background:${_favBg}"` : '';
      const _letter = (link.label || '?')[0].toUpperCase();
      const faviconHtml = link.icon && HEROICONS[link.icon]
        ? `<div class="ql-favicon hero-icon"${_favBgStyle}>${heroiconSvg(link.icon, 28)}</div>`
        : link.noFavicon
          ? `<div class="ql-favicon fallback">${_letter}</div>`
          : (link.favicon
              ? `<img class="ql-favicon" src="${link.favicon}" alt=""${_favBgStyle} onerror="this.style.display='none';this.nextElementSibling.style.display='flex'" /><div class="ql-favicon fallback" style="display:none">${_letter}</div>`
              : faviconImgHtml(link.url, link.label, 'ql-favicon', _favBg));

      if (iconMode) {
        const label = escHtml(link.label || getUrlLabel(link.url));
        item.innerHTML = faviconHtml + `<div class="ql-icon-label">${label}</div>`;
        item.addEventListener('mouseenter', () => showFloatMenu(item, link));
        item.addEventListener('mouseleave', scheduleHideFloatMenu);
        setupDrag(item);
      } else {
        item.innerHTML = `
          <span class="ql-drag-handle">⠿</span>
          ${faviconHtml}
          <div class="ql-info">
            <div class="ql-label">${escHtml(link.label || getUrlLabel(link.url))}</div>
          </div>
          <div class="ql-actions">
            <button class="ql-action-btn newtab-btn" title="Open in new tab">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
            </button>
            <button class="ql-action-btn copy-btn" title="Copy URL">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            </button>
            <button class="ql-action-btn edit-btn" title="Edit">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
            <button class="ql-action-btn delete delete-btn" title="Delete">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
            </button>
          </div>
        `;
        item.querySelector('.newtab-btn').addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); window.open(link.url, '_blank'); });
        item.querySelector('.copy-btn').addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); navigator.clipboard.writeText(link.url).then(() => showCopyToast()); });
        item.querySelector('.edit-btn').addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); openEditModal(link.id); });
        item.querySelector('.delete-btn').addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); deleteLink(link.id); });
        setupDrag(item);
      }

      itemRow.appendChild(item);
    });
  });
}

// ─── ICON MODE FLOAT MENU ───────────────────────
let floatHideTimer = null;
let floatCurrentLink = null;

function showFloatMenu(item, link) {
  clearTimeout(floatHideTimer);
  floatCurrentLink = link;
  const menu = document.getElementById('ql-float-menu');
  const actionsEl = document.getElementById('ql-float-menu-actions');
  document.getElementById('ql-float-menu-label').textContent = link.label || getUrlLabel(link.url);

  actionsEl.innerHTML = `
    <button class="ql-action-btn newtab-btn" title="Open in new tab" style="background:rgba(0,0,0,0.25)">
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
    </button>
    <button class="ql-action-btn copy-btn" title="Copy URL" style="background:rgba(0,0,0,0.25)">
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
    </button>
    <button class="ql-action-btn edit-btn" title="Edit" style="background:rgba(0,0,0,0.25)">
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
    </button>
    <button class="ql-action-btn delete delete-btn" title="Delete" style="background:rgba(0,0,0,0.25)">
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
    </button>
  `;
  actionsEl.querySelector('.newtab-btn').onclick = e => { e.preventDefault(); window.open(link.url, '_blank'); hideFloatMenu(); };
  actionsEl.querySelector('.copy-btn').onclick = e => { e.preventDefault(); navigator.clipboard.writeText(link.url).then(() => showCopyToast()); hideFloatMenu(); };
  actionsEl.querySelector('.edit-btn').onclick = e => { e.preventDefault(); openEditModal(link.id); hideFloatMenu(); };
  actionsEl.querySelector('.delete-btn').onclick = e => { e.preventDefault(); deleteLink(link.id); hideFloatMenu(); };

  menu.classList.add('visible');
  positionFloatMenu(item, menu);

  menu.onmouseenter = () => clearTimeout(floatHideTimer);
  menu.onmouseleave = scheduleHideFloatMenu;
}

function positionFloatMenu(item, menu) {
  const r = item.getBoundingClientRect();
  const mw = menu.offsetWidth || 170;
  const mh = menu.offsetHeight || 80;
  let top = r.top - mh - 8;
  let left = r.left + (r.width - mw) / 2;
  if (top < 8) top = r.bottom + 8;
  if (left < 8) left = 8;
  if (left + mw > window.innerWidth - 8) left = window.innerWidth - mw - 8;
  menu.style.top = top + 'px';
  menu.style.left = left + 'px';
}

function scheduleHideFloatMenu() {
  floatHideTimer = setTimeout(hideFloatMenu, 150);
}

function hideFloatMenu() {
  document.getElementById('ql-float-menu')?.classList.remove('visible');
  floatCurrentLink = null;
}

function showCopyToast() {
  let toast = document.getElementById('copy-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'copy-toast';
    toast.textContent = 'Copied!';
    toast.style.cssText = 'position:fixed;bottom:28px;left:50%;transform:translateX(-50%);background:rgba(255,255,255,0.15);backdrop-filter:blur(12px);color:#fff;padding:8px 18px;border-radius:20px;font-size:13px;pointer-events:none;opacity:0;transition:opacity 0.2s;z-index:9999;border:1px solid rgba(255,255,255,0.15)';
    document.body.appendChild(toast);
  }
  clearTimeout(toast._t);
  toast.style.opacity = '1';
  toast._t = setTimeout(() => { toast.style.opacity = '0'; }, 1400);
}

function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function deleteLink(id) {
  const link = state.links.find(l => l.id === id);
  const chromeId = link?.bmId || (link?.fromBookmark && link?.id?.startsWith('bm-') ? link.id.slice(3) : null);
  if (chromeId && chrome?.bookmarks) chrome.bookmarks.remove(chromeId).catch(() => {});
  state.links = state.links.filter(l => l.id !== id);
  saveState(); renderLinks();
}

// ─── DRAG REORDER ────────────────────────────────
let dragSrc = null;

function setupDrag(el) {
  el.draggable = true;
  el.addEventListener('dragstart', e => {
    dragSrc = el;
    el.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', el.dataset.id);
  });
  el.addEventListener('dragend', () => {
    el.classList.remove('dragging');
    document.querySelectorAll('.drag-over').forEach(x => x.classList.remove('drag-over'));
  });
  el.addEventListener('dragover', e => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (el !== dragSrc) el.classList.add('drag-over');
  });
  el.addEventListener('dragleave', () => el.classList.remove('drag-over'));
  el.addEventListener('drop', e => {
    e.preventDefault();
    el.classList.remove('drag-over');
    if (!dragSrc || dragSrc === el) return;
    const fromId = dragSrc.dataset.id;
    const toId = el.dataset.id;
    const fromIdx = state.links.findIndex(l => l.id === fromId);
    const toIdx = state.links.findIndex(l => l.id === toId);
    if (fromIdx < 0 || toIdx < 0) return;
    const moved = state.links[fromIdx];
    const targetSection = state.links[toIdx].section;
    moved.section = targetSection;
    state.links.splice(fromIdx, 1);
    state.links.splice(toIdx, 0, moved);
    saveState(); renderLinks();

    // Sync reorder/move to Chrome bookmarks
    if (chrome?.bookmarks) {
      const bmId = moved.bmId || (moved.fromBookmark && moved.id.startsWith('bm-') ? moved.id.slice(3) : null);
      if (bmId) {
        const targetFolderId = targetSection?.startsWith('bms-') ? targetSection.slice(4) : null;
        if (targetFolderId) {
          const sectionLinks = state.links.filter(l => l.section === targetSection);
          const newIndex = sectionLinks.findIndex(l => l.id === moved.id);
          chrome.bookmarks.move(bmId, { parentId: targetFolderId, index: newIndex }).catch(() => {});
        }
      }
    }
  });
}

// ─── ICON MODE TOGGLE ────────────────────────────
document.getElementById('ql-icon-toggle').addEventListener('click', () => {
  state.qlIconsOnly = !state.qlIconsOnly;
  saveState(); renderLinks();
});

// ─── SECTION MANAGEMENT ──────────────────────────
document.getElementById('ql-add-section-btn').addEventListener('click', () => {
  if (!state.qlSections) state.qlSections = [{ id: 'default', label: 'Quick Links' }];
  const id = 'ql-s-' + Date.now();
  state.qlSections.push({ id, label: 'New Section' });
  saveState(); renderLinks();
  // Focus the new section label for immediate rename
  setTimeout(() => {
    const el = document.querySelector(`.ql-section-header[data-section-id="${id}"] .ql-section-label`);
    if (el) { el.focus(); el.select(); }
  }, 50);
});

// ─── ADD / EDIT MODAL ────────────────────────────
document.getElementById('add-link-btn').addEventListener('click', () => openAddModal());

function openAddModal() {
  editingId = null;
  _modalIconName = null;
  document.getElementById('modal-title').textContent = 'Add Quick Link';
  document.getElementById('modal-url').value = '';
  document.getElementById('modal-label').value = '';
  document.getElementById('modal-save').textContent = 'Save Link';
  document.getElementById('modal-icon-preview').innerHTML = '';
  document.getElementById('modal-icon-picker').style.display = 'none';
  document.getElementById('modal-no-favicon').checked = false;
  setModalFaviconBg('white');
  const secSelAdd = document.getElementById('modal-section');
  secSelAdd.innerHTML = (state.qlSections || [{ id: 'default', label: 'Quick Links' }])
    .map(s => `<option value="${s.id}">${escHtml(s.label)}</option>`)
    .join('');
  showModal();
}

function openEditModal(id) {
  editingId = id;
  const link = state.links.find(l => l.id === id);
  if (!link) return;
  document.getElementById('modal-title').textContent = 'Edit Link';
  document.getElementById('modal-url').value = link.url;
  document.getElementById('modal-label').value = link.label;
  document.getElementById('modal-save').textContent = 'Update Link';
  document.getElementById('modal-icon-picker').style.display = 'none';
  setModalIcon(link.icon || null);
  document.getElementById('modal-no-favicon').checked = !!link.noFavicon;
  setModalFaviconBg(link.faviconBg || 'white');
  // populate section dropdown
  const secSel = document.getElementById('modal-section');
  secSel.innerHTML = (state.qlSections || [{ id: 'default', label: 'Quick Links' }])
    .map(s => `<option value="${s.id}"${(link.section || 'default') === s.id ? ' selected' : ''}>${escHtml(s.label)}</option>`)
    .join('');
  showModal();
}

function showModal() {
  const m = document.getElementById('link-modal');
  m.style.display = 'flex';
  m.classList.remove('closing');
  m.querySelector('.modal').classList.remove('closing');
  setTimeout(() => document.getElementById('modal-url').focus(), 50);
}

function hideModal() {
  const m = document.getElementById('link-modal');
  m.classList.add('closing');
  m.querySelector('.modal').classList.add('closing');
  setTimeout(() => { m.style.display = 'none'; }, 200);
}

document.getElementById('modal-cancel').addEventListener('click', hideModal);
document.getElementById('link-modal').addEventListener('click', e => {
  if (e.target === document.getElementById('link-modal')) hideModal();
});

document.getElementById('modal-save').addEventListener('click', async () => {
  let url = document.getElementById('modal-url').value.trim();
  let label = document.getElementById('modal-label').value.trim();

  if (!url) return;
  if (!/^https?:\/\//i.test(url)) url = 'https://' + url;

  if (!label) label = getUrlLabel(url);

  const section = document.getElementById('modal-section').value;
  const noFavicon = document.getElementById('modal-no-favicon').checked;
  if (editingId) {
    const link = state.links.find(l => l.id === editingId);
    if (link) {
      link.url = url; link.label = label; link.favicon = null; link.icon = _modalIconName || null; link.section = section;
      link.noFavicon = noFavicon || null; link.faviconBg = _modalFaviconBg !== 'white' ? _modalFaviconBg : null;
      const chromeId = link.bmId || (link.fromBookmark && link.id.startsWith('bm-') ? link.id.slice(3) : null);
      if (chromeId && chrome?.bookmarks) chrome.bookmarks.update(chromeId, { url, title: label }).catch(() => {});
    }
  } else {
    const newLink = { id: 'ql-' + Date.now(), url, label, favicon: null, icon: _modalIconName || null, section, noFavicon: noFavicon || null, faviconBg: _modalFaviconBg !== 'white' ? _modalFaviconBg : null };
    state.links.push(newLink);
    if (state.bmFolderId && chrome?.bookmarks) {
      const parentId = section.startsWith('bms-') ? section.slice(4) : state.bmFolderId;
      chrome.bookmarks.create({ parentId, url, title: label }).then(bm => {
        newLink.fromBookmark = true;
        newLink.bmId = bm.id;
        saveState();
      }).catch(() => {});
    }
  }

  saveState(); renderLinks(); hideModal();
});

// Enter key in modal
document.getElementById('modal-url').addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('modal-label').focus();
});
document.getElementById('modal-label').addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('modal-save').click();
});

// ─── SETTINGS ────────────────────────────────────

const DEFAULT_WALLPAPERS = [
  { id: 'wp-bing',      label: 'Bing Daily',  emoji: '🌅', dynamic: true },
  { id: 'wp-nasa',      label: 'NASA Daily',  emoji: '🚀', dynamic: true },
  { id: 'wp-wikimedia', label: 'Wikimedia',   emoji: '📷', dynamic: true },
];

const WP_EMOJIS = ['🌅','🌌','⛰️','🌊','🌲','🌠','🏙️','🏜️','⚡','🌸','🍂','❄️','🌋','🏖️','🌃','🌄','🌿','🦋','🎑','🏔️','🌺','🌙','☁️','🌈','🌾','🏕️','🐚','🦅','🌏','🎋','🗻','🌻','🌴','🏞️','🦁','🐬'];

let wpSelectedEmoji = '🖼️';

function getWallpapers() { return state.wallpapers ?? DEFAULT_WALLPAPERS; }

async function getBingWallpaperUrl() {
  const cacheKey = 'lumina_bing_wp';
  const today = new Date().toDateString();
  const cached = JSON.parse(localStorage.getItem(cacheKey) || 'null');
  if (cached && cached.date === today) return cached.url;
  try {
    const resp = await fetch('https://www.bing.com/HPImageArchive.aspx?format=js&idx=0&n=1&mkt=en-US');
    const data = await resp.json();
    const urlbase = data.images[0].urlbase;
    const url = 'https://www.bing.com' + urlbase + '_1920x1080.jpg';
    localStorage.setItem(cacheKey, JSON.stringify({ date: today, url }));
    return url;
  } catch { return null; }
}

async function getNasaApodUrl() {
  const cacheKey = 'lumina_nasa_wp';
  const today = new Date().toDateString();
  const cached = JSON.parse(localStorage.getItem(cacheKey) || 'null');
  if (cached && cached.date === today) return cached.url;
  try {
    const resp = await fetch('https://api.nasa.gov/planetary/apod?api_key=DEMO_KEY');
    const data = await resp.json();
    if (data.media_type !== 'image') return null;
    const url = data.hdurl || data.url;
    localStorage.setItem(cacheKey, JSON.stringify({ date: today, url }));
    return url;
  } catch { return null; }
}

async function getSpotlightUrl() {
  const cacheKey = 'lumina_spotlight_wp';
  const today = new Date().toDateString();
  const cached = JSON.parse(localStorage.getItem(cacheKey) || 'null');
  if (cached && cached.date === today) return cached.url;
  try {
    const resp = await fetch('https://arc.msn.com/v3/Delivery/Placement?pid=338387&fmt=json&rafb=0&ua=WindowsShellClient%2F0&cdm=1&disphorzres=1920&dispvertres=1080&lo=80217&pl=en-US&lc=en-US&ctry=US&time=' + Date.now());
    const data = await resp.json();
    const items = data?.batchrsp?.items;
    if (!items?.length) return null;
    const item = JSON.parse(items[0].item);
    const url = item?.ad?.image_fullscreen_001_landscape?.u;
    if (!url) return null;
    localStorage.setItem(cacheKey, JSON.stringify({ date: today, url }));
    return url;
  } catch { return null; }
}

async function getWikimediaPotdUrl() {
  const cacheKey = 'lumina_wikimedia_wp';
  const today = new Date().toDateString();
  const cached = JSON.parse(localStorage.getItem(cacheKey) || 'null');
  if (cached && cached.date === today) return cached.url;
  try {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const title = `Template:POTD/${yyyy}-${mm}-${dd}`;
    const apiUrl = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=images&imlimit=1&format=json&origin=*`;
    const resp = await fetch(apiUrl);
    const data = await resp.json();
    const pages = Object.values(data.query.pages);
    const imgTitle = pages[0]?.images?.[0]?.title;
    if (!imgTitle) return null;
    const imgResp = await fetch(`https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(imgTitle)}&prop=imageinfo&iiprop=url&iiurlwidth=1920&format=json&origin=*`);
    const imgData = await imgResp.json();
    const imgPages = Object.values(imgData.query.pages);
    const url = imgPages[0]?.imageinfo?.[0]?.thumburl || imgPages[0]?.imageinfo?.[0]?.url;
    if (!url) return null;
    localStorage.setItem(cacheKey, JSON.stringify({ date: today, url }));
    return url;
  } catch { return null; }
}

async function applyWallpaper(id) {
  const el = document.getElementById('bg-wallpaper');
  if (!id) {
    el.classList.remove('active');
    document.body.classList.remove('wallpaper-active');
    el.style.backgroundImage = '';
    return;
  }
  const wp = getWallpapers().find(t => t.id === id);
  if (!wp) return;

  let url = wp.url;
  if (wp.dynamic) {
    if (wp.id === 'wp-nasa')      url = await getNasaApodUrl();
    else if (wp.id === 'wp-spotlight') url = await getSpotlightUrl();
    else if (wp.id === 'wp-wikimedia') url = await getWikimediaPotdUrl();
    else url = await getBingWallpaperUrl();
  }
  if (!url) return;

  el.style.backgroundImage = `url(${url})`;
  el.classList.add('active');
  document.body.classList.add('wallpaper-active');
}

// Increment a per-load counter in localStorage; returns the current index before increment
function nextLoadIdx(key, len) {
  const idx = parseInt(localStorage.getItem(key) || '0', 10) % len;
  localStorage.setItem(key, String((idx + 1) % len));
  return idx;
}

function pickAndApplyWallpaper() {
  const wallpapers = getWallpapers();
  const themes = (state.wallpaperThemes || []).filter(id => {
    const w = wallpapers.find(x => x.id === id);
    return w && (w.dynamic || w.url);
  });
  if (!themes.length) { applyWallpaper(null); return; }
  const idx = nextLoadIdx('lumina_wp_idx', themes.length);
  applyWallpaper(themes[idx]);
}

function buildWallpaperGrid() {
  const grid = document.getElementById('wp-grid');
  grid.innerHTML = '';
  const wallpapers = getWallpapers();
  const isCustom = !!state.wallpapers;

  const selected = state.wallpaperThemes || [];

  // None card
  const noneCard = document.createElement('div');
  noneCard.className = 'theme-card wp-card' + (!selected.length ? ' active' : '');
  noneCard.dataset.id = '';
  noneCard.style.background = 'rgba(255,255,255,0.05)';
  noneCard.innerHTML = '<div class="tc-name" style="font-size:11px;position:relative;z-index:1;">None</div><div class="theme-check">✓</div>';
  noneCard.addEventListener('click', () => { state.wallpaperThemes = []; saveState(); applyWallpaper(null); buildWallpaperGrid(); });
  grid.appendChild(noneCard);

  wallpapers.forEach((wp, idx) => {
    const isSelected = selected.includes(wp.id);
    const card = document.createElement('div');
    card.className = 'theme-card wp-card' + (isSelected ? ' active' : '');
    card.dataset.id = wp.id;
    if (wp.thumb || (wp.url && wp.url.startsWith('data:'))) {
      card.style.backgroundImage = `url(${wp.thumb || wp.url})`;
      card.style.backgroundSize = 'cover';
      card.style.backgroundPosition = 'center';
    } else {
      card.style.background = 'linear-gradient(135deg,#1a1a2e,#16213e,#0f3460)';
    }
    // Title at bottom (via flexbox in .wp-card), check at top-left
    card.innerHTML = `<div class="tc-name" style="text-shadow:0 1px 8px rgba(0,0,0,1);font-size:11px;font-weight:600;position:relative;z-index:1;">${wp.emoji} ${wp.label}</div><div class="theme-check">✓</div>`;

    // Button container — top-right, shown on hover
    const btnContainer = document.createElement('div');
    btnContainer.className = 'wp-card-btns';

    // Edit button
    const editBtn = document.createElement('button');
    editBtn.className = 'wp-card-btn';
    editBtn.textContent = '✏';
    editBtn.title = 'Edit name / emoji';
    editBtn.addEventListener('click', e => {
      e.stopPropagation();
      const existing = card.querySelector('.wp-card-edit-overlay');
      if (existing) { existing.remove(); return; }

      if (!state.wallpapers) state.wallpapers = DEFAULT_WALLPAPERS.map(w => ({ ...w }));
      const target = state.wallpapers.find(w => w.id === wp.id);
      if (!target) return;

      let currentEmoji = target.emoji;

      const overlay = document.createElement('div');
      overlay.className = 'wp-card-edit-overlay';
      overlay.addEventListener('click', e2 => e2.stopPropagation());

      const emojiBtn = document.createElement('span');
      emojiBtn.className = 'wp-card-edit-emoji';
      emojiBtn.textContent = currentEmoji;
      emojiBtn.title = 'Click to cycle emoji';
      emojiBtn.addEventListener('click', () => {
        const i = WP_EMOJIS.indexOf(currentEmoji);
        currentEmoji = WP_EMOJIS[(i + 1) % WP_EMOJIS.length];
        emojiBtn.textContent = currentEmoji;
      });

      const titleInput = document.createElement('input');
      titleInput.className = 'wp-card-edit-title';
      titleInput.value = target.label;
      titleInput.maxLength = 30;

      const saveBtn = document.createElement('button');
      saveBtn.className = 'wp-card-edit-save';
      saveBtn.textContent = '✓';
      saveBtn.title = 'Save';
      saveBtn.addEventListener('click', () => {
        const newTitle = titleInput.value.trim();
        if (!newTitle) return;
        target.emoji = currentEmoji;
        target.label = newTitle;
        saveState();
        buildWallpaperGrid();
      });

      const cancelBtn = document.createElement('button');
      cancelBtn.className = 'wp-card-edit-cancel';
      cancelBtn.textContent = '✕';
      cancelBtn.title = 'Cancel';
      cancelBtn.addEventListener('click', () => overlay.remove());

      overlay.appendChild(emojiBtn);
      overlay.appendChild(titleInput);
      overlay.appendChild(saveBtn);
      overlay.appendChild(cancelBtn);
      card.appendChild(overlay);
      titleInput.focus();
      titleInput.select();
    });
    btnContainer.appendChild(editBtn);

    // Delete button — only when state.wallpapers is custom
    if (isCustom) {
      const del = document.createElement('button');
      del.className = 'wp-card-btn del';
      del.textContent = '✕';
      del.title = 'Remove';
      del.addEventListener('click', e => {
        e.stopPropagation();
        state.wallpapers.splice(idx, 1);
        state.wallpaperThemes = (state.wallpaperThemes || []).filter(id => id !== wp.id);
        saveState(); pickAndApplyWallpaper(); buildWallpaperGrid();
      });
      btnContainer.appendChild(del);
    }
    card.appendChild(btnContainer);

    card.addEventListener('click', () => {
      if (!state.wallpaperThemes) state.wallpaperThemes = [];
      const i = state.wallpaperThemes.indexOf(wp.id);
      if (i >= 0) state.wallpaperThemes.splice(i, 1);
      else state.wallpaperThemes.push(wp.id);
      saveState();
      if (state.bgMode === 'wallpaper') pickAndApplyWallpaper();
      buildWallpaperGrid();
    });
    grid.appendChild(card);
  });

  // Build emoji picker
  buildWpEmojiPicker();
}

function buildWpEmojiPicker() {
  const picker = document.getElementById('wp-emoji-picker');
  if (!picker) return;
  picker.innerHTML = '';
  WP_EMOJIS.forEach(em => {
    const span = document.createElement('span');
    span.className = 'wp-emoji-opt' + (em === wpSelectedEmoji ? ' selected' : '');
    span.textContent = em;
    span.addEventListener('click', () => {
      wpSelectedEmoji = em;
      document.getElementById('wp-selected-emoji').textContent = em;
      buildWpEmojiPicker();
    });
    picker.appendChild(span);
  });
}

function setupWallpaperManagement() {

  // Add form collapse toggle
  document.getElementById('wp-add-toggle').addEventListener('click', () => {
    const body = document.getElementById('wp-add-body');
    const arrow = document.getElementById('wp-add-toggle-arrow');
    const open = body.style.display === 'none';
    body.style.display = open ? 'block' : 'none';
    arrow.style.transform = open ? 'rotate(90deg)' : '';
  });

  // File upload — supports multiple files; each becomes its own wallpaper card
  document.getElementById('wp-file-input').addEventListener('change', e => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    files.forEach(file => {
      const name = file.name.replace(/\.[^.]+$/, ''); // strip extension
      const reader = new FileReader();
      reader.onload = ev => {
        const img = new Image();
        img.onload = () => {
          const maxW = 1280, maxH = 720;
          let w = img.width, h = img.height;
          if (w > maxW || h > maxH) {
            const ratio = Math.min(maxW / w, maxH / h);
            w = Math.round(w * ratio); h = Math.round(h * ratio);
          }
          const canvas = document.createElement('canvas');
          canvas.width = w; canvas.height = h;
          canvas.getContext('2d').drawImage(img, 0, 0, w, h);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          const id = 'wp-u-' + Date.now() + '-' + Math.random().toString(36).slice(2);
          const newWp = { id, label: name, emoji: wpSelectedEmoji, url: dataUrl, thumb: dataUrl };
          if (!state.wallpapers) state.wallpapers = DEFAULT_WALLPAPERS.map(w => ({ ...w }));
          state.wallpapers.push(newWp);
          saveState();
          buildWallpaperGrid();
        };
        img.src = ev.target.result;
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  });

  // Selected emoji display
  document.getElementById('wp-selected-emoji').addEventListener('click', () => {
    const picker = document.getElementById('wp-emoji-picker');
    picker.style.display = picker.style.display === 'none' ? 'flex' : 'none';
  });

  // Add wallpaper
  document.getElementById('wp-add-btn').addEventListener('click', () => {
    const title = document.getElementById('wp-add-title').value.trim();
    const url = document.getElementById('wp-add-url').value.trim();
    if (!title || !url) return;
    const id = 'wp-u-' + Date.now();
    const isData = url.startsWith('data:');
    const newWp = { id, label: title, emoji: wpSelectedEmoji, url, thumb: isData ? url : url };
    if (!state.wallpapers) state.wallpapers = [...getWallpapers()];
    state.wallpapers.push(newWp);
    saveState();
    document.getElementById('wp-add-title').value = '';
    document.getElementById('wp-add-url').value = '';
    buildWallpaperGrid();
  });

  // Reset to defaults
  document.getElementById('wp-reset-btn').addEventListener('click', () => {
    if (!confirm('Reset wallpapers to defaults? Custom wallpapers will be removed.')) return;
    state.wallpapers = null;
    state.wallpaperThemes = (state.wallpaperThemes || []).filter(id => DEFAULT_WALLPAPERS.find(w => w.id === id));
    pickAndApplyWallpaper();
    saveState(); buildWallpaperGrid();
  });
}

function buildThemeGrid() {
  const grid = document.getElementById('theme-grid');
  grid.innerHTML = '';
  Object.entries(THEMES).forEach(([key, theme]) => {
    const card = document.createElement('div');
    card.className = 'theme-card' + (state.themes.includes(key) ? ' active' : '');
    card.style.background = theme.preview;
    card.innerHTML = `
      <div class="tc-name">${theme.name}</div>
      <div class="tc-desc">${theme.desc}</div>
      <div class="theme-check">✓</div>
    `;
    card.addEventListener('click', () => {
      const idx = state.themes.indexOf(key);
      if (idx >= 0) {
        if (state.themes.length > 1) state.themes.splice(idx, 1);
      } else {
        state.themes.push(key);
      }
      sessionStorage.removeItem('lumina_color_theme');
      saveState(); buildThemeGrid(); buildBlobs(); if (!state.animateBg) renderBg(bgTime * 1000);
    });
    grid.appendChild(card);
  });
}

// ─── FOCUS LINES ─────────────────────────────────
const DEFAULT_FOCUS_LINES = [
  'Deep work · Ship it · Stay present',
  'Make it simple. Make it fast.',
  'One thing at a time.',
  'Build something that matters.',
  'Think clearly. Act deliberately.',
  'Progress over perfection.',
];

function getFocusLines() { return state.focusLines ?? DEFAULT_FOCUS_LINES; }

function getActiveFocusLine() {
  const lines = getFocusLines();
  if (!lines.length) return '';
  const dayIdx = Math.floor(Date.now() / 86400000) % lines.length;
  return lines[dayIdx];
}

function applyFocusLine() {
  const text = state.focusText?.trim() || getActiveFocusLine();
  document.getElementById('focus').textContent = text;
}

function buildFocusLinesList() {
  const list = document.getElementById('focus-lines-list');
  if (!list) return;
  const lines = getFocusLines();
  const isCustom = !!state.focusLines;
  list.innerHTML = '';
  lines.forEach((line, idx) => {
    const row = document.createElement('div');
    row.className = 'focus-line-item';
    row.innerHTML = `<span class="focus-line-text" title="${escHtml(line)}">${escHtml(line)}</span>`;
    if (isCustom) {
      const del = document.createElement('button');
      del.className = 'focus-line-del';
      del.textContent = '✕';
      del.title = 'Remove';
      del.addEventListener('click', () => {
        state.focusLines.splice(idx, 1);
        if (!state.focusLines.length) state.focusLines = null;
        saveState(); buildFocusLinesList(); applyFocusLine();
      });
      row.appendChild(del);
    }
    list.appendChild(row);
  });
}

function setupFocusLineManagement() {
  document.getElementById('focus-line-add-btn').addEventListener('click', () => {
    const input = document.getElementById('focus-line-input');
    const text = input.value.trim();
    if (!text) return;
    if (!state.focusLines) state.focusLines = [...getFocusLines()];
    state.focusLines.push(text);
    saveState(); buildFocusLinesList(); applyFocusLine();
    input.value = '';
  });
  document.getElementById('focus-line-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('focus-line-add-btn').click();
  });
  document.getElementById('focus-reset-btn').addEventListener('click', () => {
    state.focusLines = null;
    saveState(); buildFocusLinesList(); applyFocusLine();
  });
  document.getElementById('focus-fetch-btn').addEventListener('click', async () => {
    const btn = document.getElementById('focus-fetch-btn');
    btn.textContent = '…';
    btn.disabled = true;
    try {
      const resp = await fetch('https://zenquotes.io/api/random');
      const data = await resp.json();
      if (data[0]?.q) {
        const quote = data[0].q + (data[0].a ? ' — ' + data[0].a : '');
        if (!state.focusLines) state.focusLines = [...getFocusLines()];
        state.focusLines.push(quote);
        saveState(); buildFocusLinesList(); applyFocusLine();
      }
    } catch {}
    btn.textContent = '✨ Fetch from API';
    btn.disabled = false;
  });
}

const ADDRESS_BOOK_FIELDS = ['label', 'firstName', 'lastName', 'name', 'email', 'phone', 'company', 'addressLine1', 'addressLine2', 'city', 'state', 'zip', 'country'];
const AB_INPUT_IDS = { label: 'ab-label', firstName: 'ab-firstName', lastName: 'ab-lastName', name: 'ab-name', email: 'ab-email', phone: 'ab-phone', company: 'ab-company', addressLine1: 'ab-address1', addressLine2: 'ab-address2', city: 'ab-city', state: 'ab-state', zip: 'ab-zip', country: 'ab-country' };

// ISO 3166-1 alpha-2 codes and names (code stored in entry; filler can use code or name)
const COUNTRY_LIST = [
  ['', '—'], ['US', 'United States'], ['CA', 'Canada'], ['GB', 'United Kingdom'], ['AU', 'Australia'], ['DE', 'Germany'], ['FR', 'France'], ['ES', 'Spain'], ['IT', 'Italy'], ['NL', 'Netherlands'], ['BE', 'Belgium'], ['CH', 'Switzerland'], ['AT', 'Austria'], ['IE', 'Ireland'], ['PL', 'Poland'], ['SE', 'Sweden'], ['NO', 'Norway'], ['DK', 'Denmark'], ['FI', 'Finland'], ['PT', 'Portugal'], ['JP', 'Japan'], ['CN', 'China'], ['IN', 'India'], ['KR', 'South Korea'], ['BR', 'Brazil'], ['MX', 'Mexico'], ['AR', 'Argentina'], ['ZA', 'South Africa'], ['NZ', 'New Zealand'], ['SG', 'Singapore'], ['HK', 'Hong Kong'], ['IL', 'Israel'], ['AE', 'United Arab Emirates'], ['SA', 'Saudi Arabia'], ['RU', 'Russia'], ['TR', 'Turkey'], ['GR', 'Greece'], ['CZ', 'Czech Republic'], ['RO', 'Romania'], ['HU', 'Hungary'], ['TH', 'Thailand'], ['MY', 'Malaysia'], ['PH', 'Philippines'], ['ID', 'Indonesia'], ['VN', 'Vietnam'], ['EG', 'Egypt'], ['NG', 'Nigeria'], ['KE', 'Kenya'], ['CO', 'Colombia'], ['CL', 'Chile'], ['PE', 'Peru'], ['UA', 'Ukraine'], ['LU', 'Luxembourg'], ['SK', 'Slovakia'], ['BG', 'Bulgaria'], ['HR', 'Croatia'], ['SI', 'Slovenia'], ['LT', 'Lithuania'], ['LV', 'Latvia'], ['EE', 'Estonia'], ['CY', 'Cyprus'], ['MT', 'Malta'], ['IS', 'Iceland'], ['CR', 'Costa Rica'], ['PA', 'Panama'], ['EC', 'Ecuador'], ['PR', 'Puerto Rico'], ['JM', 'Jamaica'], ['DO', 'Dominican Republic'], ['GT', 'Guatemala'], ['QA', 'Qatar'], ['KW', 'Kuwait'], ['BH', 'Bahrain'], ['OM', 'Oman'], ['PK', 'Pakistan'], ['BD', 'Bangladesh'], ['LK', 'Sri Lanka'], ['TW', 'Taiwan']
];
const COUNTRY_MAP = Object.fromEntries(COUNTRY_LIST.filter(([c]) => c));
const COUNTRY_NAME_TO_CODE = Object.fromEntries(COUNTRY_LIST.filter(([c]) => c).map(([code, name]) => [name.toLowerCase(), code]));

function abEscape(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'); }

function setupAddressBook() {
  const listEl = document.getElementById('address-book-list');
  const formEl = document.getElementById('address-book-form');
  const formTitleEl = document.getElementById('address-book-form-title');
  const addBtn = document.getElementById('address-book-add-btn');
  const cancelBtn = document.getElementById('address-book-cancel-btn');
  const saveBtn = document.getElementById('address-book-save-btn');
  if (!listEl || !formEl) return;

  let editingId = null;
  let saveInProgress = false;

  const countrySelect = document.getElementById('ab-country');
  if (countrySelect && !countrySelect.querySelector('option[value="US"]')) {
    countrySelect.innerHTML = '<option value="">Select country</option>';
    COUNTRY_LIST.forEach(([code, name]) => {
      if (code === '' && name === '—') return;
      const opt = document.createElement('option');
      opt.value = code;
      opt.textContent = name;
      countrySelect.appendChild(opt);
    });
  }

  function getFormData() {
    const data = {};
    ADDRESS_BOOK_FIELDS.forEach(f => {
      const el = document.getElementById(AB_INPUT_IDS[f]);
      data[f] = el ? (el.value || '').trim() : '';
    });
    return data;
  }

  function setFormData(entry) {
    ADDRESS_BOOK_FIELDS.forEach(f => {
      const el = document.getElementById(AB_INPUT_IDS[f]);
      if (!el) return;
      let v = (entry && entry[f]) ?? '';
      if (f === 'country' && el.tagName === 'SELECT') {
        if (v && v.length === 2 && COUNTRY_MAP[v]) el.value = v;
        else if (v && COUNTRY_NAME_TO_CODE[v.toLowerCase()]) el.value = COUNTRY_NAME_TO_CODE[v.toLowerCase()];
        else el.value = v || '';
      } else {
        el.value = v;
      }
    });
  }

  function renderList() {
    const list = Array.isArray(state.addressBook) ? state.addressBook : [];
    listEl.innerHTML = '';
    list.forEach(entry => {
      const card = document.createElement('div');
      card.className = 'address-book-card';
      card.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:8px 10px;background:var(--glass);border:1px solid var(--glass-border);border-radius:8px;';
      const label = (entry.label || entry.name || [entry.firstName, entry.lastName].filter(Boolean).join(' ') || 'Unnamed').slice(0, 30);
      card.innerHTML = `<span style="font-size:12px;color:var(--text);">${abEscape(label)}</span><span style="display:flex;gap:4px;"><button type="button" class="ab-edit-btn" data-id="${abEscape(entry.id)}" style="padding:4px 8px;font-size:10px;border-radius:6px;border:1px solid var(--glass-border);background:transparent;color:var(--text-muted);cursor:pointer;">Edit</button><button type="button" class="ab-del-btn" data-id="${abEscape(entry.id)}" style="padding:4px 8px;font-size:10px;border-radius:6px;border:1px solid rgba(255,100,100,0.4);background:transparent;color:#f88;cursor:pointer;">Delete</button></span>`;
      listEl.appendChild(card);
    });
    listEl.querySelectorAll('.ab-edit-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const entry = state.addressBook.find(e => e.id === btn.dataset.id);
        if (entry) { editingId = entry.id; formTitleEl.textContent = 'Edit entry'; setFormData(entry); formEl.style.display = 'block'; }
      });
    });
    listEl.querySelectorAll('.ab-del-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (!confirm('Delete this entry?')) return;
        const idx = state.addressBook.findIndex(e => e.id === btn.dataset.id);
        if (idx >= 0) { state.addressBook.splice(idx, 1); saveState(); renderList(); if (formEl.style.display === 'block' && editingId === btn.dataset.id) { formEl.style.display = 'none'; editingId = null; } }
      });
    });
  }

  addBtn.onclick = () => {
    editingId = null;
    formTitleEl.textContent = 'New entry';
    setFormData(null);
    formEl.style.display = 'block';
  };
  cancelBtn.onclick = () => { formEl.style.display = 'none'; editingId = null; };
  saveBtn.onclick = () => {
    if (saveInProgress) return;
    saveInProgress = true;
    const data = getFormData();
    if (!data.name && (data.firstName || data.lastName)) data.name = [data.firstName, data.lastName].filter(Boolean).join(' ').trim();
    const label = data.label || data.name || data.firstName || data.lastName || 'Unnamed';
    if (editingId) {
      const entry = state.addressBook.find(e => e.id === editingId);
      if (entry) { Object.assign(entry, data); entry.label = label.slice(0, 24); }
    } else {
      state.addressBook.push({ id: 'ab-' + Date.now(), ...data, label: label.slice(0, 24) });
    }
    saveState();
    formEl.style.display = 'none';
    editingId = null;
    renderList();
    saveInProgress = false;
  };

  renderList();
}

function syncSettings() {
  // intensity
  document.querySelectorAll('.intensity-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.intensity === state.intensity);
  });
  document.querySelectorAll('.intensity-btn').forEach(btn => {
    btn.onclick = () => {
      state.intensity = btn.dataset.intensity;
      saveState(); syncSettings(); if (!state.animateBg) renderBg(bgTime * 1000);
    };
  });

  // toggles
  const toggles = {
    'toggle-animate': 'animateBg',
    'toggle-clock': 'showClock',
    'toggle-quote': 'showQuote',
    'toggle-grain': 'showGrain',
  };
  Object.entries(toggles).forEach(([id, key]) => {
    const btn = document.getElementById(id);
    btn.classList.toggle('on', !!state[key]);
    btn.onclick = () => {
      state[key] = !state[key];
      saveState(); syncSettings(); applyVisibility();
      if (key === 'animateBg') startBg();
    };
  });

  // greeting
  const greetToggle = document.getElementById('toggle-greeting-custom');
  const greetDefaultField = document.getElementById('greeting-default-field');
  const greetCustomField = document.getElementById('greeting-custom-field');
  const greetNameInput = document.getElementById('greeting-name-input');
  const greetCustomInput = document.getElementById('greeting-custom-input');

  function syncGreetingFields() {
    const custom = !!state.greetingCustom;
    greetToggle.classList.toggle('on', custom);
    greetDefaultField.style.display = custom ? 'none' : 'block';
    greetCustomField.style.display = custom ? 'block' : 'none';
  }

  greetNameInput.value = state.greetingName || '';
  greetCustomInput.value = state.greetingCustomText || '';
  syncGreetingFields();

  greetToggle.addEventListener('click', () => {
    state.greetingCustom = !state.greetingCustom;
    syncGreetingFields();
    saveState();
    updateClock();
  });
  greetNameInput.addEventListener('input', () => {
    state.greetingName = greetNameInput.value;
    saveState();
    updateClock();
  });
  greetCustomInput.addEventListener('input', () => {
    state.greetingCustomText = greetCustomInput.value;
    saveState();
    updateClock();
  });

  // search engine
  document.getElementById('search-engine-select').value = state.searchEngine;

  // weather
  document.getElementById('weather-postal').value = state.postalCode || '';
  const wxUnitBtn = document.getElementById('toggle-weather-unit');
  wxUnitBtn.classList.toggle('on', state.weatherUnit !== 'c');
  wxUnitBtn.onclick = () => {
    state.weatherUnit = state.weatherUnit === 'f' ? 'c' : 'f';
    saveState(); syncSettings();
    localStorage.removeItem('lumina_weather');
    fetchWeather();
  };
  const geoBtn = document.getElementById('toggle-geo-location');
  geoBtn.classList.toggle('on', state.useGeoLocation !== false);
  geoBtn.onclick = () => {
    state.useGeoLocation = !state.useGeoLocation;
    saveState(); syncSettings();
    localStorage.removeItem('lumina_weather');
    fetchWeather();
  };
  // show cached location name in settings if available
  const cachedWx = JSON.parse(localStorage.getItem('lumina_weather') || 'null');
  const locNameEl = document.getElementById('weather-loc-name');
  if (locNameEl && cachedWx?.location) locNameEl.textContent = cachedWx.location;

  // bg mode segmented tabs
  const bgMode = state.bgMode || 'colors';
  const bgModeTabs = document.querySelectorAll('.bg-mode-tab');

  function applyBgModeUI(mode) {
    const isWallpaper = mode === 'wallpaper';
    bgModeTabs.forEach(tab => tab.classList.toggle('active', tab.dataset.mode === mode));
    document.getElementById('bg-pane-colors').classList.toggle('active', !isWallpaper);
    document.getElementById('bg-pane-wallpaper').classList.toggle('active', isWallpaper);
    if (isWallpaper) {
      pickAndApplyWallpaper();
    } else {
      applyWallpaper(null);
    }
  }

  bgModeTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      state.bgMode = tab.dataset.mode;
      saveState();
      applyBgModeUI(state.bgMode);
    });
  });

  applyBgModeUI(bgMode);

  // focus lines
  buildFocusLinesList();

  // address book (auto-fill forms)
  setupAddressBook();

  // panel theme buttons
  applyPanelTheme(state.panelTheme || 'dark');
}

const ENGINE_LABELS = { claude: 'Claude', gemini: 'Gemini', chatgpt: 'ChatGPT', perplexity: 'Perplexity', google: 'Google', googleai: 'Google AI', bing: 'Bing', duckduckgo: 'DuckDuckGo', github: 'GitHub', stackoverflow: 'Stack Overflow' };

function applyEngine(engine) {
  state.searchEngine = engine;
  const label = ENGINE_LABELS[engine] || 'Claude';
  const logoEl = document.getElementById('claude-logo');
  logoEl.textContent = label;
  logoEl.dataset.engine = engine;
  document.getElementById('search-input').placeholder = `Ask ${label} anything…`;
  document.getElementById('search-engine-select').value = engine;
  const color = ENGINE_COLORS[engine] || '#a78bfa';
  const btn = document.getElementById('search-btn');
  btn.style.background = color;
  btn.style.boxShadow = `0 2px 12px ${color}55`;
  // Dark text on light colors, light text on dark
  const r = parseInt(color.slice(1,3),16), g = parseInt(color.slice(3,5),16), b = parseInt(color.slice(5,7),16);
  btn.style.color = (r*0.299 + g*0.587 + b*0.114) > 140 ? '#1a0f2e' : '#ffffff';
  document.documentElement.style.setProperty('--engine-color', color);
}

// Engine dropdown
const ENGINE_GROUPS = [
  { label: 'AI', engines: ['claude', 'gemini', 'chatgpt', 'perplexity'] },
  { label: 'Web', engines: ['google', 'googleai', 'bing', 'duckduckgo'] },
  { label: 'Developer', engines: ['github', 'stackoverflow'] },
];
const ENGINE_COLORS = { claude: '#d4825a', gemini: '#8ab4f8', chatgpt: '#10a37f', perplexity: '#20b2c8', google: '#4285f4', googleai: '#a8c7fa', bing: '#008373', duckduckgo: '#ff5a00', github: '#a371f7', stackoverflow: '#f48024' };

function buildEngineDropdown() {
  const dd = document.getElementById('engine-dropdown');
  dd.innerHTML = '';
  ENGINE_GROUPS.forEach(group => {
    const lbl = document.createElement('div');
    lbl.className = 'eng-group-label';
    lbl.textContent = group.label;
    dd.appendChild(lbl);
    group.engines.forEach(eng => {
      const opt = document.createElement('div');
      opt.className = 'eng-option' + (state.searchEngine === eng ? ' active' : '');
      opt.dataset.engine = eng;
      opt.innerHTML = `<span class="eng-dot" style="background:${ENGINE_COLORS[eng] || '#888'}"></span>${ENGINE_LABELS[eng]}`;
      opt.addEventListener('click', e => {
        e.stopPropagation();
        applyEngine(eng);
        saveState();
        closeEngineDropdown();
      });
      dd.appendChild(opt);
    });
  });
}

function openEngineDropdown() {
  buildEngineDropdown();
  document.getElementById('engine-dropdown').classList.add('open');
}

function closeEngineDropdown() {
  document.getElementById('engine-dropdown').classList.remove('open');
}

document.getElementById('claude-logo').addEventListener('click', e => {
  e.stopPropagation();
  const dd = document.getElementById('engine-dropdown');
  if (dd.classList.contains('open')) closeEngineDropdown();
  else openEngineDropdown();
});

document.addEventListener('click', e => {
  if (!e.target.closest('#engine-dropdown') && !e.target.closest('#claude-logo')) closeEngineDropdown();
});

document.getElementById('search-engine-select').addEventListener('change', e => {
  applyEngine(e.target.value);
  saveState();
});

function applyVisibility() {
  document.getElementById('clock-wrap').style.opacity = state.showClock ? '1' : '0';
  document.getElementById('quote-wrap').style.display = state.showQuote ? '' : 'none';
  document.getElementById('grain').style.display = state.showGrain ? '' : 'none';
  applyFocusLine();
}

function applyPanelTheme(theme) {
  const panel = document.getElementById('notes-panel');
  panel.classList.remove('panel-light', 'panel-system');
  if (theme === 'light') panel.classList.add('panel-light');
  else if (theme === 'system') panel.classList.add('panel-system');
  document.querySelectorAll('.panel-theme-btn').forEach(btn => {
    const active = btn.dataset.theme === theme;
    btn.style.background = active ? 'rgba(167,139,250,0.2)' : '';
    btn.style.borderColor = active ? 'rgba(167,139,250,0.4)' : '';
    btn.style.color = active ? 'rgba(255,255,255,0.92)' : '';
  });
  // Update notes panel toggle icon (moon = dark, sun = light)
  const icon = document.getElementById('notes-theme-icon');
  if (icon) {
    const isLight = theme === 'light' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: light)').matches);
    icon.innerHTML = isLight
      ? '<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>'
      : '<path d="M21.752 15.002A9.718 9.718 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z"/>';
  }
}

function applySettingsTheme(theme) {
  const panel = document.getElementById('settings-panel');
  panel.classList.toggle('settings-light', theme === 'light');
  const icon = document.getElementById('settings-theme-icon');
  if (icon) {
    const isLight = theme === 'light';
    icon.innerHTML = isLight
      ? '<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>'
      : '<path d="M21.752 15.002A9.718 9.718 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z"/>';
  }
}

document.querySelectorAll('.panel-theme-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    state.panelTheme = btn.dataset.theme;
    saveState();
    applyPanelTheme(state.panelTheme);
  });
});

// Notes panel quick light/dark toggle
document.getElementById('notes-theme-toggle').addEventListener('click', () => {
  const current = state.panelTheme || 'dark';
  state.panelTheme = current === 'light' ? 'dark' : 'light';
  saveState();
  applyPanelTheme(state.panelTheme);
});

// Settings panel light/dark toggle
document.getElementById('settings-theme-toggle').addEventListener('click', () => {
  state.settingsTheme = state.settingsTheme === 'light' ? 'dark' : 'light';
  saveState();
  applySettingsTheme(state.settingsTheme);
});

function openSettingsPanel() {
  closeHelpPanel();
  document.getElementById('settings-panel').classList.add('open');
}
function closeSettingsPanel() {
  document.getElementById('settings-panel').classList.remove('open');
  document.getElementById('settings-overlay').classList.remove('open');
}

document.getElementById('settings-btn').addEventListener('click', openSettingsPanel);
document.getElementById('settings-close-btn').addEventListener('click', closeSettingsPanel);
document.getElementById('settings-overlay').addEventListener('click', closeSettingsPanel);

function openHelpPanel() {
  closeNotesPanel();
  closeSettingsPanel();
  document.getElementById('help-panel').classList.add('open');
  document.getElementById('help-overlay').classList.add('open');
}
function closeHelpPanel() {
  document.getElementById('help-panel').classList.remove('open');
  document.getElementById('help-overlay').classList.remove('open');
}

document.getElementById('help-btn').addEventListener('click', openHelpPanel);
document.getElementById('help-overlay').addEventListener('click', closeHelpPanel);

// ─── WEATHER ─────────────────────────────────────
const WMO_ICONS = {
  0:'☀️', 1:'🌤️', 2:'⛅', 3:'☁️',
  45:'🌫️', 48:'🌫️',
  51:'🌦️', 53:'🌦️', 55:'🌧️',
  61:'🌧️', 63:'🌧️', 65:'🌧️',
  71:'❄️', 73:'❄️', 75:'❄️', 77:'❄️',
  80:'🌦️', 81:'🌦️', 82:'🌧️',
  85:'❄️', 86:'❄️',
  95:'⛈️', 96:'⛈️', 99:'⛈️',
};
const WMO_LABELS = {
  0:'Clear', 1:'Mostly clear', 2:'Partly cloudy', 3:'Overcast',
  45:'Foggy', 48:'Foggy',
  51:'Light drizzle', 53:'Drizzle', 55:'Heavy drizzle',
  61:'Light rain', 63:'Rain', 65:'Heavy rain',
  71:'Light snow', 73:'Snow', 75:'Heavy snow', 77:'Snow grains',
  80:'Showers', 81:'Showers', 82:'Heavy showers',
  85:'Snow showers', 86:'Snow showers',
  95:'Thunderstorm', 96:'Thunderstorm', 99:'Thunderstorm',
};

function displayWeather(wx) {
  const el = document.getElementById('weather');
  if (!wx) { el.style.display = 'none'; return; }
  const unit = wx.unit === 'f' ? '°F' : '°C';
  document.getElementById('weather-icon').textContent = WMO_ICONS[wx.code] || '🌡️';
  document.getElementById('weather-temp').textContent = `${wx.temp}${unit}`;
  document.getElementById('weather-cond').textContent = WMO_LABELS[wx.code] || '';
  const locEl = document.getElementById('weather-loc');
  locEl.textContent = wx.location ? `· ${wx.location}` : '';
  const forecastQuery = wx.location ? encodeURIComponent(`weather ${wx.location}`) : 'weather forecast';
  el.onclick = () => window.open(`https://www.google.com/search?q=${forecastQuery}`, '_blank');
  el.style.display = 'flex';
}

async function fetchWeather() {
  const postal = state.postalCode?.trim();
  const useGeo = state.useGeoLocation !== false;
  const cacheKey = postal || 'geo';

  const cached = JSON.parse(localStorage.getItem('lumina_weather') || 'null');
  if (cached && cached.key === cacheKey && cached.unit === state.weatherUnit && (Date.now() - cached.ts) < 30 * 60 * 1000) {
    displayWeather(cached); return;
  }

  try {
    let latitude, longitude, location = '';

    if (postal) {
      const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(postal)}&count=1&format=json`);
      const geoData = await geoRes.json();
      if (!geoData.results?.length) return;
      ({ latitude, longitude } = geoData.results[0]);
      location = geoData.results[0].name || '';
    } else if (useGeo) {
      try {
        const pos = await new Promise((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 })
        );
        latitude = pos.coords.latitude;
        longitude = pos.coords.longitude;
      } catch { document.getElementById('weather').style.display = 'none'; return; }
    } else {
      document.getElementById('weather').style.display = 'none'; return;
    }

    const unit = state.weatherUnit === 'f' ? 'fahrenheit' : 'celsius';
    const wxRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code&temperature_unit=${unit}&timezone=auto`);
    const wxData = await wxRes.json();

    if (!location && wxData.timezone) {
      location = wxData.timezone.split('/').pop().replace(/_/g, ' ');
    }

    // Update location label in settings
    const locName = document.getElementById('weather-loc-name');
    if (locName && location) locName.textContent = location;

    const displayLocation = postal ? postal : location;
    const wx = { key: cacheKey, unit: state.weatherUnit, ts: Date.now(), location: displayLocation,
      temp: Math.round(wxData.current.temperature_2m), code: wxData.current.weather_code };
    localStorage.setItem('lumina_weather', JSON.stringify(wx));
    displayWeather(wx);
  } catch { /* silently fail if offline */ }
}

let postalDebounce;
document.getElementById('weather-postal').addEventListener('input', () => {
  state.postalCode = document.getElementById('weather-postal').value.trim();
  saveState();
  clearTimeout(postalDebounce);
  postalDebounce = setTimeout(() => {
    localStorage.removeItem('lumina_weather');
    fetchWeather();
  }, 800);
});

// ─── BIBLE VERSES ──────────────────────────────────────
// References only — text is fetched live from bible-api.com (WEB translation, public domain)
const VERSE_REFS = [
  { ref: "jeremiah 29:11",    url: "https://www.bible.com/bible/111/JER.29.11" },
  { ref: "philippians 4:13", url: "https://www.bible.com/bible/111/PHP.4.13" },
  { ref: "psalm 23:1",       url: "https://www.bible.com/bible/111/PSA.23.1" },
  { ref: "proverbs 3:5-6",   url: "https://www.bible.com/bible/111/PRO.3.5" },
  { ref: "joshua 1:9",       url: "https://www.bible.com/bible/111/JOS.1.9" },
  { ref: "john 3:16",        url: "https://www.bible.com/bible/111/JHN.3.16" },
  { ref: "romans 8:28",      url: "https://www.bible.com/bible/111/ROM.8.28" },
  { ref: "philippians 4:6-7",url: "https://www.bible.com/bible/111/PHP.4.6" },
  { ref: "psalm 27:1",       url: "https://www.bible.com/bible/111/PSA.27.1" },
  { ref: "matthew 11:28-30", url: "https://www.bible.com/bible/111/MAT.11.28" },
  { ref: "isaiah 40:31",     url: "https://www.bible.com/bible/111/ISA.40.31" },
  { ref: "proverbs 18:10",   url: "https://www.bible.com/bible/111/PRO.18.10" },
  { ref: "psalm 46:10",      url: "https://www.bible.com/bible/111/PSA.46.10" },
  { ref: "psalm 23:4",       url: "https://www.bible.com/bible/111/PSA.23.4" },
  { ref: "ephesians 2:8-9",  url: "https://www.bible.com/bible/111/EPH.2.8" },
  { ref: "psalm 37:4",       url: "https://www.bible.com/bible/111/PSA.37.4" },
  { ref: "john 15:13",       url: "https://www.bible.com/bible/111/JHN.15.13" },
  { ref: "matthew 5:16",     url: "https://www.bible.com/bible/111/MAT.5.16" },
  { ref: "romans 8:38-39",   url: "https://www.bible.com/bible/111/ROM.8.38" },
  { ref: "psalm 119:105",    url: "https://www.bible.com/bible/111/PSA.119.105" },
  { ref: "galatians 5:22-23",url: "https://www.bible.com/bible/111/GAL.5.22" },
  { ref: "2 timothy 1:7",    url: "https://www.bible.com/bible/111/2TI.1.7" },
  { ref: "proverbs 3:5",     url: "https://www.bible.com/bible/111/PRO.3.5" },
  { ref: "isaiah 41:10",     url: "https://www.bible.com/bible/111/ISA.41.10" },
  { ref: "hebrews 11:1",     url: "https://www.bible.com/bible/111/HEB.11.1" },
];

// Cached daily verse — fetches once per day, reuses the rest of the day
async function setQuote() {
  const today = new Date().toDateString();
  const cached = JSON.parse(localStorage.getItem('lumina_verse') || 'null');

  if (cached && cached.date === today) {
    displayVerse(cached);
    return;
  }

  // Show loading state
  document.getElementById('quote-text').textContent = '…';
  document.getElementById('quote-author').textContent = '';

  const pick = VERSE_REFS[Math.floor(Math.random() * VERSE_REFS.length)];
  try {
    const res = await fetch(`https://bible-api.com/${encodeURIComponent(pick.ref)}?translation=web`);
    const data = await res.json();
    const verse = {
      date: today,
      text: data.text.trim().replace(/\s+/g, ' '),
      reference: data.reference,
      url: pick.url,
    };
    localStorage.setItem('lumina_verse', JSON.stringify(verse));
    displayVerse(verse);
  } catch {
    // Fallback if offline or API unavailable
    displayVerse({ text: "I can do all things through Christ who strengthens me.", reference: "Philippians 4:13", url: "https://www.bible.com/bible/111/PHP.4.13" });
  }
}

function displayVerse(v) {
  document.getElementById('quote-text').textContent = `"${v.text}"`;
  document.getElementById('quote-author').textContent = `— ${v.reference}`;
  document.getElementById('quote-link').href = v.url;
}

// ─── KEYBOARD SHORTCUTS ──────────────────────────
document.addEventListener('keydown', e => {
  const tag = document.activeElement?.tagName;
  const isEditing = tag === 'INPUT' || tag === 'TEXTAREA' || document.activeElement?.isContentEditable;
  if (e.key === '/' && !isEditing) {
    e.preventDefault();
    document.getElementById('search-input').focus();
    document.getElementById('search-input').select();
  }
  if (e.key === 'Escape') {
    hideModal();
    hideExportModal();
    hideBmModal();
    closeSaveModal();
    closeSettingsPanel();
    closeNotesPanel();
    closeHelpPanel();
  }
});

// ─── NOTES & SAVED LINKS ─────────────────────────

// Panel open/close
function openNotesPanel() {
  document.getElementById('notes-panel').classList.add('open');
  closeSettingsPanel();
  document.body.classList.add('notes-open');
  state.notesPanelOpen = true; saveState();
}
document.getElementById('notes-btn').addEventListener('click', openNotesPanel);
document.getElementById('notes-close-btn').addEventListener('click', closeNotesPanel);

function closeNotesPanel() {
  document.getElementById('notes-panel').classList.remove('open');
  document.body.classList.remove('notes-open');
  state.notesPanelOpen = false; saveState();
}

// Tab switching
document.querySelectorAll('.notes-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.notes-tab').forEach(t => t.classList.toggle('active', t === tab));
    document.getElementById('notes-tab-content').classList.toggle('active', tab.dataset.tab === 'notes');
    document.getElementById('saved-tab-content').classList.toggle('active', tab.dataset.tab === 'saved');
  });
});

// ── Tiptap notes editor ──────────────────────────────────────────────────────────────
const notesSource = document.getElementById('notes-source');
let tiptapEditor = null;
let _notesReady = false; // guard: skip saves during initial setContent

{
  const el = document.getElementById('notes-editor');
  if (el && window.initTiptapEditor) {
    tiptapEditor = window.initTiptapEditor(el, {
      onChange: () => { saveNotes(); updateUndoBtn(); },
      onSave:   () => { saveNotes(); flushSyncNow(); },
    });
  }
}

function updateUndoBtn() {
  const btn = document.getElementById('undo-note-btn');
  if (!btn) return;
  const canUndo = tiptapEditor ? tiptapEditor.can().undo() : false;
  btn.disabled = !canUndo;
  btn.style.opacity = canUndo ? '' : '0.35';
}

// ── Source mode ──
let notesSourceMode = false;

function enterSourceMode() {
  saveNotes();
  const note = state.notes?.find(n => n.id === state.activeNoteId);
  if (notesSource) notesSource.value = note?.content ?? '';
  document.getElementById('notes-editor').style.display = 'none';
  if (notesSource) notesSource.style.display = 'block';
  notesSourceMode = true;
  document.getElementById('source-btn')?.classList.add('active');
  document.querySelectorAll('#notes-toolbar .md-btn[data-cmd]').forEach(b => b.disabled = true);
}

function exitSourceMode() {
  const note = state.notes?.find(n => n.id === state.activeNoteId);
  if (note && notesSource) {
    note.content = notesSource.value;
    _notesReady = false;
    tiptapEditor?.commands.setContent(note.content);
    _notesReady = true;
    saveState();
  }
  if (notesSource) notesSource.style.display = 'none';
  document.getElementById('notes-editor').style.display = '';
  notesSourceMode = false;
  document.getElementById('source-btn')?.classList.remove('active');
  document.querySelectorAll('#notes-toolbar .md-btn[data-cmd]').forEach(b => b.disabled = false);
}

function saveNotes() {
  if (!_notesReady) return;
  const note = state.notes?.find(n => n.id === state.activeNoteId);
  if (note) {
    if (notesSourceMode && notesSource) {
      note.content = notesSource.value;
    } else if (tiptapEditor) {
      note.content = tiptapEditor.storage.markdown.getMarkdown();
    }
  }
  saveState({ skipSchedule: true }); // only push to Obsidian on Cmd+S or tab close
}

function renderNoteTabs() {
  const row = document.getElementById('note-tabs-row');
  if (!row) return;
  row.innerHTML = '';
  state.notes.forEach(note => {
    const btn = document.createElement('button');
    btn.className = 'note-tab-btn' + (note.id === state.activeNoteId ? ' active' : '');
    const titleSpan = document.createElement('span');
    titleSpan.textContent = note.title;
    titleSpan.title = 'Double-click to rename';
    btn.appendChild(titleSpan);
    if (state.notes.length > 1) {
      const del = document.createElement('button');
      del.className = 'note-tab-del';
      del.title = 'Delete note';
      del.textContent = '×';
      del.addEventListener('click', e => { e.stopPropagation(); deleteNote(note.id); });
      btn.appendChild(del);
    }

    function startRename() {
      if (btn.querySelector('.note-tab-rename-input')) return; // already renaming
      const input = document.createElement('input');
      input.value = note.title;
      input.className = 'note-tab-rename-input';
      input.style.width = Math.max(40, note.title.length * 7) + 'px';
      titleSpan.replaceWith(input);
      input.focus();
      input.select();
      let committed = false;
      function commit() {
        if (committed) return;
        committed = true;
        const val = input.value.trim();
        if (!val || val === note.title) { input.replaceWith(titleSpan); return; }
        if (state.notes.some(n => n.id !== note.id && n.title === val)) {
          committed = false;
          showToast(`A note named "${val}" already exists`);
          input.focus(); input.select(); return;
        }
        note.title = val;
        titleSpan.textContent = val;
        input.replaceWith(titleSpan);
        saveState();
      }
      input.addEventListener('blur', commit);
      input.addEventListener('keydown', ev => {
        if (ev.key === 'Enter') { ev.preventDefault(); input.blur(); }
        if (ev.key === 'Escape') { committed = true; input.replaceWith(titleSpan); }
      });
    }

    let clickTimer = null;
    btn.addEventListener('click', e => {
      if (btn.querySelector('.note-tab-rename-input')) return;
      if (clickTimer) {
        clearTimeout(clickTimer);
        clickTimer = null;
        startRename();
      } else {
        clickTimer = setTimeout(() => { clickTimer = null; switchNote(note.id); }, 250);
      }
    });
    row.appendChild(btn);
  });
  const addBtn = document.createElement('button');
  addBtn.className = 'note-tab-add';
  addBtn.title = 'Add note';
  addBtn.textContent = '+';
  addBtn.addEventListener('click', addNote);
  row.appendChild(addBtn);
}

function switchNote(id) {
  saveNotes();
  state.activeNoteId = id;
  const note = state.notes.find(n => n.id === id);
  if (notesSourceMode && notesSource) {
    notesSource.value = note?.content ?? '';
  } else if (tiptapEditor) {
    _notesReady = false;
    tiptapEditor.commands.setContent(note?.content ?? '');
    _notesReady = true;
  }
  saveState();
  renderNoteTabs();
  updateUndoBtn();
}

function uniqueNoteName(base) {
  const titles = new Set((state.notes || []).map(n => n.title));
  if (!titles.has(base)) return base;
  let i = 1;
  while (titles.has(`${base} ${i}`)) i++;
  return `${base} ${i}`;
}

function addNote() {
  saveNotes();
  const id = 'note-' + Date.now();
  const title = uniqueNoteName('untitled');
  state.notes.push({ id, title, content: '' });
  state.activeNoteId = id;
  _notesReady = false;
  tiptapEditor?.commands.setContent('');
  _notesReady = true;
  saveState();
  renderNoteTabs();
  tiptapEditor?.commands.focus();
}

function deleteNote(id) {
  if (state.notes.length <= 1) return;
  if (!confirm('Delete this note?')) return;
  const idx = state.notes.findIndex(n => n.id === id);
  const deleted = state.notes[idx];
  state.notes.splice(idx, 1);
  if (state.activeNoteId === id) {
    state.activeNoteId = state.notes[Math.max(0, idx - 1)].id;
  }
  const note = state.notes.find(n => n.id === state.activeNoteId);
  if (tiptapEditor) {
    _notesReady = false;
    tiptapEditor.commands.setContent(note?.content ?? '');
    _notesReady = true;
  }
  saveState();
  renderNoteTabs();
  clearSyncSnapshot(id);
  if (deleted && isSyncConfigured()) {
    const path = deleted.vaultPath || noteVaultPath(deleted);
    obsidianDelete(path).then(r => { if (!r.ok && r.status !== 404) showToast(`⚠ Delete note: ${r.status}`); }).catch(() => {});
  }
}

function htmlToMarkdown(html) {
  const div = document.createElement('div');
  div.innerHTML = html;
  function nodeToMd(node) {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent;
    if (node.nodeType !== Node.ELEMENT_NODE) return '';
    const tag = node.tagName?.toLowerCase();
    const inner = Array.from(node.childNodes).map(nodeToMd).join('');
    switch (tag) {
      case 'b': case 'strong': return `**${inner}**`;
      case 'i': case 'em': return `*${inner}*`;
      case 's': case 'del': case 'strike': return `~~${inner}~~`;
      case 'h1': return `\n# ${inner}\n`;
      case 'h2': return `\n## ${inner}\n`;
      case 'h3': return `\n### ${inner}\n`;
      case 'p': return inner.replace(/\s/g, '') ? inner.trimEnd() + '\n\n' : '\n';
      case 'code': return `\`${inner}\``;
      case 'br': return '\n';
      case 'li': return `- ${inner.trimEnd()}\n`;
      case 'ul': return inner.split('\n').filter(Boolean).map(l => l.startsWith('- ') ? l : `- ${l}`).join('\n') + '\n';
      case 'a': return `[${inner}](${node.href})`;
      case 'span': return inner;
      case 'button': return '';
      case 'div': {
        if (node.classList?.contains('check-item')) {
          const checked = node.dataset.checked === 'true';
          const textEl = node.querySelector('.check-text');
          const text = (textEl?.textContent || '').replace(/\u200b/g, '').trim();
          return `- [${checked ? 'x' : ' '}] ${text}\n`;
        }
        return inner + (inner.endsWith('\n') ? '' : '\n');
      }
      default: return inner + (inner.endsWith('\n') ? '' : '\n');
    }
  }
  return Array.from(div.childNodes).map(nodeToMd).join('').replace(/\n{3,}/g, '\n\n').trim();
}

function loadNotes() {
  if (!state.notes?.length) {
    state.notes = [{ id: 'note-1', title: 'Note 1', content: '' }];
    state.activeNoteId = 'note-1';
  }
  const note = state.notes.find(n => n.id === state.activeNoteId) || state.notes[0];
  state.activeNoteId = note.id;
  let content = note.content ?? '';
  // Migrate old HTML-stored notes to markdown
  if (content && content.trimStart().startsWith('<')) {
    note.content = htmlToMarkdown(content);
    content = note.content;
    saveState();
  }
  if (tiptapEditor) {
    _notesReady = false;
    tiptapEditor.commands.setContent(content);
    _notesReady = true;
  }
  updateUndoBtn();
  renderNoteTabs();
}

// Source textarea: save on input, Cmd+S flushes
if (notesSource) notesSource.addEventListener('input', saveNotes);
if (notesSource) notesSource.addEventListener('keydown', e => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
    e.preventDefault();
    saveNotes();
    flushSyncNow();
  }
});

// Toolbar commands via Tiptap API
function applyCmd(cmd) {
  if (!tiptapEditor) return;
  const ch = tiptapEditor.chain().focus();
  switch (cmd) {
    case 'bold':         ch.toggleBold().run(); break;
    case 'italic':       ch.toggleItalic().run(); break;
    case 'underline':    ch.toggleUnderline().run(); break;
    case 'strike':       ch.toggleStrike().run(); break;
    case 'highlight':    ch.toggleHighlight().run(); break;
    case 'h1':           ch.toggleHeading({ level: 1 }).run(); break;
    case 'h2':           ch.toggleHeading({ level: 2 }).run(); break;
    case 'h3':           ch.toggleHeading({ level: 3 }).run(); break;
    case 'code':         ch.toggleCode().run(); break;
    case 'codeblock':    ch.toggleCodeBlock().run(); break;
    case 'blockquote':   ch.toggleBlockquote().run(); break;
    case 'list':         ch.toggleBulletList().run(); break;
    case 'olist':        ch.toggleOrderedList().run(); break;
    case 'check':        ch.toggleTaskList().run(); break;
    case 'sub':          ch.toggleSubscript().run(); break;
    case 'sup':          ch.toggleSuperscript().run(); break;
    case 'align-left':   ch.setTextAlign('left').run(); break;
    case 'align-center': ch.setTextAlign('center').run(); break;
    case 'align-right':  ch.setTextAlign('right').run(); break;
    case 'link': {
      const prev = tiptapEditor.getAttributes('link').href ?? '';
      const url = window.prompt('URL:', prev || 'https://');
      if (url === null) { tiptapEditor.commands.focus(); break; }
      if (!url) { ch.unsetLink().run(); break; }
      ch.setLink({ href: url }).run();
      break;
    }
  }
}

document.querySelectorAll('.md-btn[data-cmd]').forEach(btn => {
  btn.addEventListener('click', () => applyCmd(btn.dataset.cmd));
});

document.getElementById('undo-note-btn').addEventListener('click', () => {
  tiptapEditor?.chain().focus().undo().run();
  updateUndoBtn();
});

document.getElementById('source-btn').addEventListener('click', () => {
  if (notesSourceMode) exitSourceMode(); else enterSourceMode();
});

document.getElementById('clear-checked-btn').addEventListener('click', () => {
  if (!tiptapEditor) return;
  const md = tiptapEditor.storage.markdown.getMarkdown();
  let count = 0;
  const filtered = md.split('\n').filter(line => {
    if (/^- \[x\] /i.test(line.trim())) { count++; return false; }
    return true;
  }).join('\n');
  if (!count) { showToast('No completed tasks to clear'); return; }
  _notesReady = false;
  tiptapEditor.commands.setContent(filtered);
  _notesReady = true;
  saveNotes();
  showToast(`✓ Cleared ${count} completed task${count > 1 ? 's' : ''}`);
});

document.getElementById('copy-md-btn').addEventListener('click', () => {
  const md = tiptapEditor ? tiptapEditor.storage.markdown.getMarkdown() : '';
  navigator.clipboard.writeText(md)
    .then(() => showToast('✓ Copied as Markdown'))
    .catch(() => showToast('Could not access clipboard'));
});

document.getElementById('copy-notes-btn').addEventListener('click', () => {
  const html = tiptapEditor ? tiptapEditor.getHTML() : '';
  const plain = tiptapEditor ? tiptapEditor.storage.markdown.getMarkdown() : '';
  try {
    const item = new ClipboardItem({
      'text/html': new Blob([html], { type: 'text/html' }),
      'text/plain': new Blob([plain], { type: 'text/plain' }),
    });
    navigator.clipboard.write([item])
      .then(() => showToast('✓ Copied — paste into Apple Notes'))
      .catch(() => showToast('Could not access clipboard'));
  } catch {
    navigator.clipboard.writeText(plain)
      .then(() => showToast('✓ Copied — paste into Apple Notes'))
      .catch(() => showToast('Could not access clipboard'));
  }
});

// Keyboard shortcuts handled in tiptap-bundle.js (Cmd+B/I/U/1/2/3/E/L/⇧C/⇧X/K/S)
// Source textarea Cmd+S handled above

loadNotes();

// ─── TOAST ───────────────────────────────────────
function showToast(msg) {
  let t = document.getElementById('lumina-toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'lumina-toast'; t.className = 'toast';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('show'), 2200);
}

// ─── EXPORT ──────────────────────────────────────
let exportFmt = 'markdown';

function linksToMarkdown() {
  const lines = ['# Quick Links', ''];
  state.links.forEach(l => {
    lines.push(`- [${l.label || getUrlLabel(l.url)}](${l.url})`);
  });
  return lines.join('\n');
}

function linksToAppleNotes() {
  // Apple Notes plain-text friendly: title + dashes + url per line
  const lines = ['Quick Links', '—————————————', ''];
  state.links.forEach(l => {
    const label = l.label || getUrlLabel(l.url);
    lines.push(`${label}`);
    lines.push(`${l.url}`);
    lines.push('');
  });
  return lines.join('\n');
}

function linksToPlain() {
  return state.links.map(l => {
    const label = l.label || getUrlLabel(l.url);
    return `${label} — ${l.url}`;
  }).join('\n');
}

function getExportText(fmt) {
  if (fmt === 'markdown') return linksToMarkdown();
  if (fmt === 'apple-notes') return linksToAppleNotes();
  return linksToPlain();
}

function openExportModal() {
  exportFmt = 'markdown';
  document.querySelectorAll('.export-tab').forEach(t => t.classList.toggle('active', t.dataset.fmt === exportFmt));
  document.getElementById('export-output').value = getExportText(exportFmt);
  const m = document.getElementById('export-modal');
  m.style.display = 'flex';
  m.classList.remove('closing');
  m.querySelector('.modal').classList.remove('closing');
}

function hideExportModal() {
  const m = document.getElementById('export-modal');
  if (m.style.display === 'none') return;
  m.classList.add('closing');
  m.querySelector('.modal').classList.add('closing');
  setTimeout(() => { m.style.display = 'none'; }, 200);
}

document.getElementById('export-btn').addEventListener('click', openExportModal);
document.getElementById('export-close').addEventListener('click', hideExportModal);
document.getElementById('export-modal').addEventListener('click', e => {
  if (e.target === document.getElementById('export-modal')) hideExportModal();
});

document.querySelectorAll('.export-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    exportFmt = tab.dataset.fmt;
    document.querySelectorAll('.export-tab').forEach(t => t.classList.toggle('active', t.dataset.fmt === exportFmt));
    document.getElementById('export-output').value = getExportText(exportFmt);
  });
});

document.getElementById('export-copy-btn').addEventListener('click', () => {
  const text = document.getElementById('export-output').value;
  navigator.clipboard.writeText(text).then(() => {
    const toast = document.getElementById('export-copy-toast');
    toast.style.display = 'block';
    setTimeout(() => { toast.style.display = 'none'; }, 1600);
    showToast(exportFmt === 'apple-notes' ? '✓ Copied — paste into Apple Notes!' : '✓ Copied to clipboard');
  }).catch(() => {
    document.getElementById('export-output').select();
    document.execCommand('copy');
    showToast('✓ Copied!');
  });
});

// ─── BOOKMARK SYNC ───────────────────────────────
let bmFolderContents = []; // preview cache

function hideBmModal() {
  const m = document.getElementById('bm-modal');
  if (m.style.display === 'none') return;
  m.classList.add('closing');
  m.querySelector('.modal').classList.add('closing');
  setTimeout(() => { m.style.display = 'none'; }, 200);
}

async function openBmModal() {
  const m = document.getElementById('bm-modal');
  m.style.display = 'flex';
  m.classList.remove('closing');
  m.querySelector('.modal').classList.remove('closing');

  // Sync toggle state
  const autoToggle = document.getElementById('toggle-bm-autosync');
  autoToggle.classList.toggle('on', !!state.bmAutoSync);
  autoToggle.onclick = () => {
    state.bmAutoSync = !state.bmAutoSync;
    autoToggle.classList.toggle('on', state.bmAutoSync);
    saveState();
  };
  const mergeToggle = document.getElementById('toggle-bm-merge');
  mergeToggle.classList.toggle('on', state.bmMerge !== false);
  mergeToggle.onclick = () => {
    state.bmMerge = !mergeToggle.classList.contains('on');
    mergeToggle.classList.toggle('on', state.bmMerge);
    saveState();
  };

  await loadBookmarkFolders();
}

async function loadBookmarkFolders() {
  const sel = document.getElementById('bm-folder-select');
  sel.innerHTML = '<option value="">Loading…</option>';

  if (!chrome?.bookmarks) {
    sel.innerHTML = '<option value="">Bookmarks API not available</option>';
    return;
  }

  try {
    const tree = await chrome.bookmarks.getTree();
    const folders = [];

    function walk(node, path) {
      if (!node.url && node.id !== '0') { // it's a folder
        if (node.id !== '0') folders.push({ id: node.id, label: path || node.title });
      }
      (node.children || []).forEach(child => {
        const childPath = path ? `${path} / ${child.title}` : child.title;
        walk(child, childPath);
      });
    }
    tree.forEach(root => walk(root, ''));

    sel.innerHTML = '<option value="">— Choose a folder —</option>';
    folders.forEach(f => {
      const opt = document.createElement('option');
      opt.value = f.id;
      opt.textContent = f.label;
      if (state.bmFolderId === f.id) opt.selected = true;
      sel.appendChild(opt);
    });

    if (state.bmFolderId) loadBmPreview(state.bmFolderId);
  } catch (e) {
    sel.innerHTML = '<option value="">Error loading bookmarks</option>';
  }
}

async function loadBmPreview(folderId) {
  const previewWrap = document.getElementById('bm-preview');
  const previewList = document.getElementById('bm-preview-list');
  previewList.innerHTML = '';
  bmFolderContents = [];

  if (!folderId || !chrome?.bookmarks) { previewWrap.style.display = 'none'; return; }

  try {
    const children = await chrome.bookmarks.getChildren(folderId);
    const directBookmarks = children.filter(c => c.url);
    const subfolders = children.filter(c => !c.url);
    bmFolderContents = directBookmarks;

    if (!directBookmarks.length && !subfolders.length) {
      previewWrap.style.display = 'none'; return;
    }

    previewWrap.style.display = 'block';

    // Show direct bookmarks (up to 6)
    directBookmarks.slice(0, 6).forEach(bm => {
      const item = document.createElement('div');
      item.className = 'bm-preview-item';
      const faviconUrl = getFaviconGoogleUrl(bm.url);
      item.innerHTML = `
        ${faviconUrl ? `<img src="${faviconUrl}" alt="" onerror="this.style.display='none'"/>` : ''}
        <span><strong style="color:var(--text)">${escHtml(bm.title || getUrlLabel(bm.url))}</strong> &mdash; ${escHtml(getUrlLabel(bm.url))}</span>
      `;
      previewList.appendChild(item);
    });
    if (directBookmarks.length > 6) {
      const more = document.createElement('div');
      more.className = 'bm-preview-item';
      more.style.justifyContent = 'center';
      more.innerHTML = `<span>+${directBookmarks.length - 6} more links</span>`;
      previewList.appendChild(more);
    }

    // Show subfolders as section previews
    if (subfolders.length) {
      const divider = document.createElement('div');
      divider.style.cssText = 'font-size:10px;color:var(--text-muted);padding:4px 0 2px;opacity:0.7;';
      divider.textContent = `📁 ${subfolders.length} subfolder${subfolders.length > 1 ? 's' : ''} → each becomes a section`;
      previewList.appendChild(divider);
      subfolders.forEach(folder => {
        const row = document.createElement('div');
        row.className = 'bm-preview-item';
        row.innerHTML = `<span>📁 <strong style="color:var(--text)">${escHtml(folder.title)}</strong></span>`;
        previewList.appendChild(row);
      });
    }
  } catch (e) {
    previewWrap.style.display = 'none';
  }
}

document.getElementById('bm-folder-select').addEventListener('change', e => {
  loadBmPreview(e.target.value);
});

document.getElementById('bm-sync-btn').addEventListener('click', openBmModal);
document.getElementById('bm-cancel').addEventListener('click', hideBmModal);
document.getElementById('bm-modal').addEventListener('click', e => {
  if (e.target === document.getElementById('bm-modal')) hideBmModal();
});

document.getElementById('bm-apply').addEventListener('click', async () => {
  const folderId = document.getElementById('bm-folder-select').value;
  if (!folderId) { showToast('Please select a folder first'); return; }

  state.bmFolderId = folderId;
  saveState();

  const result = await applyBmSync();
  hideBmModal();
  if (result) {
    const { linkCount, sectionCount } = result;
    const sectionNote = sectionCount > 1 ? ` across ${sectionCount} sections` : '';
    showToast(`✓ Synced ${linkCount} link${linkCount !== 1 ? 's' : ''}${sectionNote} from bookmarks`);
  }
  document.getElementById('bm-sync-badge').style.display = '';
});

async function applyBmSync() {
  if (!state.bmFolderId || !chrome?.bookmarks) return;
  try {
    const children = await chrome.bookmarks.getChildren(state.bmFolderId);
    const [folderNode] = await chrome.bookmarks.get(state.bmFolderId);
    const rootName = folderNode?.title || 'Bookmarks';

    const newSections = [];
    const newLinks = [];

    // Direct bookmark children → section named after the root folder
    const directBookmarks = children.filter(c => c.url);
    if (directBookmarks.length) {
      const sectionId = 'bms-' + state.bmFolderId;
      newSections.push({ id: sectionId, label: rootName, fromBookmark: true });
      directBookmarks.forEach(bm => newLinks.push({
        id: 'bm-' + bm.id, url: bm.url,
        label: bm.title || getUrlLabel(bm.url),
        favicon: null, section: sectionId, fromBookmark: true,
      }));
    }

    // Subfolders → one section each
    const subfolders = children.filter(c => !c.url);
    for (const folder of subfolders) {
      const subChildren = await chrome.bookmarks.getChildren(folder.id);
      const subBookmarks = subChildren.filter(c => c.url);
      if (!subBookmarks.length) continue;
      const sectionId = 'bms-' + folder.id;
      newSections.push({ id: sectionId, label: folder.title, fromBookmark: true });
      subBookmarks.forEach(bm => newLinks.push({
        id: 'bm-' + bm.id, url: bm.url,
        label: bm.title || getUrlLabel(bm.url),
        favicon: null, section: sectionId, fromBookmark: true,
      }));
    }

    // Preserve custom display settings from existing bookmark links
    const existingById = new Map(state.links.map(l => [l.id, l]));
    for (const link of newLinks) {
      const existing = existingById.get(link.id);
      if (existing?.icon) link.icon = existing.icon;
      if (existing?.noFavicon) link.noFavicon = existing.noFavicon;
      if (existing?.faviconBg) link.faviconBg = existing.faviconBg;
    }

    if (state.bmMerge !== false) {
      const manualLinks = state.links.filter(l => !l.fromBookmark);
      const manualSections = (state.qlSections || []).filter(s => !s.fromBookmark);
      state.links = [...manualLinks, ...newLinks];
      state.qlSections = [...manualSections, ...newSections];
    } else {
      state.links = newLinks;
      state.qlSections = newSections.length ? newSections : [{ id: 'default', label: 'Quick Links' }];
    }

    if (!state.qlSections?.length) state.qlSections = [{ id: 'default', label: 'Quick Links' }];

    saveState();
    renderLinks();
    return { linkCount: newLinks.length, sectionCount: newSections.length };
  } catch(e) {
    console.warn('Bookmark sync failed', e);
  }
}

// ─── SAVED LINKS ──────────────────────────────────
const TAG_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#14b8a6', '#3b82f6', '#a78bfa', '#ec4899',
];

let savedData = { links: [], tags: [] };
let savedFilter = 'all';
let savedSort = 'date'; // 'date' | 'title'
let selectedTagsForSave = [];
let selectedTagColor = TAG_COLORS[6];
let editingLinkId = null;

async function loadSavedLinks() {
  if (typeof chrome !== 'undefined' && chrome.storage) {
    try {
      const result = await chrome.storage.local.get('lumina_saved');
      if (result.lumina_saved) savedData = result.lumina_saved;
      return;
    } catch (e) { /* fall through */ }
  }
  const raw = localStorage.getItem('lumina_saved');
  if (raw) try { savedData = JSON.parse(raw); } catch (e) {}
}

async function persistSavedLinks() {
  if (typeof chrome !== 'undefined' && chrome.storage) {
    try { await chrome.storage.local.set({ lumina_saved: savedData }); }
    catch (e) { localStorage.setItem('lumina_saved', JSON.stringify(savedData)); }
  } else {
    localStorage.setItem('lumina_saved', JSON.stringify(savedData));
  }
  schedulePush();
}

const SAVED_FAVICON_BG = {
  white:       'rgba(255,255,255,0.92)',
  dark:        'rgba(20,15,40,0.75)',
  transparent: 'transparent',
};

function applySavedFaviconBg(val) {
  val = val || 'white';
  state.savedFaviconBg = val;
  document.documentElement.style.setProperty('--saved-favicon-bg', SAVED_FAVICON_BG[val] || SAVED_FAVICON_BG.white);
  document.querySelectorAll('.fav-bg-btn').forEach(b => b.classList.toggle('active', b.dataset.bg === val));
}

function renderSavedFilters() {
  const container = document.getElementById('saved-filters');
  container.innerHTML = '';

  const allChip = document.createElement('button');
  allChip.className = 'saved-filter-chip';
  allChip.textContent = 'All';
  if (savedFilter === 'all') {
    allChip.style.cssText = 'background:rgba(167,139,250,0.2);border-color:rgba(167,139,250,0.4);color:white';
  }
  allChip.addEventListener('click', () => { savedFilter = 'all'; renderSavedFilters(); renderSavedList(); });
  container.appendChild(allChip);

  savedData.tags.forEach(tag => {
    const chip = document.createElement('button');
    chip.className = 'saved-filter-chip';
    if (savedFilter === tag.name) {
      chip.style.cssText = `background:${tag.color}33;border-color:${tag.color}88;color:${tag.color}`;
    }
    const dot = document.createElement('span');
    dot.style.cssText = `width:7px;height:7px;border-radius:50%;background:${tag.color};flex-shrink:0`;
    chip.appendChild(dot);
    chip.appendChild(document.createTextNode(tag.name));
    chip.addEventListener('click', () => {
      savedFilter = (savedFilter === tag.name) ? 'all' : tag.name;
      renderSavedFilters();
      renderSavedList();
    });
    container.appendChild(chip);
  });
}

function renderSavedList() {
  const list = document.getElementById('saved-list');
  list.innerHTML = '';

  let links = savedData.links;
  if (savedFilter !== 'all') {
    links = links.filter(l => l.tags && l.tags.includes(savedFilter));
  }

  if (!links.length) {
    const empty = document.createElement('div');
    empty.id = 'saved-empty';
    if (savedFilter === 'all') {
      empty.innerHTML = 'No saved links yet.<br><small style="opacity:0.6">Use the bookmark button in any tab to save from anywhere.</small>';
    } else {
      empty.innerHTML = `No links tagged <strong>${escHtml(savedFilter)}</strong>.`;
    }
    list.appendChild(empty);
    return;
  }

  const sorted = [...links].sort((a, b) => savedSort === 'title'
    ? (a.title || '').localeCompare(b.title || '')
    : (b.savedAt || 0) - (a.savedAt || 0));

  sorted.forEach((link, idx) => {
    const item = document.createElement('a');
    item.className = 'saved-item';
    item.href = link.url;
    item.target = '_blank';
    item.rel = 'noopener';
    item.style.animationDelay = `${idx * 0.03}s`;

    const savedFaviconHtml = faviconImgHtml(link.url, link.title, 'saved-item-favicon');
    const tagsHtml = (link.tags || []).map(tagName => {
      const tag = savedData.tags.find(t => t.name === tagName);
      const color = tag ? tag.color : '#a78bfa';
      return `<span class="saved-tag-chip" style="background:${color}22;color:${color};border-color:${color}44">${escHtml(tagName)}</span>`;
    }).join('');

    item.innerHTML = `
      ${savedFaviconHtml}
      <div class="saved-item-info">
        <div class="saved-item-title">${escHtml(link.title || getUrlLabel(link.url))}</div>
        <div class="saved-item-domain">${escHtml(getUrlLabel(link.url))}</div>
        ${tagsHtml ? `<div class="saved-item-tags">${tagsHtml}</div>` : ''}
      </div>
      <div class="saved-item-actions">
        <button class="saved-item-edit" title="Edit tags">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
        </button>
        <button class="saved-item-copy" title="Copy URL">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
        </button>
        <button class="saved-item-delete" title="Remove">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
        </button>
      </div>
    `;

    item.querySelector('.saved-item-edit').addEventListener('click', e => {
      e.preventDefault();
      e.stopPropagation();
      openSaveModal({ id: link.id, url: link.url, title: link.title, tags: link.tags });
    });
    item.querySelector('.saved-item-copy').addEventListener('click', e => {
      e.preventDefault();
      e.stopPropagation();
      navigator.clipboard.writeText(link.url).then(() => showCopyToast());
    });
    item.querySelector('.saved-item-delete').addEventListener('click', e => {
      e.preventDefault();
      e.stopPropagation();
      savedData.links = savedData.links.filter(l => l.id !== link.id);
      persistSavedLinks();
      renderSavedList();
    });

    list.appendChild(item);
  });
}

// ── Save link modal ──────────────────────────────
function openSaveModal(prefill = {}) {
  editingLinkId = prefill.id || null;
  selectedTagsForSave = Array.isArray(prefill.tags) ? [...prefill.tags] : [];
  selectedTagColor = TAG_COLORS[6];
  document.getElementById('saved-modal-url').value = prefill.url || '';
  document.getElementById('saved-modal-title').value = prefill.title || '';
  document.getElementById('saved-modal-heading').textContent = editingLinkId ? 'Edit Link' : 'Save Link';
  document.getElementById('saved-modal-save').textContent = editingLinkId ? 'Save Changes' : 'Save Link';
  renderSaveTagSelector();

  const m = document.getElementById('saved-modal');
  m.style.display = 'flex';
  m.classList.remove('closing');
  m.querySelector('.modal').classList.remove('closing');
  setTimeout(() => {
    const urlEl = document.getElementById('saved-modal-url');
    (urlEl.value ? document.getElementById('saved-modal-title') : urlEl).focus();
  }, 50);
}

function closeSaveModal() {
  const m = document.getElementById('saved-modal');
  m.classList.add('closing');
  m.querySelector('.modal').classList.add('closing');
  setTimeout(() => { m.style.display = 'none'; }, 200);
  editingLinkId = null;
}

function renderSaveTagSelector() {
  const tagList = document.getElementById('saved-tag-list');
  tagList.innerHTML = '';
  savedData.tags.forEach(tag => {
    const btn = document.createElement('button');
    btn.className = 'tag-toggle' + (selectedTagsForSave.includes(tag.name) ? ' selected' : '');
    btn.style.cssText = `background:${tag.color}22;color:${tag.color};border-color:${tag.color}66`;
    btn.textContent = tag.name;
    btn.type = 'button';
    btn.addEventListener('click', () => {
      const idx = selectedTagsForSave.indexOf(tag.name);
      if (idx >= 0) selectedTagsForSave.splice(idx, 1);
      else selectedTagsForSave.push(tag.name);
      renderSaveTagSelector();
    });
    tagList.appendChild(btn);
  });

  const swatchRow = document.getElementById('saved-tag-colors');
  swatchRow.innerHTML = '';
  TAG_COLORS.forEach(color => {
    const swatch = document.createElement('button');
    swatch.className = 'tag-color-swatch' + (selectedTagColor === color ? ' selected' : '');
    swatch.style.background = color;
    swatch.type = 'button';
    swatch.addEventListener('click', () => { selectedTagColor = color; renderSaveTagSelector(); });
    swatchRow.appendChild(swatch);
  });
}

function addSaveTag() {
  const input = document.getElementById('saved-new-tag-input');
  const name = input.value.trim();
  if (!name) return;
  if (!savedData.tags.find(t => t.name === name)) {
    savedData.tags.push({ name, color: selectedTagColor });
  }
  if (!selectedTagsForSave.includes(name)) selectedTagsForSave.push(name);
  input.value = '';
  renderSaveTagSelector();
  renderSavedFilters();
}

document.getElementById('saved-add-btn').addEventListener('click', () => openSaveModal());

document.querySelectorAll('.saved-sort-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    savedSort = btn.dataset.sort;
    document.querySelectorAll('.saved-sort-btn').forEach(b => {
      const active = b.dataset.sort === savedSort;
      b.style.background = active ? 'rgba(167,139,250,0.15)' : 'var(--glass)';
      b.style.borderColor = active ? 'rgba(167,139,250,0.3)' : 'var(--glass-border)';
      b.style.color = active ? 'var(--text)' : 'var(--text-muted)';
    });
    renderSavedList();
  });
});

document.querySelectorAll('.fav-bg-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    applySavedFaviconBg(btn.dataset.bg);
    saveState();
  });
});
document.getElementById('saved-modal-cancel').addEventListener('click', closeSaveModal);
document.getElementById('saved-modal').addEventListener('click', e => {
  if (e.target === document.getElementById('saved-modal')) closeSaveModal();
});
document.getElementById('saved-new-tag-add').addEventListener('click', addSaveTag);
document.getElementById('saved-new-tag-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') { e.preventDefault(); addSaveTag(); }
});

document.getElementById('saved-modal-save').addEventListener('click', async () => {
  let url = document.getElementById('saved-modal-url').value.trim();
  let title = document.getElementById('saved-modal-title').value.trim();
  if (!url) { showToast('Please enter a URL'); return; }
  if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
  if (!title) title = getUrlLabel(url);

  if (editingLinkId) {
    const link = savedData.links.find(l => l.id === editingLinkId);
    if (link) {
      link.url = url;
      link.title = title;
      link.tags = [...selectedTagsForSave];
    }
  } else {
    savedData.links.push({
      id: 'sl-' + Date.now(),
      url, title,
      tags: [...selectedTagsForSave],
      savedAt: Date.now(),
    });
  }
  const wasEdit = !!editingLinkId;
  await persistSavedLinks();
  closeSaveModal();
  renderSavedFilters();
  renderSavedList();
  showToast(wasEdit ? '✓ Link updated' : '✓ Link saved');
});

// Listen for popup saves
if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.lumina_saved) {
      savedData = changes.lumina_saved.newValue || { links: [], tags: [] };
      renderSavedFilters();
      renderSavedList();
    }
  });
}

// ─── INIT ────────────────────────────────────────
// ─── OBSIDIAN LOCAL REST API SYNC ─────────────────
const OBSIDIAN_FOLDER = 'Lumina';
const OBSIDIAN_SETTINGS_FILE = `${OBSIDIAN_FOLDER}/.lumina-sync.json`;
let syncDebounceTimer = null;
let syncInProgress = false;
let vaultCheckInProgress = false;
let lastPullTime = 0;
let vaultCheckInterval = null;

// Sync snapshots: stores the content of each note at last successful sync
// Used for three-way merge to detect which side changed
function getSyncSnapshots() {
  try { return JSON.parse(localStorage.getItem('lumina_sync_snapshots') || '{}'); } catch { return {}; }
}
function saveSyncSnapshots(snapshots) {
  localStorage.setItem('lumina_sync_snapshots', JSON.stringify(snapshots));
}
function updateSyncSnapshot(noteId, content) {
  const s = getSyncSnapshots();
  s[noteId] = content.trim();
  saveSyncSnapshots(s);
}
function clearSyncSnapshot(noteId) {
  const s = getSyncSnapshots();
  delete s[noteId];
  saveSyncSnapshots(s);
}

function getSyncApiUrl() { return (localStorage.getItem('lumina_sync_api_url') || '').trim().replace(/\/+$/, ''); }
function getSyncApiKey() { return (localStorage.getItem('lumina_sync_api_key') || '').trim(); }
function isSyncConfigured() { return !!(getSyncApiUrl() && getSyncApiKey()); }

function setSyncStatus(msg) {
  const el = document.getElementById('sync-status');
  if (el) el.textContent = msg;
  setObsidianStatusText(msg);
}

function setObsidianStatus(state, msg) {
  const bar = document.getElementById('obsidian-status-bar');
  if (!bar) return;
  bar.className = state; // 'connected', 'disconnected', 'syncing', or ''
  const textEl = document.getElementById('obsidian-status-text');
  if (textEl && msg) textEl.textContent = msg;
}

function setObsidianStatusText(msg) {
  const textEl = document.getElementById('obsidian-status-text');
  if (textEl && msg) textEl.textContent = msg;
}

function obsidianHeaders() {
  return { Authorization: `Bearer ${getSyncApiKey()}`, 'Content-Type': 'text/markdown' };
}

function obsidianJsonHeaders() {
  return { Authorization: `Bearer ${getSyncApiKey()}`, 'Content-Type': 'application/json' };
}

function noteVaultPath(note) {
  const name = (note.title || note.id).replace(/[/\\?%*:|"<>#^[\]]/g, '-').trim() || note.id;
  return `${OBSIDIAN_FOLDER}/${name}.md`;
}

function obsidianVaultUrl(path) {
  // Encode each path segment individually — slashes must remain literal
  return getSyncApiUrl() + '/vault/' + path.split('/').map(s => encodeURIComponent(s)).join('/');
}

async function obsidianPut(path, content, contentType) {
  const url = obsidianVaultUrl(path);
  const resp = await fetch(url, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${getSyncApiKey()}`, 'Content-Type': contentType || 'text/markdown' },
    body: content,
  });
  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    throw new Error(`PUT ${path}: ${resp.status} ${text.slice(0, 80)}`);
  }
  return resp;
}

async function obsidianGet(path) {
  const url = obsidianVaultUrl(path);
  const resp = await fetch(url, {
    headers: { Authorization: `Bearer ${getSyncApiKey()}`, Accept: 'text/markdown' },
  });
  return resp;
}

async function obsidianDelete(path) {
  const url = obsidianVaultUrl(path);
  const resp = await fetch(url, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${getSyncApiKey()}` },
  });
  return resp;
}

async function obsidianList() {
  const url = obsidianVaultUrl(OBSIDIAN_FOLDER + '/');
  const resp = await fetch(url, {
    headers: { Authorization: `Bearer ${getSyncApiKey()}`, Accept: 'application/json' },
  });
  if (resp.status === 404) return [];
  if (!resp.ok) throw new Error(`List folder: ${resp.status}`);
  const data = await resp.json();
  return data.files || [];
}

function buildQuickLinksMarkdown() {
  const sections = state.qlSections || [{ id: 'default', label: 'Quick Links' }];
  const links = state.links || [];
  const grouped = new Map(sections.map(s => [s.id, []]));
  for (const link of links) {
    const bucket = grouped.get(link.section) || grouped.get('default') || [];
    bucket.push(link);
    if (!grouped.has(link.section)) grouped.set(link.section, bucket);
  }
  let md = '# Quick Links\n\n';
  for (const section of sections) {
    const items = grouped.get(section.id) || [];
    if (sections.length > 1) md += `## ${section.label}\n\n`;
    if (!items.length) { md += '_No links_\n\n'; continue; }
    for (const link of items) {
      md += `- [${link.label}](${link.url})\n`;
    }
    md += '\n';
  }
  return md.trimEnd() + '\n';
}

function buildSavedLinksMarkdown() {
  const links = savedData?.links || [];
  const tags = savedData?.tags || [];
  if (!links.length) return '# Saved Links\n\n_No saved links_\n';

  let md = '# Saved Links\n\n';

  // Group by tags
  const tagMap = new Map();
  const untagged = [];
  for (const link of links) {
    if (!link.tags?.length) { untagged.push(link); continue; }
    for (const tag of link.tags) {
      if (!tagMap.has(tag)) tagMap.set(tag, []);
      tagMap.get(tag).push(link);
    }
  }

  // Render tagged sections (in tag definition order)
  for (const tag of tags) {
    const items = tagMap.get(tag.name);
    if (!items?.length) continue;
    md += `## ${tag.name}\n\n`;
    for (const link of items) {
      md += `- [${link.title}](${link.url})\n`;
    }
    md += '\n';
  }

  // Render any tags not in the tags list
  for (const [tagName, items] of tagMap) {
    if (tags.find(t => t.name === tagName)) continue;
    md += `## ${tagName}\n\n`;
    for (const link of items) {
      md += `- [${link.title}](${link.url})\n`;
    }
    md += '\n';
  }

  // Render untagged
  if (untagged.length) {
    md += `## Untagged\n\n`;
    for (const link of untagged) {
      md += `- [${link.title}](${link.url})\n`;
    }
    md += '\n';
  }

  return md.trimEnd() + '\n';
}

function buildSyncPayload() {
  const stateForSync = { ...state };
  stateForSync.notes = (state.notes || []).map(n => ({ id: n.id, title: n.title, vaultPath: noteVaultPath(n) }));
  if (Array.isArray(state.wallpapers)) {
    stateForSync.wallpapers = state.wallpapers.map(w => ({ id: w.id, label: w.label, emoji: w.emoji }));
  }
  return JSON.stringify({ v: 2, ts: Date.now(), state: stateForSync, saved: savedData }, null, 2);
}

async function applySyncPayload(json, options) {
  const skipNoteContent = options?.skipNoteContent === true;
  const skipSave = options?.skipSave === true;
  let data;
  try { data = JSON.parse(json); } catch { return; }
  if (!data || (data.v !== 2 && data.v !== 1)) return;

  if (data.state) {
    const localWallpapers = state.wallpapers;
    Object.assign(state, data.state);
    if (!Array.isArray(state.addressBook)) state.addressBook = [];
    if (Array.isArray(state.wallpapers) && Array.isArray(localWallpapers)) {
      const byId = new Map(localWallpapers.map(w => [w.id, w]));
      state.wallpapers = state.wallpapers.map(w => {
        const local = byId.get(w.id);
        return local && (local.url || local.thumb)
          ? { ...w, url: local.url, thumb: local.thumb }
          : { ...w, url: w.url || '', thumb: w.thumb || '' };
      });
    }
    if (!skipNoteContent && Array.isArray(state.notes)) {
      state.notes = state.notes.map(n => ({ ...n, content: n.content ?? '' }));
    }
    if (!Array.isArray(state.notes) || !state.notes.length) {
      state.notes = [{ id: 'note-1', title: 'Note 1', content: '' }];
      state.activeNoteId = 'note-1';
    }
    if (!state.activeNoteId || !state.notes.find(n => n.id === state.activeNoteId)) {
      state.activeNoteId = state.notes[0].id;
    }
    renderLinks();
    syncSettings();
    applyVisibility();
    applyPanelTheme(state.panelTheme || 'dark');
    applyEngine(state.searchEngine || 'claude');
    if (!skipSave) { saveState(); loadNotes(); }
  }
  if (data.saved) {
    savedData = data.saved;
    if (typeof chrome !== 'undefined' && chrome.storage) {
      try { await chrome.storage.local.set({ lumina_saved: savedData }); } catch {}
    } else {
      localStorage.setItem('lumina_saved', JSON.stringify(savedData));
    }
    renderSavedFilters();
    renderSavedList();
  }
}

async function pushSync() {
  if (!isSyncConfigured()) return;
  if (syncInProgress) return;
  syncInProgress = true;
  setObsidianStatus('syncing', 'Pushing to Obsidian…');
  try {
    const notes = Array.isArray(state.notes) ? state.notes : [];

    // 1. Push each note as a .md file in the Lumina folder
    setObsidianStatus('syncing', `Pushing ${notes.length} note(s)…`);
    for (const note of notes) {
      const newPath = noteVaultPath(note);
      const oldPath = note.vaultPath;
      if (oldPath && oldPath !== newPath) {
        await obsidianDelete(oldPath).catch(() => {});
      }
      const content = (note.content ?? '').toString() || ' ';
      await obsidianPut(newPath, content);
      note.vaultPath = newPath;
    }

    // 2. Push quick links and saved links as markdown
    setObsidianStatus('syncing', 'Pushing links…');
    await obsidianPut(`${OBSIDIAN_FOLDER}/Quick Links.md`, buildQuickLinksMarkdown());
    await obsidianPut(`${OBSIDIAN_FOLDER}/Saved Links.md`, buildSavedLinksMarkdown());

    // 3. Push settings/state file
    setObsidianStatus('syncing', 'Pushing settings…');
    await obsidianPut(OBSIDIAN_SETTINGS_FILE, buildSyncPayload(), 'application/json');

    // Save sync snapshots so we can detect which side changed later
    for (const note of notes) {
      updateSyncSnapshot(note.id, (note.content ?? '').toString());
    }

    saveState({ skipSchedule: true });
    const t = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setSyncStatus(`Synced ${t}`);
    setObsidianStatus('connected', `Synced to Obsidian — ${t}`);
  } catch (err) {
    setSyncStatus(`Sync error: ${err.message}`);
    showToast(`⚠ ${err.message}`);
    setObsidianStatus('disconnected', `Sync failed — ${err.message.slice(0, 60)}`);
  } finally {
    syncInProgress = false;
  }
}

async function pullSync() {
  if (!isSyncConfigured()) return;
  try {
    setSyncStatus('Pulling from vault…');
    setObsidianStatus('syncing', 'Pulling from Obsidian…');

    // 1. List all .md files in the Lumina folder
    let vaultFiles;
    try { vaultFiles = await obsidianList(); } catch (err) {
      // Folder doesn't exist yet — do a first push
      if (err.message.includes('404')) { await pushSync(); return; }
      throw err;
    }

    // Exclude system files (Quick Links.md, Saved Links.md) from note import
    const SYSTEM_FILES = new Set([`${OBSIDIAN_FOLDER}/Quick Links.md`, `${OBSIDIAN_FOLDER}/Saved Links.md`]);
    const mdFiles = vaultFiles
      .filter(f => f.endsWith('.md') && !f.endsWith('/.md'))
      .map(f => f.startsWith(OBSIDIAN_FOLDER + '/') ? f : `${OBSIDIAN_FOLDER}/${f}`)
      .filter(f => !SYSTEM_FILES.has(f));

    // 2. Fetch settings file if it exists (for non-note state: links, wallpapers, etc.)
    let settingsJson = null;
    const settingsResp = await obsidianGet(OBSIDIAN_SETTINGS_FILE);
    if (settingsResp.ok) {
      settingsJson = await settingsResp.text();
      await applySyncPayload(settingsJson, { skipNoteContent: true, skipSave: true });
    } else if (settingsResp.status !== 404) {
      throw new Error(`Pull settings: ${settingsResp.status}`);
    }

    // 3. Build maps of what we know locally
    const localNotes = (state.notes || []).map(n => ({ ...n }));
    const localByPath = new Map(localNotes.filter(n => n.vaultPath).map(n => [n.vaultPath, n]));
    const localById = new Map(localNotes.map(n => [n.id, n]));
    const localActiveNoteId = state.activeNoteId;

    // Parse remote note metadata for id ↔ path mapping
    let remoteNotesMeta = [];
    if (settingsJson) {
      try { remoteNotesMeta = JSON.parse(settingsJson)?.state?.notes || []; } catch {}
    }
    const remoteMetaByPath = new Map(remoteNotesMeta.filter(n => n.vaultPath).map(n => [n.vaultPath, n]));

    // 4. Merge: vault files are source of truth
    const mergedNotes = [];
    const processedLocalIds = new Set();

    for (const filePath of mdFiles) {
      // Fetch content from vault
      let content = '';
      try {
        const r = await obsidianGet(filePath);
        if (r.ok) content = await r.text();
      } catch {}

      // Try to match to an existing local note by vaultPath
      const localNote = localByPath.get(filePath);
      // Or match via remote metadata (id mapping)
      const remoteMeta = remoteMetaByPath.get(filePath);
      const metaNote = remoteMeta ? localById.get(remoteMeta.id) : null;
      const matched = localNote || metaNote;

      if (matched) {
        // Existing note — update content from vault
        matched.content = content;
        matched.vaultPath = filePath;
        if (remoteMeta) {
          matched.id = remoteMeta.id;
          matched.title = remoteMeta.title || matched.title;
        }
        mergedNotes.push(matched);
        processedLocalIds.add(matched.id);
      } else {
        // New file created in Obsidian — import it
        const filename = filePath.split('/').pop().replace(/\.md$/, '');
        const id = 'note-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);
        mergedNotes.push({
          id,
          title: filename,
          content,
          vaultPath: filePath,
        });
      }
    }

    // 5. Keep local-only notes that aren't in the vault yet (never pushed)
    for (const note of localNotes) {
      if (!processedLocalIds.has(note.id) && !note.vaultPath) {
        mergedNotes.push(note);
      }
      // Notes with a vaultPath that no longer exists in vault = deleted in Obsidian → drop them
    }

    state.notes = mergedNotes.length ? mergedNotes : [{ id: 'note-1', title: 'Note 1', content: '' }];

    // Restore active note if still valid
    if (state.notes.find(n => n.id === localActiveNoteId)) {
      state.activeNoteId = localActiveNoteId;
    } else {
      state.activeNoteId = state.notes[0].id;
    }

    saveState();
    loadNotes();

    // 6. Push back so settings file reflects any new imports
    await pushSync();

    lastPullTime = Date.now();
    const t = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setSyncStatus(`Synced ${t}`);
    setObsidianStatus('connected', `Synced with Obsidian — ${t}`);
  } catch (err) {
    setSyncStatus(`Sync error: ${err.message}`);
    showToast(`⚠ ${err.message}`);
    setObsidianStatus('disconnected', `Sync failed — ${err.message.slice(0, 60)}`);
  }
}

function schedulePush() {
  if (!isSyncConfigured()) return;
  clearTimeout(syncDebounceTimer);
  syncDebounceTimer = setTimeout(pushSync, 3000);
}

function flushSyncNow() {
  if (!isSyncConfigured()) return;
  clearTimeout(syncDebounceTimer);
  syncDebounceTimer = null;
  pushSync();
}

function initSync() {
  const urlInput = document.getElementById('sync-api-url');
  const keyInput = document.getElementById('sync-api-key');
  urlInput.value = getSyncApiUrl();
  keyInput.value = getSyncApiKey();
  urlInput.addEventListener('change', () => {
    localStorage.setItem('lumina_sync_api_url', urlInput.value.trim());
    setSyncStatus(isSyncConfigured() ? 'Settings saved — click Sync' : '');
    checkObsidianConnection();
  });
  keyInput.addEventListener('change', () => {
    localStorage.setItem('lumina_sync_api_key', keyInput.value.trim());
    setSyncStatus(isSyncConfigured() ? 'Settings saved — click Sync' : '');
    checkObsidianConnection();
  });

  document.getElementById('sync-now-btn').addEventListener('click', () => {
    if (!isSyncConfigured()) { setSyncStatus('Enter API URL and key first'); return; }
    clearTimeout(syncDebounceTimer);
    syncDebounceTimer = null;
    pullSync();
  });
  if (isSyncConfigured()) setSyncStatus('Ready — click Sync to pull');
  // Pull any edits made in Obsidian while Lumina was in the background, so
  // the next push (Cmd+S, tab close, scheduled) doesn't clobber them. We
  // listen on both visibilitychange (tab switches, minimize) and window
  // focus/blur (app switches via Cmd+Tab, where the tab stays "visible" but
  // the window loses focus) — they're complementary on macOS.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushSyncNow();
    else if (document.visibilityState === 'visible') checkVaultChanges();
  });
  window.addEventListener('blur', () => { flushSyncNow(); });
  window.addEventListener('focus', () => { checkVaultChanges(); });
  window.addEventListener('pagehide', () => { flushSyncNow(); });
  checkObsidianConnection();
  // Check for vault changes on load and every hour
  checkVaultChanges();
  if (vaultCheckInterval) clearInterval(vaultCheckInterval);
  vaultCheckInterval = setInterval(checkVaultChanges, 60 * 60 * 1000);
}

async function checkVaultChanges() {
  if (!isSyncConfigured()) return;
  if (vaultCheckInProgress || syncInProgress) return;
  vaultCheckInProgress = true;
  try {
    const notes = state.notes || [];
    if (!notes.length) return;
    const snapshots = getSyncSnapshots();
    const autoMerged = [];
    const conflicts = [];

    for (const note of notes) {
      const path = note.vaultPath || noteVaultPath(note);
      let vaultContent;
      try {
        const r = await obsidianGet(path);
        if (!r.ok) continue;
        vaultContent = (await r.text()).trim();
      } catch { continue; }

      const localContent = (note.content ?? '').toString().trim();
      const snapshotContent = (snapshots[note.id] ?? '').trim();

      // No difference — skip
      if (vaultContent === localContent) continue;

      const vaultChanged = vaultContent !== snapshotContent;
      const localChanged = localContent !== snapshotContent;

      if (vaultChanged && !localChanged) {
        // Only vault changed — safe to auto-merge into local
        note.content = vaultContent;
        updateSyncSnapshot(note.id, vaultContent);
        autoMerged.push(note.title);
      } else if (!vaultChanged && localChanged) {
        // Only local changed — will push on next sync, nothing to do
      } else if (vaultChanged && localChanged) {
        // Both sides changed — conflict
        conflicts.push({ note, vaultContent });
      }
    }

    if (autoMerged.length) {
      saveState({ skipSchedule: true });
      loadNotes();
      const names = autoMerged.length <= 3 ? autoMerged.join(', ') : `${autoMerged.length} notes`;
      setObsidianStatus('connected', `Auto-merged: ${names}`);
    }

    if (conflicts.length) {
      showConflictBanner(conflicts);
    }
  } catch {} finally {
    vaultCheckInProgress = false;
  }
}

function showConflictBanner(conflicts) {
  let banner = document.getElementById('vault-update-banner');
  if (banner) banner.remove();
  banner = document.createElement('div');
  banner.id = 'vault-update-banner';

  const label = conflicts.length === 1
    ? `"${conflicts[0].note.title}" changed in both Obsidian and Lumina`
    : `${conflicts.length} notes changed in both Obsidian and Lumina`;

  banner.innerHTML = `
    <span>${label}</span>
    <div style="display:flex;gap:6px;margin-top:8px;justify-content:center;">
      <button id="vault-update-obsidian">Use Obsidian</button>
      <button id="vault-update-local">Use Local</button>
      <button id="vault-update-dismiss">Dismiss</button>
    </div>
  `;
  document.body.appendChild(banner);
  requestAnimationFrame(() => banner.classList.add('show'));

  const dismiss = () => {
    banner.classList.remove('show');
    setTimeout(() => banner.remove(), 300);
  };

  document.getElementById('vault-update-obsidian').addEventListener('click', () => {
    for (const { note, vaultContent } of conflicts) {
      note.content = vaultContent;
      updateSyncSnapshot(note.id, vaultContent);
    }
    saveState({ skipSchedule: true });
    loadNotes();
    // Push so vault gets the resolved state
    schedulePush();
    setObsidianStatus('connected', `Resolved ${conflicts.length} conflict(s) — used Obsidian`);
    dismiss();
  });

  document.getElementById('vault-update-local').addEventListener('click', () => {
    for (const { note } of conflicts) {
      updateSyncSnapshot(note.id, (note.content ?? '').toString());
    }
    // Push local content to vault
    schedulePush();
    setObsidianStatus('connected', `Resolved ${conflicts.length} conflict(s) — used local`);
    dismiss();
  });

  document.getElementById('vault-update-dismiss').addEventListener('click', dismiss);
}

async function checkObsidianConnection() {
  if (!isSyncConfigured()) {
    setObsidianStatus('disconnected', 'Obsidian sync not configured — add API URL and key in Settings');
    return;
  }
  try {
    // Use an authenticated endpoint to truly validate the key
    const resp = await fetch(`${getSyncApiUrl()}/vault/`, {
      headers: { Authorization: `Bearer ${getSyncApiKey()}`, Accept: 'application/json' },
    });
    if (resp.ok) {
      setObsidianStatus('connected', 'Connected to Obsidian');
    } else {
      setObsidianStatus('disconnected', `Cannot reach Obsidian — ${resp.status} error`);
    }
  } catch {
    setObsidianStatus('disconnected', 'Cannot reach Obsidian — make sure it is open with Local REST API');
  }
}

// ─── SETUP WIZARD ───────────────────────────────
function isFirstInstall() {
  return !localStorage.getItem('lumina_setup_done');
}

function showSetupOverlay() {
  const overlay = document.getElementById('setup-overlay');
  if (!overlay) return;
  overlay.style.display = 'flex';
  goToSetupStep('welcome');
}

function hideSetupOverlay() {
  const overlay = document.getElementById('setup-overlay');
  if (overlay) overlay.style.display = 'none';
  localStorage.setItem('lumina_setup_done', '1');
}

function goToSetupStep(stepName) {
  const steps = document.querySelectorAll('.setup-step');
  steps.forEach(s => {
    s.classList.toggle('active', s.dataset.step === stepName);
  });
}

function initSetupWizard() {
  const connectBtn = document.getElementById('setup-connect-btn');
  const skipBtn = document.getElementById('setup-skip-btn');
  const testBtn = document.getElementById('setup-test-btn');
  const backBtn = document.getElementById('setup-back-btn');
  const importBtn = document.getElementById('setup-import-btn');
  const freshBtn = document.getElementById('setup-fresh-btn');
  const doneBtn = document.getElementById('setup-done-btn');

  if (!connectBtn) return; // no setup overlay in DOM

  connectBtn.addEventListener('click', () => goToSetupStep('configure'));
  skipBtn.addEventListener('click', () => hideSetupOverlay());
  backBtn.addEventListener('click', () => goToSetupStep('welcome'));

  testBtn.addEventListener('click', async () => {
    const urlInput = document.getElementById('setup-api-url');
    const keyInput = document.getElementById('setup-api-key');
    const statusEl = document.getElementById('setup-test-status');
    const url = (urlInput.value || '').trim().replace(/\/+$/, '');
    const key = (keyInput.value || '').trim();
    if (!url || !key) {
      statusEl.textContent = 'Please enter both URL and API key';
      statusEl.className = 'setup-test-status error';
      return;
    }
    statusEl.textContent = 'Testing connection…';
    statusEl.className = 'setup-test-status testing';
    try {
      const resp = await fetch(url + '/', {
        headers: { Authorization: 'Bearer ' + key },
        mode: 'cors',
      });
      if (resp.ok) {
        // Save credentials
        localStorage.setItem('lumina_sync_api_url', url);
        localStorage.setItem('lumina_sync_api_key', key);
        // Update settings inputs too
        const settingsUrl = document.getElementById('sync-api-url');
        const settingsKey = document.getElementById('sync-api-key');
        if (settingsUrl) settingsUrl.value = url;
        if (settingsKey) settingsKey.value = key;
        statusEl.textContent = 'Connected!';
        statusEl.className = 'setup-test-status success';
        setTimeout(() => goToSetupStep('import'), 600);
      } else {
        statusEl.textContent = `Connection failed — HTTP ${resp.status}`;
        statusEl.className = 'setup-test-status error';
      }
    } catch {
      statusEl.textContent = 'Cannot reach Obsidian — check URL and that Obsidian is open';
      statusEl.className = 'setup-test-status error';
    }
  });

  importBtn.addEventListener('click', async () => {
    const desc = document.getElementById('setup-done-desc');
    try {
      await pullSync();
      if (desc) desc.textContent = 'Your notes and settings have been imported from Obsidian. Enjoy your new tab!';
    } catch {
      if (desc) desc.textContent = 'Import had some issues, but Lumina is ready. You can sync again from Settings.';
    }
    goToSetupStep('done');
  });

  freshBtn.addEventListener('click', () => {
    const desc = document.getElementById('setup-done-desc');
    if (desc) desc.textContent = 'Lumina is connected to Obsidian and ready to sync. Enjoy your new tab!';
    goToSetupStep('done');
  });

  doneBtn.addEventListener('click', () => hideSetupOverlay());
}

// ─── SETTINGS REVISION ARCHIVE ──────────────────
const SETTINGS_ARCHIVE_KEY = 'lumina_settings_archive';
const MAX_SETTINGS_REVISIONS = 30;

function getSettingsArchive() {
  try { return JSON.parse(localStorage.getItem(SETTINGS_ARCHIVE_KEY) || '[]'); }
  catch { return []; }
}

function archiveCurrentSettings() {
  const archive = getSettingsArchive();
  const snapshot = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    timestamp: Date.now(),
    data: JSON.parse(JSON.stringify(state)),
  };
  archive.unshift(snapshot);
  if (archive.length > MAX_SETTINGS_REVISIONS) archive.length = MAX_SETTINGS_REVISIONS;
  localStorage.setItem(SETTINGS_ARCHIVE_KEY, JSON.stringify(archive));
}

function restoreSettingsRevision(revisionId) {
  const archive = getSettingsArchive();
  const rev = archive.find(r => r.id === revisionId);
  if (!rev || !rev.data) return false;
  state = rev.data;
  saveState({ skipSchedule: true });
  return true;
}

function renderSettingsArchive() {
  const container = document.getElementById('settings-archive-list');
  if (!container) return;
  const archive = getSettingsArchive();
  if (!archive.length) {
    container.innerHTML = '<p style="color:var(--text-muted);font-size:0.85rem;">No saved revisions yet. Settings are archived automatically when changes are made.</p>';
    return;
  }
  container.innerHTML = archive.map(rev => {
    const d = new Date(rev.timestamp);
    const dateStr = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    const timeStr = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
    const noteCount = Array.isArray(rev.data.notes) ? rev.data.notes.length : 0;
    const linkCount = Array.isArray(rev.data.links) ? rev.data.links.length : 0;
    return `<div class="settings-rev-row" style="display:flex;justify-content:space-between;align-items:center;padding:8px 10px;border-bottom:1px solid rgba(255,255,255,0.08);">
      <div>
        <div style="font-size:0.85rem;color:var(--text);">${dateStr} at ${timeStr}</div>
        <div style="font-size:0.75rem;color:var(--text-muted);">${noteCount} notes · ${linkCount} links · ${rev.data.themes?.join(', ') || 'default'}</div>
      </div>
      <button class="settings-rev-restore" data-rev-id="${rev.id}" style="background:var(--accent);color:#fff;border:none;border-radius:6px;padding:4px 12px;font-size:0.8rem;cursor:pointer;">Restore</button>
    </div>`;
  }).join('');
  container.querySelectorAll('.settings-rev-restore').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.revId;
      if (confirm('Restore this settings revision? Your current settings will be replaced.')) {
        if (restoreSettingsRevision(id)) {
          location.reload();
        }
      }
    });
  });
}

function fetchPublicIP() {
  fetch('https://api.ipify.org?format=json')
    .then(r => r.json())
    .then(data => {
      const el = document.getElementById('public-ip');
      if (el && data.ip) el.textContent = data.ip;
    })
    .catch(() => {});
}

function init() {
  resizeCanvas();
  startBg();
  updateClock();
  setInterval(updateClock, 1000);
  setQuote();
  renderLinks();
  buildThemeGrid();
  buildWallpaperGrid();
  if (state.bgMode === 'wallpaper') pickAndApplyWallpaper();
  else applyWallpaper(null);
  setupWallpaperManagement();
  setupFocusLineManagement();
  syncSettings();
  applyVisibility();
  applyPanelTheme(state.panelTheme || 'dark');
  applySettingsTheme(state.settingsTheme || 'dark');

  applyEngine(state.searchEngine || 'claude');
  fetchWeather();
  fetchPublicIP();

  // Show badge if bookmark sync is configured
  if (state.bmFolderId) document.getElementById('bm-sync-badge').style.display = '';

  // Auto-sync bookmarks on open
  if (state.bmAutoSync && state.bmFolderId) applyBmSync();

  // Restore sidebar states
  if (state.notesPanelOpen !== false) openNotesPanel();
  applySavedFaviconBg(state.savedFaviconBg || 'white');
  loadSavedLinks().then(() => {
    renderSavedFilters();
    renderSavedList();
  });

  initSync();
  if (Array.isArray(state.addressBook) && typeof chrome !== 'undefined' && chrome.storage?.local) {
    chrome.storage.local.set({ lumina_address_book: state.addressBook }).catch(() => {});
  }

  // Setup wizard for first install
  initSetupWizard();
  if (isFirstInstall()) showSetupOverlay();

  // Settings archive
  renderSettingsArchive();
}

window.addEventListener('resize', () => { resizeCanvas(); startBg(); });
init();
