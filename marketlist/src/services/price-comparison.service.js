const { GroceryItem, Store, PriceHistory } = require('../models');
const { Op } = require('sequelize');

class PriceComparisonService {
  /**
   * Compare prices for a specific item across different stores
   * @param {number} itemId - The ID of the grocery item
   * @returns {Promise<Object>} - Price comparison data
   */
  async compareItemPrices(itemId) {
    try {
      const item = await GroceryItem.findByPk(itemId, {
        include: [{
          model: Store,
          through: { attributes: ['price', 'lastUpdated'] }
        }]
      });

      if (!item) {
        throw new Error('Item not found');
      }

      const priceData = item.Stores.map(store => ({
        storeId: store.id,
        storeName: store.name,
        price: store.GroceryItemStore.price,
        lastUpdated: store.GroceryItemStore.lastUpdated
      }));

      // Sort by price (lowest first)
      priceData.sort((a, b) => a.price - b.price);

      return {
        itemId: item.id,
        itemName: item.name,
        prices: priceData,
        bestPrice: priceData[0],
        averagePrice: priceData.reduce((sum, p) => sum + p.price, 0) / priceData.length
      };
    } catch (error) {
      console.error('Error comparing item prices:', error);
      throw error;
    }
  }

  /**
   * Get price history for a specific item
   * @param {number} itemId - The ID of the grocery item
   * @param {number} days - Number of days of history to retrieve
   * @returns {Promise<Object>} - Price history data
   */
  async getPriceHistory(itemId, days = 30) {
    try {
      const item = await GroceryItem.findByPk(itemId);
      if (!item) {
        throw new Error('Item not found');
      }

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const priceHistory = await PriceHistory.findAll({
        where: {
          itemId,
          date: {
            [Op.gte]: startDate
          }
        },
        order: [['date', 'ASC']]
      });

      return {
        itemId: item.id,
        itemName: item.name,
        history: priceHistory.map(record => ({
          date: record.date,
          price: record.price,
          storeId: record.storeId
        }))
      };
    } catch (error) {
      console.error('Error getting price history:', error);
      throw error;
    }
  }

  /**
   * Find the best deals across all items
   * @param {Object} options - Filter options
   * @returns {Promise<Array>} - List of best deals
   */
  async findBestDeals(options = {}) {
    try {
      const { category, limit = 10, minDiscount = 0 } = options;

      const items = await GroceryItem.findAll({
        where: category ? { category } : {},
        include: [{
          model: Store,
          through: { attributes: ['price', 'lastUpdated'] }
        }]
      });

      const deals = items.map(item => {
        const prices = item.Stores.map(store => ({
          storeId: store.id,
          storeName: store.name,
          price: store.GroceryItemStore.price
        }));

        const lowestPrice = Math.min(...prices.map(p => p.price));
        const averagePrice = prices.reduce((sum, p) => sum + p.price, 0) / prices.length;
        const discount = ((averagePrice - lowestPrice) / averagePrice) * 100;

        return {
          itemId: item.id,
          itemName: item.name,
          category: item.category,
          lowestPrice,
          averagePrice,
          discount,
          bestStore: prices.find(p => p.price === lowestPrice)
        };
      });

      // Filter by minimum discount and sort by discount percentage
      return deals
        .filter(deal => deal.discount >= minDiscount)
        .sort((a, b) => b.discount - a.discount)
        .slice(0, limit);
    } catch (error) {
      console.error('Error finding best deals:', error);
      throw error;
    }
  }

  /**
   * Track price changes and update price history
   * @param {number} itemId - The ID of the grocery item
   * @param {number} storeId - The ID of the store
   * @param {number} newPrice - The new price
   */
  async trackPriceChange(itemId, storeId, newPrice) {
    try {
      const item = await GroceryItem.findByPk(itemId);
      if (!item) {
        throw new Error('Item not found');
      }

      // Update current price in store
      await item.addStore(storeId, {
        through: {
          price: newPrice,
          lastUpdated: new Date()
        }
      });

      // Add to price history
      await PriceHistory.create({
        itemId,
        storeId,
        price: newPrice,
        date: new Date()
      });
    } catch (error) {
      console.error('Error tracking price change:', error);
      throw error;
    }
  }
}

module.exports = new PriceComparisonService(); 