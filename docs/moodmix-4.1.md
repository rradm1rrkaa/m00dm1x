# MoodMix 4.1

В 4.1 исправлены расположение header и footer, типографика бренда, качество обоев и перенос названий мест. Сценарии каталога, профиля, отзывов, галереи и Direct используют прежние сервисы и ключи локального хранения.

## Что исправлено

- **Header.** Внутренний контейнер занимает весь viewport. На десктопе CSS Grid ставит MoodMix у левого края, навигацию точно по центру, тему и профиль у правого края. На мобильных верхняя строка содержит бренд и настройки, нижняя — текстовую навигацию. Счётчики уведомлений остались на вкладках.
- **Footer.** Бренд и описание стоят слева, навигация по проекту — по центру, контакты — справа. На мобильном три блока идут вертикально. Контактные ссылки и нижняя информационная строка сохранены. При ширине 1920 px внешние отступы обоих блоков составляют 42 px.
- **Бренд.** Класс `brand-script` использует тот же локальный Marck Script, что и `Welcome to MoodMix`. Он применяется к словесному логотипу в header, в обоих footer и в тесте. Остальной интерфейс использует Montserrat.
- **Иконки.** Навигация, меню темы, каталожные вкладки, метаданные карточек, блок возможностей, реакции и текстовые действия используют преимущественно подписи. SVG остаются у избранного, управления галереей, кнопок назад и закрытия, отправки, шаринга, рейтинга и других элементов, где иконка сообщает о действии или состоянии. В разметке, стилях и модулях нет встроенных эмодзи.
- **Названия мест.** Размер заголовка учитывает ширину своей колонки. Текст переносится между словами. Проверены Центральный парк, Хан Шатыр, Национальный музей, Дворец мира и согласия и длинное название филармонии на шести ширинах от 320 до 1920 px.

## Обои

Каталог и Direct использовали JPEG-превью 1080 × 720 px. На широком экране `cover` увеличивал эти файлы, а сплошной слой затемнения Direct с непрозрачностью 63–74% приглушал цвет и фактуру. В каталоге переход от изображения к цвету страницы начинался на 62% высоты фона.

Из исходных PNG подготовлены WebP 1536 × 1024 px для широких экранов и портретные кадрирования 864 × 1024 px для телефонов. Файлы занимают 144–606 КиБ. Размеры и декодирование проверены в Chrome. При сравнении декодированных файлов с соответствующими областями исходников PSNR составляет 34,7–42,2 дБ. Старые JPEG сохранены и используются как превью на лендинге. Главная иллюстрация лендинга осталась прежней. В каталоге переход начинается у нижнего края изображения. В Direct фон отображается без общего слоя затемнения, а под датами и сообщениями используются локальные подложки.

## Скриншоты до и после

Настольные снимки сделаны в Chrome при 1920 × 1080 и 1440 × 960, мобильные — в эмуляции Chrome при 390 × 844. Физические устройства и Safari остаются отдельной проверкой.

| Экран | До | После |
|---|---|---|
| Header · 1920 px | [До](screenshots/v4.1/before/header-1920.jpg) | [После](screenshots/v4.1/after/header-1920.jpg) |
| Header · 1440 px | [До](screenshots/v4.1/before/header-1440.jpg) | [После](screenshots/v4.1/after/header-1440.jpg) |
| Мобильный header · 390 px | [До](screenshots/v4.1/before/header-mobile.jpg) | [После](screenshots/v4.1/after/header-mobile.jpg) |
| Footer · 1920 px | [До](screenshots/v4.1/before/footer-1920.jpg) | [После](screenshots/v4.1/after/footer-1920.jpg) |
| Footer · 1440 px | [До](screenshots/v4.1/before/footer-1440.jpg) | [После](screenshots/v4.1/after/footer-1440.jpg) |
| Мобильный footer · 390 px | [До](screenshots/v4.1/before/footer-mobile.jpg) | [После](screenshots/v4.1/after/footer-mobile.jpg) |
| Лендинг · 1440 px | [До](screenshots/v4.1/before/landing-1440.jpg) | [После](screenshots/v4.1/after/landing-1440.jpg) |
| Мобильный лендинг | [До](screenshots/v4.1/before/landing-mobile.jpg) | [После](screenshots/v4.1/after/landing-mobile.jpg) |
| Меню темы · 1440 px | [До](screenshots/v4.1/before/theme-menu-1440.jpg) | [После](screenshots/v4.1/after/theme-menu-1440.jpg) |
| Мобильное меню темы | [До](screenshots/v4.1/before/theme-menu-mobile.jpg) | [После](screenshots/v4.1/after/theme-menu-mobile.jpg) |
| Каталог · Закат | [До](screenshots/v4.1/before/catalog-sunset-1440.jpg) | [После](screenshots/v4.1/after/catalog-sunset-1440.jpg) |
| Мобильный каталог · Закат | [До](screenshots/v4.1/before/catalog-sunset-mobile.jpg) | [После](screenshots/v4.1/after/catalog-sunset-mobile.jpg) |
| Каталог · Веселье | [До](screenshots/v4.1/before/catalog-beach.jpg) | [После](screenshots/v4.1/after/catalog-beach.jpg) |
| Direct · Грусть | [До](screenshots/v4.1/before/direct-night.jpg) | [После](screenshots/v4.1/after/direct-night.jpg) |
| Direct · Восход | [До](screenshots/v4.1/before/direct-sunrise.jpg) | [После](screenshots/v4.1/after/direct-sunrise.jpg) |
| Мобильный Direct · Восход | [До](screenshots/v4.1/before/direct-sunrise-mobile.jpg) | [После](screenshots/v4.1/after/direct-sunrise-mobile.jpg) |
| Центральный парк · 1440 px | [До](screenshots/v4.1/before/central-park-1440.jpg) | [После](screenshots/v4.1/after/central-park-1440.jpg) |
| Мобильная страница Центрального парка | [До](screenshots/v4.1/before/central-park-mobile.jpg) | [После](screenshots/v4.1/after/central-park-mobile.jpg) |
| Хан Шатыр · 1440 px | [До](screenshots/v4.1/before/khan-shatyr.jpg) | [После](screenshots/v4.1/after/khan-shatyr.jpg) |

## Проверка

`npm test` — 21 пройденный тест. `npm run test:e2e` — 46 пройденных тестов в настольном и мобильном Chrome. `git diff --check` — без замечаний. Дополнительно проверены декодирование 17 изображений, загрузка шрифтов, выбор обоев при смене ширины окна и все 38 ссылок на скриншоты.

## Изменённые файлы

- Разметка — `app.html`, `index.html`.
- Стили — `css/app.css`, `css/base.css`, `css/landing.css`, `css/messenger.css`, `css/navigation.css`, `css/place.css`, `css/quiz.css`, `css/tokens.css`.
- Темы — `js/theme/atmosphere.js`, `js/theme/theme.js`.
- Интерфейс — `js/features/catalog.js`, `js/features/chat-wallpaper.js`, `js/features/messenger.js`, `js/features/place-detail.js`, `js/features/place-info.js`, `js/features/place-invitation.js`, `js/features/place-social.js`, `js/features/profiles.js`, `js/features/quiz.js`.
- Ресурсы — восемь `assets/images/wallpaper-*.webp`, снимки в `docs/screenshots/v4.1/`.
- Проверки и отчёт — `tests/place.spec.js`, `docs/moodmix-4.1.md`.
