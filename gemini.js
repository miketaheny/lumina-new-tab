// gemini.js — content script for gemini.google.com
// Reads the ?q= URL param and populates Gemini's chat input (without submitting).
(function () {
  const params = new URLSearchParams(window.location.search);
  const q = params.get('q');
  if (!q) return;

  // Current Gemini selectors (ordered by specificity/likelihood)
  const SELECTORS = [
    'rich-textarea .ql-editor',
    'rich-textarea [contenteditable]',
    'div.ql-editor[contenteditable]',
    'div[contenteditable][aria-label*="message" i]',
    'div[contenteditable][aria-label*="prompt" i]',
    'div[contenteditable][aria-label*="input" i]',
    'div[contenteditable][aria-label*="chat" i]',
    'div[contenteditable][data-placeholder]',
    'div[contenteditable][role="textbox"]',
    'textarea[placeholder]',
    'textarea',
  ];

  function moveCursorToEnd(el) {
    try {
      const sel = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(el);
      range.collapse(false); // collapse to end
      sel.removeAllRanges();
      sel.addRange(range);
    } catch (_) {}
  }

  function tryFill() {
    for (const sel of SELECTORS) {
      const el = document.querySelector(sel);
      if (!el) continue;

      if (el.tagName === 'TEXTAREA') {
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
          window.HTMLTextAreaElement.prototype, 'value'
        ).set;
        nativeInputValueSetter.call(el, q);
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        el.focus();
        // move caret to end
        el.setSelectionRange(el.value.length, el.value.length);
      } else {
        // contenteditable element
        el.focus();
        document.execCommand('selectAll', false, null);
        document.execCommand('insertText', false, q);
        // verify insert worked; fallback to textContent
        if (!el.textContent.includes(q)) {
          el.textContent = q;
          el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: q }));
        }
        el.focus();
        moveCursorToEnd(el);
      }
      return true;
    }
    return false;
  }

  // Gemini is a SPA — element may not exist immediately; retry with backoff
  if (!tryFill()) {
    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;
      if (tryFill() || attempts >= 30) clearInterval(interval);
    }, 200);
  }
})();
