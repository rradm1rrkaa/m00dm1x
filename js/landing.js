import { createLocalApi } from './services/local-api.js';
import { createTheme } from './theme/theme.js';
import { byId, node, toast } from './components/ui.js';

createTheme(createLocalApi(), byId('theme-slot'), toast).catch(error => toast(error.message));

const title = byId('wt');
const letters = title.textContent;
title.setAttribute('aria-label', letters);
title.replaceChildren();
let letterIndex = 0;
letters.split(' ').forEach((word, index) => {
  if (index) title.append(' ');
  const part = node('span', 'w');
  part.setAttribute('aria-hidden', 'true');
  for (const letter of word) {
    const item = node('span', 'lt', letter);
    item.style.animationDelay = (.18 + letterIndex++ * .045) + 's';
    part.append(item);
  }
  title.append(part);
});

const sections = [...document.querySelectorAll('.rvl')];
if (matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) {
  sections.forEach(section => section.classList.add('in'));
} else {
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.classList.add('in');
        observer.unobserve(entry.target);
      }
    }
  }, { threshold: .08 });
  sections.forEach(section => observer.observe(section));
}
