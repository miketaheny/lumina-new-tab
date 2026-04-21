// popup.js — Lumina browser action popup for saving links

const TAG_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#14b8a6', '#3b82f6', '#a78bfa', '#ec4899',
];

let savedData = { links: [], tags: [] };
let selectedTags = [];
let selectedColor = TAG_COLORS[6]; // default purple

// Load current tab
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  const tab = tabs[0];
  if (tab) {
    document.getElementById('url').value = tab.url || '';
    document.getElementById('title').value = tab.title || '';
  }
});

// Load existing saved data
chrome.storage.local.get('lumina_saved', (result) => {
  if (result.lumina_saved) savedData = result.lumina_saved;
  renderTags();
  renderColors();
});

function renderTags() {
  const container = document.getElementById('tag-list');
  container.innerHTML = '';
  savedData.tags.forEach(tag => {
    const btn = document.createElement('button');
    btn.className = 'tag-toggle' + (selectedTags.includes(tag.name) ? ' selected' : '');
    btn.style.cssText = `background:${tag.color}22;color:${tag.color};border-color:${tag.color}66`;
    btn.textContent = tag.name;
    btn.type = 'button';
    btn.addEventListener('click', () => {
      const idx = selectedTags.indexOf(tag.name);
      if (idx >= 0) selectedTags.splice(idx, 1);
      else selectedTags.push(tag.name);
      renderTags();
    });
    container.appendChild(btn);
  });
}

function renderColors() {
  const container = document.getElementById('tag-colors');
  container.innerHTML = '';
  TAG_COLORS.forEach(color => {
    const swatch = document.createElement('button');
    swatch.className = 'tag-color-swatch' + (selectedColor === color ? ' selected' : '');
    swatch.style.background = color;
    swatch.type = 'button';
    swatch.title = color;
    swatch.addEventListener('click', () => {
      selectedColor = color;
      renderColors();
    });
    container.appendChild(swatch);
  });
}

function addNewTag() {
  const input = document.getElementById('new-tag-input');
  const name = input.value.trim();
  if (!name) return;
  if (savedData.tags.find(t => t.name.toLowerCase() === name.toLowerCase())) {
    // Tag exists — just select it
    if (!selectedTags.includes(name)) {
      const existing = savedData.tags.find(t => t.name.toLowerCase() === name.toLowerCase());
      selectedTags.push(existing.name);
      renderTags();
    }
    input.value = '';
    return;
  }
  savedData.tags.push({ name, color: selectedColor });
  selectedTags.push(name);
  input.value = '';
  renderTags();
}

document.getElementById('new-tag-add').addEventListener('click', addNewTag);
document.getElementById('new-tag-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') addNewTag();
});

async function createRaindropFromPopup(link) {
  try {
    const result = await chrome.storage.local.get(['lumina_raindrop_token', 'lumina_raindrop_collection']);
    const token = (result.lumina_raindrop_token || localStorage.getItem('lumina_raindrop_token') || '').trim();
    const collectionId = result.lumina_raindrop_collection || JSON.parse(localStorage.getItem('lumina_raindrop_collection') || 'null');
    if (!token || !collectionId) return;
    const resp = await fetch('https://api.raindrop.io/rest/v1/raindrop', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        link: link.url,
        title: link.title || '',
        collection: { '$id': collectionId },
        tags: link.tags || [],
        important: true,
      }),
    });
    if (resp.ok) {
      const j = await resp.json();
      if (j?.item?._id) {
        link.raindropId = j.item._id;
        link.id = 'sl-' + j.item._id;
        link.lastUpdate = j.item.lastUpdate || new Date().toISOString();
        chrome.storage.local.set({ lumina_saved: savedData });
      }
    }
  } catch {}
}

document.getElementById('save-btn').addEventListener('click', () => {
  const url = document.getElementById('url').value.trim();
  let title = document.getElementById('title').value.trim();

  if (!url) return;

  if (!title) {
    try { title = new URL(url).hostname.replace(/^www\./, ''); }
    catch { title = url; }
  }

  const link = {
    id: 'sl-' + Date.now(),
    url,
    title,
    tags: [...selectedTags],
    savedAt: Date.now(),
  };

  savedData.links.push(link);

  chrome.storage.local.set({ lumina_saved: savedData }, () => {
    document.getElementById('toast').classList.add('show');
    document.getElementById('save-btn').disabled = true;
    createRaindropFromPopup(link);
    setTimeout(() => window.close(), 1000);
  });
});
