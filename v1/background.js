/* Lumina — background service worker: context menu + form auto-fill + save to kindling */

const STORAGE_KEY = 'lumina_address_book';
const MENU_PARENT = 'lumina-autofill-parent';
const MENU_SAVE_KINDLING = 'lumina-save-kindling';
const CONTEXTS = ['all'];

function buildContextMenu(entries) {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: 'lumina-add-quicklink',
      title: 'Lumina: Add to Quick Links',
      contexts: ['page', 'link'],
    });
    chrome.contextMenus.create({
      id: MENU_SAVE_KINDLING,
      title: 'Save to Kindling',
      contexts: ['page', 'link'],
    });

    chrome.contextMenus.create({
      id: MENU_PARENT,
      title: 'Lumina: Auto-fill form with',
      contexts: CONTEXTS,
    });
    if (!Array.isArray(entries) || entries.length === 0) {
      chrome.contextMenus.create({
        id: 'lumina-autofill-empty',
        parentId: MENU_PARENT,
        title: 'Add entries in New Tab → Settings → Auto-fill forms',
        enabled: true,
        contexts: CONTEXTS,
      });
      return;
    }
    entries.forEach((entry) => {
      const label = (entry.label || entry.name || 'Unnamed').slice(0, 50);
      chrome.contextMenus.create({
        id: `lumina-ab-${entry.id}`,
        parentId: MENU_PARENT,
        title: label,
        contexts: CONTEXTS,
      });
    });
  });
}

function refreshContextMenu() {
  chrome.storage.local.get(STORAGE_KEY, (data) => {
    buildContextMenu(data[STORAGE_KEY] || []);
  });
}

function getEntryById(entries, id) {
  if (!Array.isArray(entries)) return null;
  return entries.find((e) => e && e.id === id) || null;
}

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes[STORAGE_KEY]) {
    buildContextMenu(changes[STORAGE_KEY].newValue || []);
  }
});

// Build menu once when service worker starts (covers both install and restart)
refreshContextMenu();

async function addQuickLinkFromContextMenu(url, title) {
  const id = 'ql-' + Date.now();
  const newLink = { id, url, label: title, favicon: null, section: 'default', lastUpdate: Date.now() };

  const stored = await chrome.storage.local.get(['lumina_raindrop_token', 'lumina_raindrop_collection_id']);
  const token = (stored.lumina_raindrop_token || '').trim();
  const collectionId = stored.lumina_raindrop_collection_id;

  if (token && collectionId) {
    try {
      const resp = await fetch('https://api.raindrop.io/rest/v1/raindrop', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ link: url, title, collection: { '$id': collectionId }, cover: '', note: '' }),
      });
      if (resp.ok) {
        const j = await resp.json();
        if (j?.item?._id) {
          newLink.raindropId = j.item._id;
          newLink.id = 'rd-' + j.item._id;
        }
      }
    } catch {}
  }

  const pendingResult = await chrome.storage.local.get('lumina_pending_quicklinks');
  const pending = pendingResult.lumina_pending_quicklinks || [];
  pending.push(newLink);
  await chrome.storage.local.set({ lumina_pending_quicklinks: pending });
}

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'lumina-add-quicklink') {
    const url = info.linkUrl || info.pageUrl;
    const title = tab?.title || '';
    addQuickLinkFromContextMenu(url, title || url);
    return;
  }
  if (!info.menuItemId || info.menuItemId === MENU_PARENT) return;

  if (info.menuItemId === MENU_SAVE_KINDLING) {
    const url = info.linkUrl || info.pageUrl || tab?.url || '';
    const title = tab?.title || '';
    if (!url) return;
    saveToKindling(url, title);
    return;
  }

  if (info.menuItemId === 'lumina-autofill-empty') {
    chrome.tabs.create({ url: chrome.runtime.getURL('newtab.html') });
    return;
  }
  const entryId = String(info.menuItemId).replace(/^lumina-ab-/, '');
  if (!entryId) return;
  chrome.storage.local.get(STORAGE_KEY, (data) => {
    const entries = data[STORAGE_KEY];
    const entry = getEntryById(entries, entryId);
    if (!entry || !tab?.id) return;
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: fillFormWithEntry,
      args: [entry],
    }).catch(() => {});
  });
});

