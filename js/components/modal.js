import { button, node, runAction } from './ui.js';

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
    if (opener?.isConnected) opener.focus();
    else document.getElementById('q')?.focus();
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
    show(title, elements, { back, className = '', preserveFocus = null } = {}) {
      if (!dialog.open) opener = document.activeElement;
      const heading = node('h2', 'dialog-title', title);
      heading.id = 'dialog-title';
      heading.tabIndex = -1;
      const actions = node('div', 'dialog-actions');
      if (back) actions.append(button('← Назад', runAction(back)));
      actions.append(button('Закрыть', close));
      content.className = ('pc ' + className).trim();
      content.replaceChildren(heading, ...elements, actions);
      if (!dialog.open) dialog.showModal();
      document.documentElement.classList.add('lock');
      (preserveFocus && [...content.querySelectorAll('button')].find(item => item.textContent === preserveFocus) || heading).focus();
    }
  };
}
