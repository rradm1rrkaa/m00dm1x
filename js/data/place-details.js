const tourism = slug => 'https://visitastana.kz/ru/about-city/what-to-see/' + slug + '/';
const cityMap = 'https://visitastana.kz/ru/map/';
const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const daily = (start, end) => Object.fromEntries(days.map(day => [day, [[start, end]]]));
const commons = (filename, page, alt, author, license = 'CC BY-SA 4.0') => ({
  src: 'assets/images/' + filename + '.jpg', alt, author, license,
  source: 'https://commons.wikimedia.org/wiki/File:' + page,
  licenseUrl: license === 'CC0' ? 'https://creativecommons.org/publicdomain/zero/1.0/' : 'https://creativecommons.org/licenses/by-sa/4.0/'
});

// Published address, map and opening hours only. Suggested visit lengths are editorial.
export const verifiedPlaces = {
  'mm-001': {
    address: 'Проспект Кабанбай Батыра, напротив стадиона «Астана Арена»',
    source: tourism('botanicheskiy-sad'), mapUrl: 'https://2gis.kz/nur_sultan/geo/70030076141234916',
    openingHours: daily(9 * 60, 20 * 60), durationMinutes: 90,
    description: 'Прогулочные аллеи и зелёные зоны рядом с «Астана Ареной».',
    images: [
      commons('botanical-garden-view', 'A_view_of_Nur-Sultan%27s_Botanical_Garden.jpg', 'Вид на Ботанический сад Астаны', 'Demir Berisha'),
      commons('botanical-garden-flowers', 'Flowers_at_sunset_in_Botanical_Garden_Nur-Sultan_city.jpg', 'Цветы в Ботаническом саду на закате', 'DiamondMoore')
    ]
  },
  'mm-002': {
    address: 'Проспект Тауелсиздик, 54', source: 'https://nmrk.kz/ru/', mapUrl: 'https://2gis.kz/astana/firm/70000001018608940',
    openingHours: { ...daily(10 * 60, 18 * 60), Mon: [] }, durationMinutes: 120,
    description: 'Музей истории и культуры Казахстана. Для посещения выставок уточняйте билеты на сайте музея.',
    price: { status: 'paid', min: null, max: null, currency: 'KZT' }
  },
  'mm-004': { address: 'Проспект Тауелсиздик, 57', source: tourism('dvorets-mira-i-soglasiya'), durationMinutes: 90 },
  'mm-011': { address: 'Улица Кенесары, 32', source: tourism('gosudarstvennaya-akademicheskaya-filarmoniya-imeni-erkegali-rakhmadieva') },
  'mm-028': { address: 'Проспект Республики, 34', source: tourism('dvorets-zhastar') },
  'mm-038': { address: 'Набережная реки Есиль', source: cityMap, durationMinutes: 60 },
  'mm-039': {
    address: 'Район Нура, набережная реки Есиль', source: tourism('tsentralnyy-park'),
    mapUrl: 'https://go.2gis.com/PFSv8', openingHours: daily(10 * 60, 21 * 60), durationMinutes: 90
  },
  'mm-040': { address: 'Проспект Тауелсиздик, вокруг Дворца Мира и Согласия', source: tourism('prezidentskiy-park'), durationMinutes: 60 },
  'mm-042': { address: 'Бульвар Нуржол', source: cityMap, durationMinutes: 45 },
  'mm-049': { address: 'Проспект Тауелсиздик, пересечение с улицей А. Байтурсынова', source: tourism('monument-aza-eli-'), durationMinutes: 30 },
  'mm-050': { address: 'Есильский район, проспект Мангилик Ел', source: tourism('triumfalnaya-arka-m-gilik-el9679'), durationMinutes: 30 },
  'mm-051': { address: 'Улица Сарайшык, 13/1', source: tourism('park-zhetysu'), durationMinutes: 60 },
  'mm-052': { address: 'Улица М. Толебаева, район Алматы', source: tourism('park-zheruyyk'), durationMinutes: 60 },
  'mm-053': { address: 'Правый берег Ишима, возле парка Бауыржана Момышулы', source: tourism('triatlon-park-astana'), durationMinutes: 75 },
  'mm-054': { address: 'Проспект Тауелсиздик', source: tourism('monument-stena-mira'), durationMinutes: 30 },
  'mm-056': { address: 'Проспект Тауелсиздик, 52', source: tourism('dvorets-nezavisimosti') },
  'mm-057': { address: 'Проспект Туран, 37', source: cityMap, openingHours: daily(10 * 60, 22 * 60) },
  'mm-170': {
    address: 'Бульвар Нуржол, 14', source: 'https://a-vm.kz/objects/bayterek/',
    mapUrl: 'https://2gis.kz/nur_sultan/firm/70000001021365759', durationMinutes: 60,
    openingHours: daily(10 * 60, 21 * 60), summerHours: daily(10 * 60, 22 * 60),
    price: { status: 'paid', min: 1250, max: 2500, currency: 'KZT' },
    images: [
      commons('bayterek-night', 'Baiterek_monument_at_night.jpg', 'Байтерек в вечерней подсветке', 'Dauren Nabijan', 'CC0'),
      commons('bayterek-interior', 'Interior_of_Bayterek_Tower_05.jpg', 'Интерьер монумента Байтерек', 'Davide Mauro')
    ]
  },
  'mm-182': { address: 'Бульвар Нуржол, 1', source: tourism('akorda'), durationMinutes: 30 }
};

const park = ['walk', 'outdoor', 'city', 'solo', 'pair', 'family'];
const quietPark = ['quiet', ...park];
export const placeTraits = {
  'mm-001': quietPark,
  'mm-002': ['quiet', 'indoor', 'culture', 'solo', 'family'],
  'mm-004': ['quiet', 'indoor', 'culture', 'pair'],
  'mm-007': ['culture', 'indoor', 'pair'],
  'mm-011': ['culture', 'indoor', 'pair'],
  'mm-028': ['culture', 'indoor', 'friends'],
  'mm-038': park, 'mm-039': [...park, 'active'], 'mm-040': quietPark, 'mm-042': park,
  'mm-049': [...park, 'culture'], 'mm-050': [...park, 'culture'], 'mm-051': quietPark,
  'mm-052': [...park, 'active'], 'mm-053': [...park, 'active', 'friends'],
  'mm-054': ['walk', 'outdoor', 'city', 'culture'],
  'mm-056': ['culture', 'city'], 'mm-057': ['indoor', 'city', 'family', 'friends'],
  'mm-077': ['indoor', 'active', 'friends', 'family'],
  'mm-113': ['quiet', 'nature', 'outdoor', 'walk', 'friends', 'family'],
  'mm-123': ['quiet', 'nature', 'outdoor', 'pair', 'family'],
  'mm-124': ['active', 'nature', 'outdoor', 'friends'],
  'mm-126': ['quiet', 'nature', 'outdoor', 'walk', 'family'],
  'mm-170': ['culture', 'city', 'indoor', 'family', 'pair'],
  'mm-182': ['culture', 'walk', 'outdoor', 'city']
};
