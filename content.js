// content.js

const GEM_COLORS = {
    // --- Стандартные цвета (из скриншотов) ---
    "Red": "#D03D33",
    "Gold": "#CFAB31",
    "Blue": "#0097CE",
    "Purple": "#8232CF",
    "Orange": "#D07733",
    "Light Green": "#B7CF33",
    "Deep Blue": "#3D68C4",
    "Sea Green": "#4AB78D",
    "Verdant Green": "#51B350",
    "Deep Green": "#37864D",
    "Bright Green": "#A1FF59",
    "Bright Purple": "#8232ED",
    "Placid Blue": "#94CAD0",
    "Summer Warmth": "#FFEEBC",
    "Defensive Red": "#FF4200",
    "Creator's Light": "#DCF2FF",
    "Blossom Red": "#D76092",
    "Crystalline Blue": "#1A3D85",
    "Rubiline": "#D11FA1",
    "Cursed Black": "#060606",
    "Plague Grey": "#626E5B",
    "Champion's Blue": "#507DFE",
    "Champion's Green": "#15A515",
    "Champion's Purple": "#7F48C3",
    "Midas Gold": "#FFCA15",
    "Earth Green": "#5AC355",
    "Ember Flame": "#FFC604",
    "Diretide Orange": "#F79D00",
    "Dredge Earth": "#BDB76B",
    "Dungeon Doom": "#7B68EE",
    "Tnim S'nnam": "#BCDDB3",
    "Brusque Britches Beige": "#F0E68C",
    "Unhallowed Ground": "#808000",
    "Ships in the Night": "#191970",
    "Miasmatic Grey": "#C0C0C0",
    "Pristine Platinum": "#D5E3F5",
    
    // --- Специальные (из последнего скриншота) ---
    "Vermillion Renewal": "#CA0123",
    "Reflection's Shade": "#FF3C28", // ВАЖНО: Теперь он красный!
    "Pyroclastic Flow": "#FF7832",
    "Glacial Flow": "#32ABDC",
    "Plushy Shag": "#FFC0DC", // Примерный розовый (на скрине цвет перекрыт, но по логике он розовый)
    "Explosive Burst": "#FFAF00",
    
    // --- Русские названия (на случай, если сайт отдаст их) ---
    "Аленький цветочек": "#FF6347",
    "Красный": "#D03D33",
    "Золотой": "#CFAB31",
    "Синий": "#0097CE",
    "Фиолетовый": "#8232CF",
    "Оранжевый": "#D07733",
    "Светло-зеленый": "#B7CF33",
    "Темно-синий": "#3D68C4",
    "Морской зеленый": "#4AB78D",
    "Ярко-зеленый": "#A1FF59",
    "Проклятый черный": "#060606",
    "Чумной серый": "#626E5B",
    
    // --- Цвет по умолчанию ---
    "Default": "#333333"
};
function getGemColor(gemName) {
    return GEM_COLORS[gemName] || GEM_COLORS["Default"];
}

function addBadge(element, gemName) {
    if (!element || !gemName) return;
    if (element.querySelector('.gem-badge')) return;

    const badge = document.createElement('div');
    badge.className = 'gem-badge';
    
    const color = getGemColor(gemName);
    badge.style.backgroundColor = color;
    
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    badge.style.color = brightness > 128 ? '#000' : '#fff';

    badge.textContent = gemName;
    
    // Улучшенный поиск контейнера картинки
    // Ищем div с классом .image или тег img
    let target = element.querySelector('.image') || element.querySelector('img');
    
    // Если нашли картинку, берем её родителя (чтобы спозиционировать бейдж поверх)
    if (target && target.parentElement) {
        target = target.parentElement;
    } else {
        target = element; // если картинку не нашли, лепим на всю карточку
    }
    
    target.style.position = 'relative'; 
    target.appendChild(badge);
}

// Очередь на загрузку, чтобы не забанили
let queue = [];
let isProcessingQueue = false;

async function processQueue() {
    if (isProcessingQueue) return;
    isProcessingQueue = true;

    while (queue.length > 0) {
        const card = queue.shift();
        if (!card || card.querySelector('.gem-badge')) continue;

        const link = card.querySelector('a');
        if (!link) continue;

        // Ждем 800 мс между запросами (защита от бана)
        await new Promise(r => setTimeout(r, 500));

        try {
            const response = await fetch(link.href);
            const text = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(text, 'text/html');
            const descr = doc.querySelector('#descr');
            
            if (descr) {
                const match = descr.textContent.match(/([A-Za-z0-9'’\s-]+?)\s*(Призматический самоцвет|Prismatic Gem)/i);
                if (match) {
                    const gemName = match[1].trim();
                    addBadge(card, gemName);
                }
            }
        } catch (e) {
            console.log("Ошибка загрузки:", e);
        }
    }
    isProcessingQueue = false;
}

async function processPage() {
    // 1. Страница одного предмета
    const descrBlock = document.querySelector('#descr');
    if (descrBlock) {
        const match = descrBlock.textContent.match(/([A-Za-z0-9'’\s-]+?)\s*(Призматический самоцвет|Prismatic Gem)/i);
        if (match) {
            const mainPic = document.querySelector('.ip-pic');
            if (mainPic) addBadge(mainPic, match[1].trim());
        }
    }

    // 2. Страница списка (сетка)
    // Ищем все карточки, у которых еще нет бейджа и которые еще не в очереди
    const cards = Array.from(document.querySelectorAll('.market-items .item'));
    
    cards.forEach(card => {
        if (!card.querySelector('.gem-badge') && !card.dataset.inQueue && !card.dataset.processing) {
            card.dataset.inQueue = "true";
            queue.push(card);
        }
    });

    // Запускаем очередь, если есть что обрабатывать
    if (queue.length > 0) {
        processQueue();
    }
}

// Запускаем
setTimeout(processPage, 2000);

// Следим за скроллом и появлением новых элементов
const observer = new MutationObserver(() => {
    processPage();
});
window.addEventListener('load', () => {
    observer.observe(document.body, { childList: true, subtree: true });
});