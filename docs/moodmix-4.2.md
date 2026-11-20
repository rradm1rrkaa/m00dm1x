# MoodMix 4.2

## Сцены и переключение

На лендинге палитра раньше менялась до загрузки изображения. При ошибке декодирования скрипт убирал новый слой, а под ним оставался закат, заданный в CSS. Теперь стартовый закат находится в HTML как обычный слой. На обеих страницах один модуль декодирует следующий кадр, применяет сцену и палитру одновременно и плавно проявляет новый слой поверх предыдущего.

Ручная настройка сохраняется в браузере и применяется на обеих страницах. В режиме «Авто» сцена реагирует на ответы теста и учитывает сохранённый результат профиля. Между страницами результат сохраняется при согласии на историю. Сцена по умолчанию — закат. При сбое движок пробует локальный файл той же атмосферы и пишет предупреждение в консоль. Если все кандидаты недоступны, сохраняется видимая сцена и предыдущий ручной выбор. Рукописное приветствие продолжает работать в исходной разметке.

| Тема | Сцена | Интерфейс и Direct |
| --- | --- | --- |
| Восход | Солнце поднимается после активации, два облачных слоя медленно смещаются | Кремовые панели, тёплые акценты и персиковые пузыри сообщений |
| Закат | Солнце опускается, движутся облака | Сливовые поверхности, медные акценты и розово-сливовые пузыри |
| Грусть | Планета и туманность смещаются, две группы звёзд меняют яркость | Синие поверхности, сиреневые акценты и пузыри |
| Веселье | Крона пальмы покачивается, волны и блики движутся | Песочные панели, бирюзовые акценты и мятные пузыри |

Солнце движется один раз после активации. Облака, волны и звёзды работают на CSS, часть эффектов рисуется SVG. Анимации приостанавливаются вне видимой области. При `prefers-reduced-motion: reduce` отображаются неподвижные иллюстрации без crossfade.

В каталоге и подборке фон виден между тематическими панелями поиска, навигации и карточек. Страница места использует эту же сцену вокруг галереи, практической информации, описания, реакций, отзывов и приглашений. Фотографии сохраняют естественные цвета. Профиль наследует сцену и цветовые токены приложения. Для Direct подготовлены отдельные статические кадры с настольной и портретной композицией. Их можно привязать к текущей теме либо выбрать отдельно вместе с цветами пузырей. Доступны четыре иллюстрации, однотонная заливка и прежний узор.

## Фотографии

В галерее, карточках и приглашениях используются локальные варианты через `srcset`. Полноэкранная галерея показывает кадр целиком. WebP сделаны уменьшением и перекодированием опубликованных оригиналов. Для производных сохраняется лицензия оригинала. При ошибке загрузки используется запасной файл той же фотографии. Если и он недоступен, галерея сообщает об ошибке и оставляет доступной навигацию, а карточка показывает иллюстрацию.