const COUNTRY_CODE_TO_NAME = { US: 'United States', CA: 'Canada', GB: 'United Kingdom', AU: 'Australia', DE: 'Germany', FR: 'France', ES: 'Spain', IT: 'Italy', NL: 'Netherlands', BE: 'Belgium', CH: 'Switzerland', AT: 'Austria', IE: 'Ireland', PL: 'Poland', SE: 'Sweden', NO: 'Norway', DK: 'Denmark', FI: 'Finland', PT: 'Portugal', JP: 'Japan', CN: 'China', IN: 'India', KR: 'South Korea', BR: 'Brazil', MX: 'Mexico', AR: 'Argentina', ZA: 'South Africa', NZ: 'New Zealand', SG: 'Singapore', HK: 'Hong Kong', IL: 'Israel', AE: 'United Arab Emirates', SA: 'Saudi Arabia', RU: 'Russia', TR: 'Turkey', GR: 'Greece', CZ: 'Czech Republic', RO: 'Romania', HU: 'Hungary', TH: 'Thailand', MY: 'Malaysia', PH: 'Philippines', ID: 'Indonesia', VN: 'Vietnam', EG: 'Egypt', NG: 'Nigeria', KE: 'Kenya', CO: 'Colombia', CL: 'Chile', PE: 'Peru', UA: 'Ukraine', LU: 'Luxembourg', SK: 'Slovakia', BG: 'Bulgaria', HR: 'Croatia', SI: 'Slovenia', LT: 'Lithuania', LV: 'Latvia', EE: 'Estonia', CY: 'Cyprus', MT: 'Malta', IS: 'Iceland', CR: 'Costa Rica', PA: 'Panama', EC: 'Ecuador', PR: 'Puerto Rico', JM: 'Jamaica', DO: 'Dominican Republic', GT: 'Guatemala', QA: 'Qatar', KW: 'Kuwait', BH: 'Bahrain', OM: 'Oman', PK: 'Pakistan', BD: 'Bangladesh', LK: 'Sri Lanka', TW: 'Taiwan' };

