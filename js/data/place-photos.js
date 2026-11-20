const wikimediaPhotos = [
  ["005","Астана, Мечеть Хазрет Султан - panoramio (1).jpg","Мечеть Хазрет Султан в Астане","Сергей Марцынюк","CC BY-SA 3.0",1600],
  ["007","Inside Astana's New Opera House (8282915665).jpg","Зрительный зал театра «Астана Опера»","Ken and Nyetta","CC BY 2.0",1600],
  ["008","The Museum of the first president of the Republic of Kazakhstan.jpg","Музей Первого Президента в Астане","CentrAsia","CC0",605],
  ["010","Palace of Arts Shabyt.jpg","Дворец искусств «Шабыт»","Ken and Nyetta","CC BY 2.0",1600],
  ["012","Astana Grand Mosque - main prayer hall view.jpg","Главный молитвенный зал Большой мечети Астаны","Lucha","CC BY-SA 4.0",1600],
  ["014","Memorial on the site of the ALZhIR.jpg","Мемориал на территории бывшего лагеря АЛЖИР","t_y_l","CC BY-SA 2.0",1600],
  ["016","Downtown Astana With The National Concert Hall (6246435844).jpg","Центральный концертный зал «Казахстан» слева, вид с Есиля","Ken and Nyetta","CC BY 2.0",1600],
  ["029","Barys Arena.jpg","Хоккейный матч на «Барыс Арене»","ChelseaFunNumberOne","CC BY-SA 4.0",1600],
  ["040","PresidentialParkAstana.jpg","Президентский парк с моста «Арқар»","TóastyTwo","CC BY 4.0",960],
  ["042","Nurjol Boulevard Astana.jpg","Бульвар Нұржол в Астане","Dauren Nabijan","CC0",1600],
  ["047","Этно-мемориальный комплекс «Карта Казахстана Атамекен».JPG","Парк миниатюр «Атамекен»","Toshishiro","CC BY-SA 3.0",1600],
  ["058","ТРЦ MEGA Silk-way и отель Hilton.jpg","Торговый центр MEGA Silk Way (слева) и отель Hilton, вид из Экспо-парка","Шалкер Гам","CC BY-SA 4.0",1600],
  ["113","Боровое (Бурабай), вид со скалы Болектау.jpg","Панорама Бурабая со скалы Болектау","Евгений Емельянов","CC BY-SA 4.0",1600],
  ["114","Sunset in Korgalzhyn Nature Reserve.jpg","Солнце над водой в Коргалжынском заповеднике","Dildakhmet","CC BY-SA 4.0",1280],
  ["117","Zerendi (lake) 01.jpg","Озеро Зеренда в национальном парке Кокшетау","PlainVector","CC BY-SA 4.0",1280],
  ["118","Ерментау.JPG","Горы Ерейментау","Нарожный Андрей","CC BY-SA 4.0",800],
  ["120","Имантау осень.jpg","Озеро Имантау осенью, национальный парк Кокшетау","Natgeokz","CC BY-SA 4.0",1280],
  ["123","Озеро Щучье, Бурабайский район.jpg","Озеро Щучье в Бурабайском районе","Intero Tillen","CC BY-SA 4.0",1280],
  ["124","Окжетпес Боровое.jpg","Скала Окжетпес на берегу озера Бурабай","Dots foto","CC BY-SA 4.0",1280],
  ["125","Боровое. Большое Чебачье озеро.jpg","Залив Большого Чебачьего озера","Евгений Емельянов","CC BY-SA 4.0",1280],
  ["126","Вид на озеро Боровое с вершины горы Болектау.jpg","Озеро Боровое с горы Болектау","Intero Tillen","CC BY-SA 4.0",1280],
  ["127","Lake Tengiz in Kazakhstan (54053638022 accedbe70a o).jpg","Озеро Тенгиз на снимке с Международной космической станции","NASA Johnson Space Center","Public domain",1600],
  ["173","Expo 2017 \"Nur Alem\" Pavilion Glass Pathway 1.jpg","Стеклянная дорожка внутри павильона «Нур-Алем»","颲風","CC BY-SA 4.0",1280],
  ["175","Astana Arena (inside interior).JPG","Стадион «Астана Арена», вид с трибуны","ChelseaFunNumberOne","CC BY-SA 3.0",1280],
  ["182","Astana-2021-10 - 27.jpg","????????????? ?????????? ??? ?????","Vyacheslav Bukharov","CC BY-SA 4.0",1600],
];

const licenses = {
  'CC0': 'https://creativecommons.org/publicdomain/zero/1.0/',
  'CC BY 2.0': 'https://creativecommons.org/licenses/by/2.0/',
  'CC BY 4.0': 'https://creativecommons.org/licenses/by/4.0/',
  'CC BY-SA 2.0': 'https://creativecommons.org/licenses/by-sa/2.0/',
  'CC BY-SA 3.0': 'https://creativecommons.org/licenses/by-sa/3.0/',
  'CC BY-SA 4.0': 'https://creativecommons.org/licenses/by-sa/4.0/'
};

export const placePhotos = Object.fromEntries(wikimediaPhotos.map(([id, file, alt, author, license, width]) => {
  const base = 'assets/images/place-' + id;
  const src = base + '.webp';
  const source = 'https://commons.wikimedia.org/wiki/File:' + encodeURIComponent(file.replaceAll(' ', '_'));
  return ['mm-' + id, [{
    src, alt, author, license, source,
    licenseUrl: licenses[license] || source + '#Licensing',
    variants: [[src, 560], [base + '-wide.webp', width]]
  }]];
}));
