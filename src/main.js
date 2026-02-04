function calculateSimpleRevenue(purchase, _product) {
    const { discount, sale_price, quantity } = purchase;
    
    const discountDecimal = discount / 100;
    const fullPrice = sale_price * quantity;
    const revenue = fullPrice * (1 - discountDecimal);
    
    // Используем toFixed для точного округления до 2 знаков
    return Number(revenue.toFixed(2));
}

function calculateBonusByProfit(index, total, seller) {
    const { profit } = seller;
    
    if (!profit || profit <= 0) {
        return 0;
    }
    
    let bonusPercentage;
    
    if (index === 0) {
        bonusPercentage = 0.15;
    } else if (index === 1 || index === 2) {
        bonusPercentage = 0.10;
    } else if (index === total - 1) {
        bonusPercentage = 0;
    } else {
        bonusPercentage = 0.05;
    }
    
    const bonus = profit * bonusPercentage;
    // Используем toFixed для точного округления
    return Number(bonus.toFixed(2));
}

function analyzeSalesData(data, options) {
    // Проверка входных данных
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
    
    // Проверка наличия опций
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
    
    // Подготовка данных
    const sellersStats = {};
    const sellersMap = {};
    const productsMap = {};
    
    // Индексация продавцов
    data.sellers.forEach(seller => {
        sellersMap[seller.id] = seller;
        sellersStats[seller.id] = {
            id: seller.id,
            name: `${seller.first_name} ${seller.last_name}`,
            revenue: 0,
            profit: 0,
            sales_count: 0,
            products_sold: {}
        };
    });
    
    // Индексация товаров
    data.products.forEach(product => {
        productsMap[product.sku] = product;
    });
    
    // Расчет выручки и прибыли
    data.purchase_records.forEach(purchase => {
        const sellerId = purchase.seller_id;
        
        if (!sellersStats[sellerId]) {
            return;
        }
        
        sellersStats[sellerId].sales_count += 1;
        
        purchase.items.forEach(item => {
            const product = productsMap[item.sku];
            
            if (!product) {
                return;
            }
            
            // Рассчитываем выручку (уже округленную с помощью toFixed)
            const revenue = calculateRevenue(item, product);
            sellersStats[sellerId].revenue += revenue;
            
            // Рассчитываем себестоимость и округляем
            const cost = product.purchase_price * item.quantity;
            const roundedCost = Number(cost.toFixed(2)); // Округляем себестоимость!
            
            // Рассчитываем прибыль
            const profit = revenue - roundedCost;
            const roundedProfit = Number(profit.toFixed(2)); // Округляем прибыль
            sellersStats[sellerId].profit += roundedProfit;
            
            // Учет проданных товаров
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
    
    // Сортировка по прибыли
    const sellersArray = Object.values(sellersStats);
    sellersArray.sort((a, b) => b.profit - a.profit);
    
    // Расчет бонусов
    const totalSellers = sellersArray.length;
    
    sellersArray.forEach((seller, index) => {
        // Округляем итоговые значения (на всякий случай)
        seller.revenue = Number(seller.revenue.toFixed(2));
        seller.profit = Number(seller.profit.toFixed(2));
        
        // Рассчитываем бонус
        seller.bonus = calculateBonus(index, totalSellers, seller);
    });
    
    // Подготовка итоговой коллекции
    const result = sellersArray.map(seller => {
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