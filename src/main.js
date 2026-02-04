function calculateSimpleRevenue(purchase, _product) {
    const { discount, sale_price, quantity } = purchase;
    
    const discountDecimal = discount / 100;
    const fullPrice = sale_price * quantity;
    const revenue = fullPrice * (1 - discountDecimal);
    
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
    return Number(bonus.toFixed(2));
}

function analyzeSalesData(data, options) {
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
    
    const sellersStats = {};
    const sellersMap = {};
    const productsMap = {};
    
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
    
    data.products.forEach(product => {
        productsMap[product.sku] = product;
    });
    
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
            
            const revenue = calculateRevenue(item, product);
            sellersStats[sellerId].revenue += revenue;
            
            const cost = product.purchase_price * item.quantity;
            const profit = revenue - cost;
            sellersStats[sellerId].profit += profit;
            
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
    
    const sellersArray = Object.values(sellersStats);
    sellersArray.sort((a, b) => b.profit - a.profit);
    
    const totalSellers = sellersArray.length;
    
    sellersArray.forEach((seller, index) => {
        seller.revenue = Number(seller.revenue.toFixed(2));
        seller.profit = Number(seller.profit.toFixed(2));
        
        seller.bonus = calculateBonus(index, totalSellers, seller);
    });
    
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