import { analyzeAnswers, questionsFor } from '../services/recommendations.js';
import { button, field, node, runAction } from '../components/ui.js';
import { icon } from '../components/icons.js';

export function createQuiz(root, { leave, finish, setTheme, preference }) {
  let mode, questions, answers, index;

  function show(...children) {
    const panel = node('div', 'quiz-panel surface-panel');
    panel.append(...children);
    root.replaceChildren(panel);
    const title = panel.querySelector('h1, h2');
    title.tabIndex = -1;
    title.focus({ preventScroll: true });
    if (panel.getBoundingClientRect().top < 0) panel.scrollIntoView({ block: 'start' });
  }

  function choice(name, length, summary, glyph, action) {
    const item = button('', action, 'quiz-choice');
    const copy = node('span', 'quiz-choice-copy');
    copy.append(node('strong', '', name), node('small', 'm', length), node('span', 'm', summary));
    item.append(icon(glyph), copy, icon('chevron'));
    return item;
  }

  function choose() {
    const choices = node('div', 'quiz-choices');
    choices.append(choice('Быстрый подбор', '7 вопросов', 'Для спонтанной прогулки и планов на сегодня.', 'spark', () => start('quick')),
      choice('Подробный подбор', '25 вопросов', 'Найдите место с учётом привычек и предпочтений.', 'compass', () => start('full')));
    show(node('h1', '', 'Какой отдых вам подойдёт сегодня?'), choices,
      button('Перейти к каталогу', leave, 'btn quiet'));
  }

  function start(kind) {
    mode = kind;
    questions = questionsFor(kind);
    answers = [];
    index = 0;
    setTheme(null);
    question();
  }

  function question() {
    const { id, data: [title, , options] } = questions[index];
    const bar = node('progress');
    bar.max = questions.length;
    bar.value = index + 1;
    bar.setAttribute('aria-label', 'Прогресс теста');
    const progress = node('div', 'quiz-progress');
    progress.append(node('span', 'quiz-wordmark', 'MoodMix'), node('span', 'm', 'Вопрос ' + (index + 1) + ' из ' + questions.length));
    const group = node('div', 'opts');
    options.forEach(([label], answer) => {
      const selected = answers[index] === answer;
      const item = button('', () => {
        answers[index] = answer;
        for (const option of group.querySelectorAll('button')) {
          option.setAttribute('aria-pressed', String(option === item));
          option.disabled = true;
        }
        previous.disabled = true;
        if ([2, 9, 11, 24].includes(id) && questions.some(({ id }, position) => id === 2 && answers[position] !== undefined)) {
          setTheme(analyzeAnswers(questions.slice(0, index + 1), answers).theme);
        }
        const advance = () => {
          if (!item.isConnected || root.hidden) return;
          if (index < questions.length - 1) { index++; question(); } else result();
        };
        if (matchMedia('(prefers-reduced-motion: reduce)').matches) advance();
        else setTimeout(advance, 120);
      }, 'quiz-answer');
      const indicator = node('span', 'choice-indicator');
      indicator.append(icon('check'));
      item.append(node('span', '', label), indicator);
      item.setAttribute('aria-pressed', String(selected));
      group.append(item);
    });
    const nav = node('div', 'quiz-nav');
    const previous = button('Назад', () => {
      if (index > 0) { index--; question(); } else choose();
    }, 'btn quiet');
    previous.prepend(icon('back'));
    nav.append(previous, button('Закрыть тест', leave, 'btn quiet'));
    show(progress, bar, node('h2', '', title), group, nav);
  }

  function result() {
    const selection = analyzeAnswers(questions, answers);
    setTheme(selection.theme);
    const history = node('input');
    history.type = 'checkbox';
    history.checked = preference();
    const settings = node('details', 'result-settings');
    settings.append(node('summary', '', 'Настройки истории'), field('Сохранять результаты в приватной истории этого браузера', history, 'check-row'));
    const nav = node('div', 'quiz-nav');
    nav.append(button('Изменить ответ', question, 'btn quiet'), button('Начать заново', () => start(mode), 'btn quiet'));
    const primary = button('Показать подборку', runAction(() => finish(selection, history.checked)), 'btn c');
    primary.append(icon('arrow'));
    const actions = node('div', 'field-row result-actions');
    actions.append(primary, button('Открыть каталог', leave));
    show(node('h2', '', selection.mood),
      node('p', 'm', 'Мы учли ваш темп, планы и предпочтения. На карточках будет видно, почему каждое место попало в подборку.'),
      actions, settings, nav);
  }

  return { choose, start };
}
