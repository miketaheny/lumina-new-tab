export default defineContentScript({
  matches: ['*://gemini.google.com/*'],
  main() {
    const params = new URLSearchParams(window.location.search);
    const q = params.get('q');
    if (!q) return;

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

    function moveCursorToEnd(el: Element) {
      try {
        const sel = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(el);
        range.collapse(false);
        sel!.removeAllRanges();
        sel!.addRange(range);
      } catch (_) {}
    }

    function tryFill(): boolean {
      for (const sel of SELECTORS) {
        const el = document.querySelector(sel);
        if (!el) continue;

        if (el.tagName === 'TEXTAREA') {
          const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
            window.HTMLTextAreaElement.prototype, 'value'
          )!.set!;
          nativeInputValueSetter.call(el, q);
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
          (el as HTMLTextAreaElement).focus();
          (el as HTMLTextAreaElement).setSelectionRange((el as HTMLTextAreaElement).value.length, (el as HTMLTextAreaElement).value.length);
        } else {
          (el as HTMLElement).focus();
          document.execCommand('selectAll', false, undefined);
          document.execCommand('insertText', false, q!);
          if (!(el as HTMLElement).textContent!.includes(q!)) {
            (el as HTMLElement).textContent = q!;
            el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: q! }));
          }
          (el as HTMLElement).focus();
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
        if (tryFill() || attempts >= 30) clearInterval(interval);
      }, 200);
    }
  },
});
