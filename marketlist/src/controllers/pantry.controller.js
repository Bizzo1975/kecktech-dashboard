const { validationResult } = require('express-validator');
const { Op } = require('sequelize');
const BaseController = require('./base.controller');
const { PantryItem, GroceryItem } = require('../models');

class PantryController extends BaseController {
  // Get all pantry items
  async getAllPantryItems(req, res) {
    try {
      const { page = 1, limit = 10, search, category } = req.query;
      const offset = (page - 1) * limit;

      const where = { userId: req.user.id };
      if (search) {
        where.name = { [Op.iLike]: `%${search}%` };
      }
      if (category) {
        where.category = category;
      }

      const items = await PantryItem.findAndCountAll({
        where,
        include: [{
          model: GroceryItem,
          attributes: ['id', 'name', 'category']
        }],
        limit,
        offset,
        order: [['name', 'ASC']]
      });

      return this.sendSuccess(res, {
        items: items.rows,
        total: items.count,
        page: parseInt(page),
        totalPages: Math.ceil(items.count / limit)
      });
    } catch (error) {
      return this.sendError(res, 'Error fetching pantry items', 500, error.message);
    }
  }

  // Get pantry item by ID
  async getPantryItemById(req, res) {
    try {
      const item = await PantryItem.findOne({
        where: {
          id: req.params.id,
          userId: req.user.id
        },
        include: [{
          model: GroceryItem,
          attributes: ['id', 'name', 'category']
        }]
      });

      if (!item) {
        return this.sendNotFound(res, 'Pantry item not found');
      }

      return this.sendSuccess(res, { item });
    } catch (error) {
      return this.sendError(res, 'Error fetching pantry item', 500, error.message);
    }
  }

  // Create pantry item
  async createPantryItem(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return this.sendValidationError(res, errors.array());
      }

      const item = await PantryItem.create({
        ...req.body,
        userId: req.user.id
      });

      return this.sendSuccess(res, { item }, 'Pantry item created successfully', 201);
    } catch (error) {
      return this.sendError(res, 'Error creating pantry item', 500, error.message);
    }
  }

  // Update pantry item
  async updatePantryItem(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return this.sendValidationError(res, errors.array());
      }

      const item = await PantryItem.findOne({
        where: {
          id: req.params.id,
          userId: req.user.id
        }
      });

      if (!item) {
        return this.sendNotFound(res, 'Pantry item not found');
      }

      await item.update(req.body);

      return this.sendSuccess(res, { item }, 'Pantry item updated successfully');
    } catch (error) {
      return this.sendError(res, 'Error updating pantry item', 500, error.message);
    }
  }

  // Delete pantry item
  async deletePantryItem(req, res) {
    try {
      const item = await PantryItem.findOne({
        where: {
          id: req.params.id,
          userId: req.user.id
        }
      });

      if (!item) {
        return this.sendNotFound(res, 'Pantry item not found');
      }

      await item.destroy();

      return this.sendSuccess(res, null, 'Pantry item deleted successfully');
    } catch (error) {
      return this.sendError(res, 'Error deleting pantry item', 500, error.message);
    }
  }

  // Update item quantity
  async updateItemQuantity(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return this.sendValidationError(res, errors.array());
      }

      const item = await PantryItem.findOne({
        where: {
          id: req.params.id,
          userId: req.user.id
        }
      });

      if (!item) {
        return this.sendNotFound(res, 'Pantry item not found');
      }

      await item.update({
        quantity: req.body.quantity,
        lastUpdated: new Date()
      });

      return this.sendSuccess(res, { item }, 'Item quantity updated successfully');
    } catch (error) {
      return this.sendError(res, 'Error updating item quantity', 500, error.message);
    }
  }

  // Get low stock items
  async getLowStockItems(req, res) {
    try {
      const items = await PantryItem.findAll({
        where: {
          userId: req.user.id,
          quantity: {
            [Op.lte]: Sequelize.col('minimumQuantity')
          }
        },
        include: [{
          model: GroceryItem,
          attributes: ['id', 'name', 'category']
        }],
        order: [['quantity', 'ASC']]
      });

      return this.sendSuccess(res, { items });
    } catch (error) {
      return this.sendError(res, 'Error fetching low stock items', 500, error.message);
    }
  }

  // Get pantry analytics
  async getPantryAnalytics(req, res) {
    try {
      const totalItems = await PantryItem.count({
        where: { userId: req.user.id }
      });

      const lowStockCount = await PantryItem.count({
        where: {
          userId: req.user.id,
          quantity: {
            [Op.lte]: Sequelize.col('minimumQuantity')
          }
        }
      });

      const categoryDistribution = await PantryItem.findAll({
        where: { userId: req.user.id },
        attributes: [
          'category',
          [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']
        ],
        group: ['category']
      });

      const recentlyUpdated = await PantryItem.findAll({
        where: { userId: req.user.id },
        include: [{
          model: GroceryItem,
          attributes: ['id', 'name', 'category']
        }],
        order: [['lastUpdated', 'DESC']],
        limit: 5
      });

      return this.sendSuccess(res, {
        totalItems,
        lowStockCount,
        categoryDistribution,
        recentlyUpdated
      });
    } catch (error) {
      return this.sendError(res, 'Error fetching pantry analytics', 500, error.message);
    }
  }

  // Get consumption history
  async getConsumptionHistory(req, res) {
    try {
      const { startDate, endDate } = req.query;
      const where = { userId: req.user.id };

      if (startDate && endDate) {
        where.lastUpdated = {
          [Op.between]: [new Date(startDate), new Date(endDate)]
        };
      }

      const history = await PantryItem.findAll({
        where,
        include: [{
          model: GroceryItem,
          attributes: ['id', 'name', 'category']
        }],
        order: [['lastUpdated', 'DESC']]
      });

      return this.sendSuccess(res, { history });
    } catch (error) {
      return this.sendError(res, 'Error fetching consumption history', 500, error.message);
    }
  }

  // Get suggested items to buy
  async getSuggestedItems(req, res) {
    try {
      const lowStockItems = await PantryItem.findAll({
        where: {
          userId: req.user.id,
          quantity: {
            [Op.lte]: Sequelize.col('minimumQuantity')
          }
        },
        include: [{
          model: GroceryItem,
          attributes: ['id', 'name', 'category', 'prices']
        }],
        order: [['quantity', 'ASC']]
      });

      const suggestions = lowStockItems.map(item => ({
        id: item.GroceryItem.id,
        name: item.GroceryItem.name,
        category: item.GroceryItem.category,
        currentQuantity: item.quantity,
        minimumQuantity: item.minimumQuantity,
        prices: item.GroceryItem.prices
      }));

      return this.sendSuccess(res, { suggestions });
    } catch (error) {
      return this.sendError(res, 'Error fetching suggested items', 500, error.message);
    }
  }
}

module.exports = new PantryController(); 