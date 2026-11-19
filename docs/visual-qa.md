# Визуальная проверка MoodMix

Снимки сделаны в Google Chrome с демонстрационными профилями. Размер десктопного окна — 1440 × 960 px. Размер мобильного — 390 × 844 px. Анимации при съёмке зафиксированы в режиме reduced motion. Для сравнения до редизайна были сняты лендинг, каталог, опросник, профиль и чат из версии `ecfc81c`.

| Экран | Десктоп | Мобильный |
|---|---|---|
| Лендинг | [Снимок](screenshots/desktop-01-landing.jpg) | [Снимок](screenshots/mobile-01-landing.jpg) |
| Демонстрационные отзывы | [Снимок](screenshots/desktop-02-reviews.jpg) | [Снимок](screenshots/mobile-02-reviews.jpg) |
| Кнопка демо | [Снимок](screenshots/desktop-03-demo-cta.jpg) | [Снимок](screenshots/mobile-03-demo-cta.jpg) |
| Каталог | [Снимок](screenshots/desktop-04-catalog.jpg) | [Снимок](screenshots/mobile-04-catalog.jpg) |
| Выбор теста | [Снимок](screenshots/desktop-05-quiz-choice.jpg) | [Снимок](screenshots/mobile-05-quiz-choice.jpg) |
| Вопрос | [Снимок](screenshots/desktop-06-question.jpg) | [Снимок](screenshots/mobile-06-question.jpg) |
| Автоматический восход | [Снимок](screenshots/desktop-07-auto-sunrise.jpg) | [Снимок](screenshots/mobile-07-auto-sunrise.jpg) |
| Результат | [Снимок](screenshots/desktop-08-result.jpg) | [Снимок](screenshots/mobile-08-result.jpg) |
| Детали места | [Снимок](screenshots/desktop-09-place.jpg) | [Снимок](screenshots/mobile-09-place.jpg) |
| Профиль | [Снимок](screenshots/desktop-10-profile.jpg) | [Снимок](screenshots/mobile-10-profile.jpg) |
| Редактирование профиля | [Снимок](screenshots/desktop-11-profile-editor.jpg) | [Снимок](screenshots/mobile-11-profile-editor.jpg) |
| Друзья | [Снимок](screenshots/desktop-12-friends.jpg) | [Снимок](screenshots/mobile-12-friends.jpg) |
| Диалоги | [Снимок](screenshots/desktop-13-inbox.jpg) | [Снимок](screenshots/mobile-13-inbox.jpg) |
| Переписка | [Снимок](screenshots/desktop-14-thread.jpg) | [Снимок](screenshots/mobile-14-thread.jpg) |
| Приглашение | [Снимок](screenshots/desktop-15-invitation.jpg) | [Снимок](screenshots/mobile-15-invitation.jpg) |
| Космос | [Снимок](screenshots/desktop-16-theme-sad.jpg) | [Снимок](screenshots/mobile-16-theme-sad.jpg) |
| Пляж | [Снимок](screenshots/desktop-16-theme-fun.jpg) | [Снимок](screenshots/mobile-16-theme-fun.jpg) |

## Изменённые файлы

| Область | Файлы |
|---|---|
| Разметка | `index.html`, `app.html` |
| Дизайн-система и стили | `css/tokens.css`, `css/base.css`, `css/showcase.css`, `css/navigation.css`, `css/app.css`, `css/landing.css`, `css/quiz.css`, `css/profile.css`, `css/messenger.css`, `css/sky.css` |
| Компоненты | `js/components/icons.js`, `js/components/modal.js` |
| Интерфейс | `js/main.js`, `js/landing.js`, `js/features/catalog.js`, `js/features/quiz.js`, `js/features/profiles.js`, `js/features/social.js`, `js/features/messenger.js` |
| Сцены и сохранение темы | `js/theme/theme.js`, `js/theme/sky.js`, `js/services/recommendations.js`, `js/services/storage.js` |
| Ресурсы и запуск | `assets/favicon.svg`, три файла Montserrat WOFF2, `assets/fonts/MONTSERRAT-OFL.txt`, `scripts/serve.js` |
| Проверки и документация | `playwright.config.js`, `tests/catalog.test.js`, `tests/showcase.spec.js`, `README.md`, `docs/visual-qa.md`, `docs/screenshots/` |

После первой проверки уточнены выравнивание карточек и кнопок, подпись селектора темы, читаемость мобильного каталога, размещение фильтров, внешний вид редактора аватара и положение короткой переписки относительно поля ввода. Восход начинается на рассвете уже на первом экране, а его небо продолжает меняться при прокрутке.

Автоматические проверки выполняются в Chrome с десктопным и мобильным профилями. Физические устройства, Safari и системная экранная клавиатура остаются отдельной проверкой. Для клавиатуры в эмуляции проверено расположение поля ввода после уменьшения высоты окна.

Montserrat и временный Marck Script поставляются локально. Доступный выпуск Pablo Co - Script помечен как предназначенный для личного использования, а ссылка продавца, указанная в описании выпуска, недоступна. Для замены Marck Script потребуется файл Pablo Co - Script с правом веб-встраивания и распространения. [Условия доступного выпуска](https://www.cufonfonts.com/font/pablo-co-script) · [Указанная карточка продавца](https://muwattastudio2.gumroad.com/l/mufws)
