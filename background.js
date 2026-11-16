chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "fetchGemById") {
        const itemId = request.id;
        
        // Используем метод, который отдает инфу по ID лота (проверим его в консоли)
        const url = `https://market.dota2.net/api/v2/get-buy-info-by-item-id?key=${API_KEY}&item_id=${itemId}&full=1`;

        fetch(url)
            .then(r => r.json())
            .then(data => {
                if (data.success && data.data) {
                    // Ищем гем в ответе. Скорее всего, он лежит в market_hash_name или в отдельном поле
                    let gem = "Unknown";
                    
                    // Если в названии написано "Plague Grey" и т.д.
                    if (data.data.market_hash_name && data.data.market_hash_name.includes('Grey')) {
                        gem = "Grey";
                    } 
                    // Если есть какое-то поле с гемом
                    else if (data.data.gem) {
                        gem = data.data.gem;
                    }

                    sendResponse({ success: true, gem: gem });
                } else {
                    sendResponse({ success: false, error: data });
                }
            })
            .catch(error => sendResponse({ success: false, error: error.message }));

        return true; // Важно для асинхронного ответа!
    }
}); 