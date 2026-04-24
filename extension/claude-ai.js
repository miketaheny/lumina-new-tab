// claude-ai.js — content script for claude.ai
// Reads the ?q= URL param and populates Claude's ProseMirror input, then focuses.
(function () {
  const params = new URLSearchParams(window.location.search);
  const q = params.get('q');
  if (!q) return;

  // Claude uses ProseMirror — clipboard paste is the most reliable insertion method
  const SELECTORS = [
    'div.ProseMirror[contenteditable="true"]',
    'div[contenteditable="true"][data-placeholder]',
    'div[contenteditable="true"]',
    'textarea',
  ];

  function pasteInto(el) {
    el.focus();
    // Clear existing content first
    document.execCommand('selectAll', false, null);
    // Clipboard paste is the most reliable way to insert text into ProseMirror
    try {
      const dt = new DataTransfer();
      dt.setData('text/plain', q);
      el.dispatchEvent(new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData: dt }));
      // Verify it worked
      if (el.textContent.trim().length > 0) return true;
    } catch (_) {}
    // Fallback: execCommand
    document.execCommand('insertText', false, q);
    if (el.textContent.includes(q)) return true;
    // Last resort: set innerHTML / textContent
    el.textContent = q;
    el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: q }));
    return el.textContent.includes(q);
  }

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
        const ok = pasteInto(el);
        if (!ok) continue;
        el.focus();
        moveCursorToEnd(el);
      }

      return true;
    }
    return false;
  }

  if (!tryFill()) {
    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;
      if (tryFill() || attempts >= 50) clearInterval(interval);
    }, 200);
  }
})();