| Место и изображение | Автор | Лицензия | Широкий WebP |
| --- | --- | --- | ---: |
| [Байтерек в вечерней подсветке](https://commons.wikimedia.org/wiki/File:Baiterek_monument_at_night.jpg) | Dauren Nabijan | CC0 | 1080 px, ширина оригинала |
| [Интерьер Байтерека](https://commons.wikimedia.org/wiki/File:Interior_of_Bayterek_Tower_05.jpg) | Davide Mauro | CC BY-SA 4.0 | 1920 px |
| [Башня Байтерека, новый снимок в галерее](https://commons.wikimedia.org/wiki/File:B%C3%A4iterek_tower.jpg) | Dauren Nabijan | CC0 | 1920 px |
| [Хан Шатыр](https://commons.wikimedia.org/wiki/File:Khan_Shatyr.jpg) | Quarot | CC0 | 1920 px |
| [Ботанический сад](https://commons.wikimedia.org/wiki/File:A_view_of_Nur-Sultan%27s_Botanical_Garden.jpg) | Demir Berisha | CC BY-SA 4.0 | 1920 px |
| [Цветы Ботанического сада](https://commons.wikimedia.org/wiki/File:Flowers_at_sunset_in_Botanical_Garden_Nur-Sultan_city.jpg) | DiamondMoore | CC BY-SA 4.0 | 1920 px |
| [Центральный парк слева от Есиля, архив 2007 года](https://commons.wikimedia.org/wiki/File:Astana-Ishim-7802.jpg) | Vmenkov | CC BY-SA 3.0 | 1920 px |
| [Атриум Национального музея](https://commons.wikimedia.org/wiki/File:National_Museum_of_the_Republic_of_Kazakhstan_01.jpg) | Davide Mauro | CC BY-SA 4.0 | 1920 px |
| [Зал Дворца мира и согласия, новый снимок в галерее](https://commons.wikimedia.org/wiki/File:Hall%2C_Astana_Pyramid%2C_2026.jpg) | Bdx | CC0 | 1920 px |
| [Набережная Есиля](https://commons.wikimedia.org/wiki/File:Astana_Esil_view.jpg) | Dauren Nabijan | CC0 | 1920 px |

Мобильные варианты имеют ширину 720 px. Лицензии по ссылкам в галерее относятся к фотографиям. Для Дворца выбран снимок зала. В категории здания на Wikimedia Commons указаны ограничения свободы панорамы. [Категория Дворца](https://commons.wikimedia.org/wiki/Category:Palace_of_Peace_and_Reconciliation)

## Изменённые файлы

| Область | Файлы |
| --- | --- |
| Переходы и состояние | `js/theme/theme.js`, `js/theme/themes.js`, `js/theme/atmosphere.js`, `js/theme/scene-controller.js`, `js/landing.js`, `js/main.js`, `index.html`, `app.html` |
| Сцены и тематические компоненты | `css/atmosphere.css`, `css/tokens.css`, `css/landing.css`, `css/app.css`, `css/place.css`, `css/quiz.css`, `css/profile.css`, `css/messenger.css` |
| Direct | `js/features/chat-wallpaper.js`, `js/features/messenger.js`, `assets/images/direct-*.webp` |
| Фотографии | `js/components/place-photo.js`, `js/data/place-details.js`, `js/features/place-gallery.js`, `js/features/catalog.js`, `js/features/place-invitation.js`, файлы `*-720.webp`, `*-wide.webp` и резервные кадры в `assets/images/` |
| Тесты и отчёт | `tests/atmosphere.spec.js`, `tests/place.spec.js`, `README.md`, `docs/moodmix-4.2.md`, `docs/screenshots/v4.2/` |

## Браузерная проверка

Во всех четырёх темах проверены лендинг, каталог, подборка, страница Ботанического сада, профиль и активный диалог на ширинах 320, 390, 768, 1440 и 1920 px. Проверка сравнивала реально декодированные изображения, ширину документа и ошибки консоли и сети. Playwright сравнил положение и прозрачность движущихся слоёв в разные моменты времени и проверил отключение анимаций при reduced motion. На мобильном глобальная тема доступна после возврата из открытого диалога к списку чатов.

В каталоге при 1440 px за 730 мс солнечный слой поднялся на 4,2 px на восходе и опустился на 3,4 px на закате. При ширинах 1440 и 390 px зафиксировано движение облаков, пальмы, волн, бликов, планеты и туманности, а также изменение яркости звёзд. При включении reduced motion активные CSS-анимации исчезли.

`npm test` — 21 тест. `npm run test:e2e` — 58 тестов в проектах desktop и mobile. `git diff --check` прошла без замечаний.

| Тема | Лендинг | Каталог | Подборка | Место | Профиль | Direct |
| --- | --- | --- | --- | --- | --- | --- |
| Восход | [desktop](screenshots/v4.2/sunrise-landing-1440.jpg) · [mobile](screenshots/v4.2/sunrise-landing-390.jpg) | [desktop](screenshots/v4.2/sunrise-catalog-1440.jpg) · [mobile](screenshots/v4.2/sunrise-catalog-390.jpg) | [desktop](screenshots/v4.2/sunrise-recommendations-1440.jpg) · [mobile](screenshots/v4.2/sunrise-recommendations-390.jpg) | [desktop](screenshots/v4.2/sunrise-place-1440.jpg) · [mobile](screenshots/v4.2/sunrise-place-390.jpg) | [desktop](screenshots/v4.2/sunrise-profile-1440.jpg) · [mobile](screenshots/v4.2/sunrise-profile-390.jpg) | [desktop](screenshots/v4.2/sunrise-direct-1440.jpg) · [mobile](screenshots/v4.2/sunrise-direct-390.jpg) |
| Закат | [desktop](screenshots/v4.2/sunset-landing-1440.jpg) · [mobile](screenshots/v4.2/sunset-landing-390.jpg) | [desktop](screenshots/v4.2/sunset-catalog-1440.jpg) · [mobile](screenshots/v4.2/sunset-catalog-390.jpg) | [desktop](screenshots/v4.2/sunset-recommendations-1440.jpg) · [mobile](screenshots/v4.2/sunset-recommendations-390.jpg) | [desktop](screenshots/v4.2/sunset-place-1440.jpg) · [mobile](screenshots/v4.2/sunset-place-390.jpg) | [desktop](screenshots/v4.2/sunset-profile-1440.jpg) · [mobile](screenshots/v4.2/sunset-profile-390.jpg) | [desktop](screenshots/v4.2/sunset-direct-1440.jpg) · [mobile](screenshots/v4.2/sunset-direct-390.jpg) |
| Грусть | [desktop](screenshots/v4.2/cosmos-landing-1440.jpg) · [mobile](screenshots/v4.2/cosmos-landing-390.jpg) | [desktop](screenshots/v4.2/cosmos-catalog-1440.jpg) · [mobile](screenshots/v4.2/cosmos-catalog-390.jpg) | [desktop](screenshots/v4.2/cosmos-recommendations-1440.jpg) · [mobile](screenshots/v4.2/cosmos-recommendations-390.jpg) | [desktop](screenshots/v4.2/cosmos-place-1440.jpg) · [mobile](screenshots/v4.2/cosmos-place-390.jpg) | [desktop](screenshots/v4.2/cosmos-profile-1440.jpg) · [mobile](screenshots/v4.2/cosmos-profile-390.jpg) | [desktop](screenshots/v4.2/cosmos-direct-1440.jpg) · [mobile](screenshots/v4.2/cosmos-direct-390.jpg) |
| Веселье | [desktop](screenshots/v4.2/beach-landing-1440.jpg) · [mobile](screenshots/v4.2/beach-landing-390.jpg) | [desktop](screenshots/v4.2/beach-catalog-1440.jpg) · [mobile](screenshots/v4.2/beach-catalog-390.jpg) | [desktop](screenshots/v4.2/beach-recommendations-1440.jpg) · [mobile](screenshots/v4.2/beach-recommendations-390.jpg) | [desktop](screenshots/v4.2/beach-place-1440.jpg) · [mobile](screenshots/v4.2/beach-place-390.jpg) | [desktop](screenshots/v4.2/beach-profile-1440.jpg) · [mobile](screenshots/v4.2/beach-profile-390.jpg) | [desktop](screenshots/v4.2/beach-direct-1440.jpg) · [mobile](screenshots/v4.2/beach-direct-390.jpg) |

[Запись переключения тем в браузере](screenshots/v4.2/scenes.webm). Видео показывает фактические переходы и работу CSS-анимаций.

Проверка выполнялась в Google Chrome на Windows и через эмуляцию Pixel 7. Safari, Firefox и физические мобильные устройства не проверялись. В галерее Центрального парка используется архивный снимок. Настольные фоны каталога имеют исходную ширину 1536 px и при необходимости масштабируются под окно.
