// chatgpt.js — content script for chatgpt.com
// Reads the ?q= URL param and populates ChatGPT's chat input, then submits.
(function () {
  const params = new URLSearchParams(window.location.search);
  const q = params.get('q');
  if (!q) return;

  const SELECTORS = [
    'div#prompt-textarea[contenteditable]',
    'div[contenteditable="true"][id="prompt-textarea"]',
    'div[contenteditable="true"][data-id="root"]',
    'div[contenteditable="true"][data-placeholder]',
    'div[contenteditable="true"]',
    'textarea#prompt-textarea',
    'textarea',
  ];

  const SUBMIT_SELECTORS = [
    'button[data-testid="send-button"]',
    'button[aria-label="Send prompt"]',
    'button[aria-label*="Send" i]',
    'button[type="submit"]',
  ];

  function moveCursorToEnd(el) {
    try {
      const sel = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(el);
      range.collapse(false);
      sel.removeAllRanges();
      sel.addRange(range);
    } catch (_) {}
  }

  function trySubmit() {
    for (const sel of SUBMIT_SELECTORS) {
      const btn = document.querySelector(sel);
      if (btn && !btn.disabled) { btn.click(); return true; }
    }
    return false;
  }

  function tryFill() {
    for (const sel of SELECTORS) {
      const el = document.querySelector(sel);
      if (!el) continue;

      if (el.tagName === 'TEXTAREA') {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
        setter.call(el, q);
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        el.focus();
        el.setSelectionRange(el.value.length, el.value.length);
      } else {
        el.focus();
        document.execCommand('selectAll', false, null);
        document.execCommand('insertText', false, q);
        if (!el.textContent.includes(q)) {
          el.textContent = q;
          el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: q }));
        }
        el.focus();
        moveCursorToEnd(el);
      }

      // Try to auto-submit after a short delay to let the UI register the input
      setTimeout(() => { if (!trySubmit()) moveCursorToEnd(el); }, 300);
      return true;
    }
    return false;
  }

  if (!tryFill()) {
    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;
      if (tryFill() || attempts >= 40) clearInterval(interval);
    }, 200);
  }
})();
