/**
 * Функция для анализа данных продаж
 * @param data
 * @param options
 * @returns {{revenue, top_products, bonus, name, sales_count, profit, seller_id}[]}
 */
function analyzeSalesData(data, options) {
    // @TODO: Проверка входных данных
    if (!data
        || !Array.isArray(data.sellers)
        || !Array.isArray(data.products)
        || !Array.isArray(data.purchase_records)
        || data.sellers.length === 0
        || data.products.length === 0
        || data.purchase_records.length === 0
    ) {
        throw new Error('Некорректные входные данные');
    }
    
    // @TODO: Проверка наличия опций
    if (!options || typeof options !== 'object') {
        throw new Error('Не переданы опции');
    }
    
    const { calculateRevenue, calculateBonus } = options;
    
    if (!calculateRevenue || !calculateBonus) {
        throw new Error('В опциях должны быть функции calculateRevenue и calculateBonus');
    }
    
    if (typeof calculateRevenue !== 'function' || typeof calculateBonus !== 'function') {
        throw new Error('calculateRevenue и calculateBonus должны быть функциями');
    }
    
    // @TODO: Подготовка промежуточных данных для сбора статистики
    const sellersStats = {};
    
    // @TODO: Индексация продавцов и товаров для быстрого доступа
    const sellersMap = Object.fromEntries(
        data.sellers.map(seller => [seller.id, seller])
    );
    
    const productsMap = Object.fromEntries(
        data.products.map(product => [product.sku, product])
    );
    
    // Инициализируем статистику для каждого продавца
    data.sellers.forEach(seller => {
        sellersStats[seller.id] = {
            id: seller.id,
            name: `${seller.first_name} ${seller.last_name}`,
            revenue: 0,
            profit: 0,
            sales_count: 0,
            products_sold: {}
        };
    });
    
    // @TODO: Расчет выручки и прибыли для каждого продавца
    data.purchase_records.forEach(purchase => {
        const sellerId = purchase.seller_id;
        
        // Проверяем, существует ли продавец
        if (!sellersStats[sellerId]) {
            return;
        }
        
        // Увеличиваем счетчик продаж
        sellersStats[sellerId].sales_count += 1;
        
        // Обрабатываем каждый товар в чеке
        purchase.items.forEach(item => {
            const product = productsMap[item.sku];
            
            if (!product) {
                return;
            }
            
            // Рассчитываем выручку от этого товара
            const revenue = Math.round(calculateRevenue(item, product) * 100) / 100;
            sellersStats[sellerId].revenue += revenue;
            
            // Рассчитываем себестоимость
            const cost = Math.round(product.purchase_price * item.quantity * 100) / 100;
            
            // Рассчитываем прибыль
            const profit = Math.round((revenue - cost) * 100) / 100;
            sellersStats[sellerId].profit += profit;
            
            // Учитываем проданный товар для статистики
            const sku = item.sku;
            if (!sellersStats[sellerId].products_sold[sku]) {
                sellersStats[sellerId].products_sold[sku] = {
                    sku: sku,
                    quantity: 0
                };
            }
            sellersStats[sellerId].products_sold[sku].quantity += item.quantity;
        });
    });
    
    // @TODO: Сортировка продавцов по прибыли
    const sellersArray = Object.values(sellersStats);
    sellersArray.sort((a, b) => b.profit - a.profit);
    
    // @TODO: Назначение премий на основе ранжирования
    const totalSellers = sellersArray.length;
    
    sellersArray.forEach((seller, index) => {
        // Округляем значения перед расчетом бонуса
        seller.revenue = Math.round(seller.revenue * 100) / 100;
        seller.profit = Math.round(seller.profit * 100) / 100;
        
        // Рассчитываем бонус для каждого продавца
        seller.bonus = calculateBonus(index, totalSellers, seller);
        seller.bonus = Math.round(seller.bonus * 100) / 100;
    });
    
    // @TODO: Подготовка итоговой коллекции с нужными полями
    const result = sellersArray.map(seller => {
        // Формируем топ-10 товаров
        const topProducts = Object.values(seller.products_sold)
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 10);
        
        return {
            seller_id: seller.id,
            name: seller.name,
            revenue: seller.revenue,
            profit: seller.profit,
            sales_count: seller.sales_count,
            top_products: topProducts,
            bonus: seller.bonus
        };
    });
    
    return result;
}