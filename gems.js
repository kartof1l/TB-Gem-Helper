const GEM_COLORS = {
  // --- Базовые цвета ---
  "Red":"#D03D33","Gold":"#CFAB31","Blue":"#0097CE","Purple":"#8232CF","Orange":"#D07733",
  "Light Green":"#B7CF33","Deep Blue":"#3D68C4","Sea Green":"#4AB78D","Verdant Green":"#51B350",
  "Deep Green":"#37864D","Bright Green":"#A1FF59","Bright Purple":"#8232ED","Placid Blue":"#94CAD0",
  "Summer Warmth":"#FFEEBC","Defensive Red":"#FF4200","Creator's Light":"#DCF2FF","Blossom Red":"#D76092",
  "Crystalline Blue":"#1A3D85","Rubiline":"#D11FA1","Cursed Black":"#060606","Plague Grey":"#626E5B",
  "Champion's Blue":"#507DFE","Champion's Green":"#15A515","Champion's Purple":"#7F48C3",
  "Midas Gold":"#FFCA15","Earth Green":"#5AC355","Ember Flame":"#FFC604","Diretide Orange":"#F79D00",
  "Dredge Earth":"#BDB76B","Dungeon Doom":"#7B68EE","Tnim S'nnam":"#BCDDB3",
  "Brusque Britches Beige":"#F0E68C","Unhallowed Ground":"#808000","Ships in the Night":"#191970",
  "Miasmatic Grey":"#C0C0C0","Pristine Platinum":"#D5E3F5","Vermillion Renewal":"#CA0123",
  "Reflection's Shade":"#FF3C28","Pyroclastic Flow":"#FF7832","Glacial Flow":"#32ABDC",
  "Plushy Shag":"#FFC1DC","Explosive Burst":"#FFAF00",
  "Light Blue":"#32A6CF","Magenta":"#C439C6","Persian":"#2924CB",

  // --- Слитные английские варианты (на всякий случай) ---
  "LightGreen":"#B7CF33","DeepBlue":"#3D68C4","SeaGreen":"#4AB78D","VerdantGreen":"#51B350",
  "DeepGreen":"#37864D","BrightGreen":"#A1FF59","BrightPurple":"#8232ED","PlacidBlue":"#94CAD0",
  "SummerWarmth":"#FFEEBC","DefensiveRed":"#FF4200","CreatorsLight":"#DCF2FF","BlossomRed":"#D76092",
  "CrystallineBlue":"#1A3D85","CursedBlack":"#060606","PlagueGrey":"#626E5B",
  "ChampionsBlue":"#507DFE","ChampionsGreen":"#15A515","ChampionsPurple":"#7F48C3",
  "MidasGold":"#FFCA15","EarthGreen":"#5AC355","EmberFlame":"#FFC604","DiretideOrange":"#F79D00",
  "DredgeEarth":"#BDB76B","DungeonDoom":"#7B68EE","BrusqueBritchesBeige":"#F0E68C",
  "UnhallowedGround":"#808000","ShipsInTheNight":"#191970","MiasmaticGrey":"#C0C0C0",
  "PristinePlatinum":"#D5E3F5","VermillionRenewal":"#CA0123","ReflectionsShade":"#FF3C28",
  "PyroclasticFlow":"#FF7832","GlacialFlow":"#32ABDC","PlushyShag":"#FFC1DC",
  "ExplosiveBurst":"#FFAF00","LightBlue":"#32A6CF"
};
const RU_ALIASES = {
  // --- Русские названия (с пробелами) ---
  "Красный":"Red","Золотой":"Gold","ЗолотойПризматический":"Gold", "Синий":"Blue","Фиолетовый":"Purple","Оранжевый":"Orange",
  "Светло-зеленый":"Light Green","Глубокий синий":"Deep Blue","Сине-зеленый":"Sea Green",
  "Зеленая сосна":"Verdant Green","Глубокий зеленый":"Deep Green","Ярко-зеленый":"Bright Green",
  "Ярко-фиолетовый":"Bright Purple","Спокойный синий":"Placid Blue","Летнее тепло":"Summer Warmth",
  "Сдержанно-красный":"Defensive Red","Свет создателя":"Creator's Light","Аленький цветочек":"Blossom Red",
  "Синий кристалл":"Crystalline Blue","Отталкивающий черный":"Cursed Black","Чумной серый":"Plague Grey",
  "Чемпионский синий":"Champion's Blue","Чемпионский зеленый":"Champion's Green",
  "Чемпионский фиолетовый":"Champion's Purple","Золото Мидаса":"Midas Gold",
  "Зеленая планета":"Earth Green","Тлеющее пламя":"Ember Flame",
  "Многоцветный":"Prismatic","Рубиновый":"Rubiline","Первобытный":"Primal",
  "Чистый платиновый":"Pristine Platinum","Багровое обновление":"Vermillion Renewal",
  "Тень отражения":"Reflection's Shade","Пирокластический поток":"Pyroclastic Flow",
  "Ледниковый поток":"Glacial Flow","Плюшевый ворс":"Plushy Shag",
  "Взрывной всплеск":"Explosive Burst","Светло-синий":"Light Blue","Маджента":"Magenta","Персидский":"Persian",
  "Диретайдовый оранжевый":"Diretide Orange","Земляной драга":"Dredge Earth","Подземная погибель":"Dungeon Doom",
  "Тним С'ннам":"Tnim S'nnam","Бежевые штаны":"Brusque Britches Beige","Нечестивая земля":"Unhallowed Ground",
  "Корабли в ночи":"Ships in the Night","Миазматический серый":"Miasmatic Grey",

  // --- Слитные русские варианты (без пробелов) ---
  "Светлозеленый":"Light Green","Глубокийсиний":"Deep Blue","Синезеленый":"Sea Green",
  "Зеленаясосна":"Verdant Green","Глубокийзеленый":"Deep Green","Яркозеленый":"Bright Green",
  "Яркофиолетовый":"Bright Purple","Спокойныйсиний":"Placid Blue","Летнее тепло":"Summer Warmth",
  "Сдержаннокрасный":"Defensive Red","Светсоздателя":"Creator's Light","Аленькийцветочек":"Blossom Red",
  "Синийкристалл":"Crystalline Blue","Отталкивающийчерный":"Cursed Black","Чумнойсерый":"Plague Grey",
  "Чемпионскийсиний":"Champion's Blue","Чемпионскийзеленый":"Champion's Green",
  "Чемпионскийфиолетовый":"Champion's Purple","ЗолотоМидаса":"Midas Gold",
  "Зеленаяпланета":"Earth Green","Тлеющеепламя":"Ember Flame",
  "Чистыйплатиновый":"Pristine Platinum","Багровоеобновление":"Vermillion Renewal",
  "Теньотражения":"Reflection's Shade","Пирокластическийпоток":"Pyroclastic Flow",
  "Ледниковыйпоток":"Glacial Flow","Плюшевыйворс":"Plushy Shag",
  "Взрывнойвсплеск":"Explosive Burst","Светлосиний":"Light Blue",
  "Диретайдовыйоранжевый":"Diretide Orange","Землянойдрага":"Dredge Earth","Подземнаяпогибель":"Dungeon Doom",
  "Бежевыештаны":"Brusque Britches Beige","Нечестиваяземля":"Unhallowed Ground",
  "Корабливночи":"Ships in the Night","Миазматическийсерый":"Miasmatic Grey"
};
const LABEL_SRC = "(?:Prismatic\\s*Gem|Призматический\\s*самоцвет)";
// длинные имена первыми, иначе "Blue" перехватит "Placid Blue"
const GEM_ALIASES = [...Object.keys(GEM_COLORS).map(n => [n, n]), ...Object.entries(RU_ALIASES)]
  .sort((a, b) => b[0].length - a[0].length);

const escRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const normText = t => (t || "").replace(/[’‘]/g, "'").replace(/\s+/g, " ").trim();

function rgbToHex(r, g, b) {
  return "#" + [r, g, b].map(v => Math.max(0, Math.min(255, v|0)).toString(16).padStart(2, "0")).join("").toUpperCase();
}
function anyColorToHex(raw) {
  if (!raw) return null;
  raw = raw.trim();
  let m = raw.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (m) { let h = m[1]; if (h.length === 3) h = [...h].map(c => c + c).join(""); return "#" + h.toUpperCase(); }
  m = raw.match(/rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/i);
  return m ? rgbToHex(+m[1], +m[2], +m[3]) : null;
}
function parseGem(rawText) {
  const t = normText(rawText);
  if (!t) return null;
  const legacy = t.match(/Legacy\s*\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)/i);
  if (legacy) {
    const [r, g, b] = legacy.slice(1).map(Number);
    return { name: `Legacy (${r},${g},${b})`, color: rgbToHex(r, g, b) };
  }
  for (const [alias, canon] of GEM_ALIASES) {
    if (new RegExp(escRe(alias) + "\\s*" + LABEL_SRC, "i").test(t)) return { name: canon, color: GEM_COLORS[canon] };
  }
  const m = t.match(/(?:Prismatic|Призматический)\s*:\s*([A-Za-zА-Яа-яЁё'\- ]{3,30})/);
  if (m) {
    const name = m[1].trim();
    const hit = GEM_ALIASES.find(([a]) => a.toLowerCase() === name.toLowerCase());
    return { name: hit ? hit[1] : name, color: (hit && GEM_COLORS[hit[1]]) || "#3A3A3A" };
  }
  return null;
}
function textColorFor(hex) {
  const h = anyColorToHex(hex) || "#333333";
  const r = parseInt(h.slice(1, 3), 16), g = parseInt(h.slice(3, 5), 16), b = parseInt(h.slice(5, 7), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 150 ? "#111" : "#fff";
}