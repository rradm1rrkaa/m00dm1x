import { analyzeAnswers, questionsFor } from '../services/recommendations.js';
import { button, field, node, runAction } from '../components/ui.js';

export function createQuiz(root, { leave, finish, setTheme, preference }) {
  let mode, questions, answers, index;

  function show(...children) {
    root.replaceChildren(...children);
    const title = root.querySelector('h1, h2');
    title.tabIndex = -1;
    title.focus();
  }

  function choose() {
    show(node('h1', '', 'Подобрать место'),
      node('p', 'm', 'Ответьте на несколько вопросов, чтобы получить подборку под ваши планы и настроение.'),
      button('Быстрый тест · 7 вопросов', () => start('quick'), 'btn c'),
      button('Полный тест · 25 вопросов', () => start('full')),
      button('Перейти к каталогу', leave));
  }

  function start(kind) {
    mode = kind;
    questions = questionsFor(kind);
    answers = [];
    index = 0;
    question();
  }

  function question() {
    const { data: [title, , options] } = questions[index];
    const bar = node('progress', 'qp');
    bar.max = questions.length;
    bar.value = index + 1;
    bar.setAttribute('aria-label', 'Прогресс теста');
    const progress = node('p', 'qn', 'Вопрос ' + (index + 1) + ' из ' + questions.length);
    const group = node('div', 'opts');
    options.forEach(([label], answer) => {
      const selected = answers[index] === answer;
      const item = button(label, () => {
        answers[index] = answer;
        if (index < questions.length - 1) {
          index++;
          question();
        } else result();
      }, selected ? 'btn c' : 'btn');
      item.setAttribute('aria-pressed', String(selected));
      group.append(item);
    });
    const nav = node('div', 'quiz-nav');
    nav.append(button('← Назад', () => {
      if (index > 0) { index--; question(); } else choose();
    }), button('Закрыть тест', leave));
    show(progress, bar, node('h2', '', title), group, nav);
  }

  function result() {
    const selection = analyzeAnswers(questions, answers);
    setTheme(selection.theme);
    const history = node('input');
    history.type = 'checkbox';
    history.checked = preference();
    const nav = node('div', 'quiz-nav');
    nav.append(button('← Изменить ответ', question), button('Начать заново', () => start(mode)));
    show(node('h2', '', selection.mood),
      node('p', 'm', 'Подборка учитывает ответы о настроении, планах и темпе отдыха. Причины появятся на карточках.'),
      field('Сохранять результаты в приватной истории этого браузера', history, 'check-row'),
      button('Показать подборку →', runAction(() => finish(selection, history.checked)), 'btn c'), nav, button('Открыть каталог', leave));
  }

  return { choose, start };
}