function fillFormWithEntry(entry) {
  if (!entry || typeof entry !== 'object') return;
  const firstName = String(entry.firstName || '').trim();
  const lastName = String(entry.lastName || '').trim();
  let name = String(entry.name || '').trim();
  if (!name && (firstName || lastName)) name = [firstName, lastName].filter(Boolean).join(' ');
  const countryCode = String(entry.country || '').trim();
  const countryName = (countryCode.length === 2 ? COUNTRY_CODE_TO_NAME[countryCode] : null) || countryCode;
  const e = {
    firstName,
    lastName,
    name,
    email: String(entry.email || '').trim(),
    phone: String(entry.phone || '').trim(),
    company: String(entry.company || '').trim(),
    addressLine1: String(entry.addressLine1 || '').trim(),
    addressLine2: String(entry.addressLine2 || '').trim(),
    city: String(entry.city || '').trim(),
    state: String(entry.state || '').trim(),
    zip: String(entry.zip || '').trim(),
    countryCode,
    countryName,
  };

  const setValue = (el, value) => {
    if (!el || value === '') return;
    el.focus();
    el.value = value;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  };

  const match = (el, patterns, value) => {
    if (!value || !el || el.disabled || el.readOnly) return false;
    const tag = (el.tagName || '').toLowerCase();
    if (tag !== 'input' && tag !== 'textarea' && tag !== 'select') return false;
    const name = (el.name || '').toLowerCase();
    const id = (el.id || '').toLowerCase();
    const placeholder = (el.placeholder || '').toLowerCase();
    const autocomplete = (el.getAttribute('autocomplete') || '').toLowerCase();
    const ariaLabel = (el.getAttribute('aria-label') || '').toLowerCase();
    const text = [name, id, placeholder, autocomplete, ariaLabel].join(' ');
    for (const p of patterns) {
      if (typeof p === 'string' && text.includes(p)) return true;
      if (p instanceof RegExp && p.test(text)) return true;
    }
    return false;
  };

  const fill = (value, patterns, typeHint) => {
    const inputs = document.querySelectorAll('input, textarea, select');
    for (const el of inputs) {
      if (el.dataset.luminaFilled === '1') continue;
      if (typeHint === 'email' && (el.type || '').toLowerCase() === 'email') {
        setValue(el, value); el.dataset.luminaFilled = '1'; continue;
      }
      if (typeHint === 'tel' && (el.type || '').toLowerCase() === 'tel') {
        setValue(el, value); el.dataset.luminaFilled = '1'; continue;
      }
      if (match(el, patterns, value)) {
        setValue(el, value);
        el.dataset.luminaFilled = '1';
      }
    }
  };

  const firstPatterns = [/first|fname|given|firstname|first_name/i];
  const lastPatterns = [/last|lname|surname|family|lastname|last_name/i];
  const namePatterns = [/name|fullname|full_name|your name|contact name|username/i, /^name$/];
  const countryPatterns = [/country/i];

  if (e.firstName) fill(e.firstName, firstPatterns);
  if (e.lastName) fill(e.lastName, lastPatterns);
  if (e.name) fill(e.name, namePatterns);
  if (e.email) fill(e.email, [/email|e-mail|mail/i, /^email$/, 'your email', 'contact email'], 'email');
  if (e.phone) fill(e.phone, [/phone|tel|mobile|cell|fax/i, /^phone$/, 'telephone'], 'tel');
  if (e.company) fill(e.company, [/company|organization|employer|business/i, 'company name']);
  if (e.addressLine1) fill(e.addressLine1, [/address|street|addr/i, 'address line 1', 'street address', 'address1', 'address_1']);
  if (e.addressLine2) fill(e.addressLine2, [/address line 2|address2|address_2|apt|suite|unit|floor/i]);
  if (e.city) fill(e.city, [/city|town|locality/i, 'city']);
  if (e.state) fill(e.state, [/state|province|region|county/i]);
  if (e.zip) fill(e.zip, [/zip|postal|postcode|pincode/i]);

  if (e.countryCode || e.countryName) {
    const inputs = document.querySelectorAll('input, select');
    for (const el of inputs) {
      if (el.dataset.luminaFilled === '1') continue;
      if (!match(el, countryPatterns, e.countryName)) continue;
      const tag = (el.tagName || '').toLowerCase();
      if (tag === 'select') {
        const opts = Array.from(el.options);
        const trySet = (val) => {
          const i = opts.findIndex((o) => (o.value || '').toLowerCase() === (val || '').toLowerCase() || (o.text || '').toLowerCase() === (val || '').toLowerCase());
          if (i >= 0) { el.selectedIndex = i; el.dispatchEvent(new Event('change', { bubbles: true })); return true; }
          return false;
        };
        if ((e.countryCode && trySet(e.countryCode)) || trySet(e.countryName)) el.dataset.luminaFilled = '1';
      } else {
        setValue(el, e.countryName || e.countryCode);
        el.dataset.luminaFilled = '1';
      }
    }
  }

  const firstFilled = document.querySelector('[data-lumina-filled="1"]');
  if (firstFilled) firstFilled.focus();
}

async function saveToKindling(url, title) {
  if (!title) {
    try { title = new URL(url).hostname.replace(/^www\./, ''); }
    catch { title = url; }
  }

  const link = {
    id: 'sl-' + Date.now(),
    url,
    title,
    tags: [],
    savedAt: Date.now(),
  };

  const result = await chrome.storage.local.get('lumina_saved');
  const savedData = result.lumina_saved || { links: [], tags: [] };
  savedData.links.push(link);
  await chrome.storage.local.set({ lumina_saved: savedData });

  try {
    const token = (await chrome.storage.local.get('lumina_raindrop_token')).lumina_raindrop_token;
    const raw = (await chrome.storage.local.get('lumina_raindrop_collection')).lumina_raindrop_collection;
    const collectionId = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!token || !collectionId) return;
    const resp = await fetch('https://api.raindrop.io/rest/v1/raindrop', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        link: url,
        title: title,
        collection: { '$id': collectionId },
        tags: [],
        important: true,
      }),
    });
    if (resp.ok) {
      const j = await resp.json();
      if (j?.item?._id) {
        link.raindropId = j.item._id;
        link.id = 'sl-' + j.item._id;
        link.lastUpdate = j.item.lastUpdate || new Date().toISOString();
        const freshResult = await chrome.storage.local.get('lumina_saved');
        const freshData = freshResult.lumina_saved || savedData;
        const idx = freshData.links.findIndex(l => l.url === url && !l.raindropId);
        if (idx >= 0) {
          freshData.links[idx] = link;
          await chrome.storage.local.set({ lumina_saved: freshData });
        }
      }
    }
  } catch {}
}
