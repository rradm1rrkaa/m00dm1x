export const byId = id => document.getElementById(id);

export function node(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

export function button(text, handler, className = 'btn') {
  const element = node('button', className, text);
  element.type = 'button';
  if (handler) element.addEventListener('click', handler);
  return element;
}

export function field(label, control, className = '') {
  const element = node('label', className);
  element.append(node('span', '', label), control);
  return element;
}

export function select(options) {
  const element = node('select');
  options.forEach(([value, label]) => {
    const option = node('option', '', label);
    option.value = value;
    element.append(option);
  });
  return element;
}

export function formatDate(date) {
  return date ? new Intl.DateTimeFormat('ru-KZ', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(date)) : '';
}

let toastTimer, previousToast;
export function toast(message) {
  const element = document.querySelector('dialog[open] [data-dialog-status]') || byId('toast');
  if (!element) return;
  clearTimeout(toastTimer);
  if (previousToast && previousToast !== element) previousToast.classList.remove('on');
  previousToast = element;
  element.textContent = message;
  element.classList.add('on');
  toastTimer = setTimeout(() => element.classList.remove('on'), 3200);
}

export function runAction(action) {
  return async event => {
    const trigger = event?.currentTarget;
    if (trigger?.disabled) return;
    if (trigger?.tagName === 'BUTTON') trigger.disabled = true;
    try { await action(event); } catch (error) { toast(error.message); } finally {
      if (trigger?.tagName === 'BUTTON') trigger.disabled = false;
    }
  };
}

export function link(text, href, className = 'btn') {
  const element = node('a', className, text);
  element.href = href;
  return element;
}

export function externalLink(text, href) {
  const element = link(text, href, 'vb');
  element.target = '_blank';
  element.rel = 'noopener noreferrer';
  return element;
}

export function avatar(profile, size = '') {
  const element = node('span', ('av2 ' + size).trim());
  element.setAttribute('aria-hidden', 'true');
  if (profile.avatar) {
    const image = node('img');
    image.alt = '';
    image.loading = 'lazy';
    image.src = profile.avatar;
    element.append(image);
  } else element.textContent = Array.from(profile.name)[0]?.toUpperCase() || '?';
  return element;
}
