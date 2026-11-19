import { button, node, runAction } from './ui.js';
import { icon } from './icons.js';

export function createModal(dialog, content) {
  let opener = null;

  function close() {
    if (dialog.open) dialog.close();
  }

  dialog.addEventListener('click', event => {
    if (event.target === dialog) close();
  });
  dialog.addEventListener('close', () => {
    document.documentElement.classList.remove('lock');
    if (document.activeElement === document.body) {
      if (opener?.getClientRects().length) opener.focus();
      else document.querySelector('#workspace:not([hidden]) h1, #q')?.focus();
    }
    opener = null;
  });
  dialog.addEventListener('keydown', event => {
    if (event.key !== 'Tab') return;
    const focusable = [...content.querySelectorAll('a[href], button, input, select, textarea, [tabindex="0"]')]
      .filter(element => !element.disabled && element.getClientRects().length);
    const first = focusable[0], last = focusable.at(-1);
    if (!first) { event.preventDefault(); return; }
    const current = document.activeElement;
    if (event.shiftKey && (current === first || !focusable.includes(current))) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && current === last) {
      event.preventDefault();
      first.focus();
    }
  });

  return {
    close,
    show(title, elements, { back, className = '', preserveFocus = null, footer = true } = {}) {
      if (!dialog.open) opener = document.activeElement;
      const heading = node('h2', 'dialog-title', title);
      heading.id = 'dialog-title';
      heading.tabIndex = -1;
      const titlebar = node('div', 'dialog-heading');
      const dismiss = button('', close, 'btn quiet icon-button');
      dismiss.setAttribute('aria-label', 'Закрыть окно');
      dismiss.append(icon('close'));
      titlebar.append(heading, dismiss);
      const actions = node('div', 'dialog-actions');
      if (back) {
        const previous = button('Назад', runAction(back));
        previous.prepend(icon('back'));
        actions.append(previous);
      }
      actions.append(button('Закрыть', close));
      content.className = ('pc ' + className).trim();
      content.replaceChildren(titlebar, ...elements, ...(footer ? [actions] : []));
      if (!dialog.open) dialog.showModal();
      dialog.scrollTop = 0;
      document.documentElement.classList.add('lock');
      (preserveFocus && [...content.querySelectorAll('button')].find(item => item.textContent === preserveFocus) || heading).focus();
    }
  };
}
