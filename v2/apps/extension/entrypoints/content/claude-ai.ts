export default defineContentScript({
  matches: ['*://claude.ai/*'],
  main() {
    const params = new URLSearchParams(window.location.search);
    const q = params.get('q');
    if (!q) return;

    const SELECTORS = [
      'div.ProseMirror[contenteditable="true"]',
      'div[contenteditable="true"][data-placeholder]',
      'div[contenteditable="true"]',
      'textarea',
    ];

    function pasteInto(el: Element): boolean {
      (el as HTMLElement).focus();
      document.execCommand('selectAll', false, undefined);
      try {
        const dt = new DataTransfer();
        dt.setData('text/plain', q!);
        el.dispatchEvent(new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData: dt }));
        if ((el as HTMLElement).textContent!.trim().length > 0) return true;
      } catch (_) {}
      document.execCommand('insertText', false, q!);
      if ((el as HTMLElement).textContent!.includes(q!)) return true;
      (el as HTMLElement).textContent = q!;
      el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: q! }));
      return (el as HTMLElement).textContent!.includes(q!);
    }

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
          const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')!.set!;
          setter.call(el, q);
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
          (el as HTMLTextAreaElement).focus();
          (el as HTMLTextAreaElement).setSelectionRange((el as HTMLTextAreaElement).value.length, (el as HTMLTextAreaElement).value.length);
        } else {
          const ok = pasteInto(el);
          if (!ok) continue;
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
        if (tryFill() || attempts >= 50) clearInterval(interval);
      }, 200);
    }
  },
});
