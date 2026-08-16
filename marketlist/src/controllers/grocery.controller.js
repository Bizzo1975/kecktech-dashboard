const { validationResult } = require('express-validator');
const { Op } = require('sequelize');
const BaseController = require('./base.controller');
const { GroceryItem, Recipe, RecipeIngredient } = require('../models');

class GroceryController extends BaseController {
  // Get all grocery items
  async getAllGroceryItems(req, res) {
    try {
      const { page = 1, limit = 10, search, category } = req.query;
      const offset = (page - 1) * limit;

      const where = {};
      if (search) {
        where.name = { [Op.iLike]: `%${search}%` };
      }
      if (category) {
        where.category = category;
      }

      const items = await GroceryItem.findAndCountAll({
        where,
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
      return this.sendError(res, 'Error fetching grocery items', 500, error.message);
    }
  }

  // Get grocery item by ID
  async getGroceryItemById(req, res) {
    try {
      const item = await GroceryItem.findByPk(req.params.id);
      if (!item) {
        return this.sendNotFound(res, 'Grocery item not found');
      }

      return this.sendSuccess(res, { item });
    } catch (error) {
      return this.sendError(res, 'Error fetching grocery item', 500, error.message);
    }
  }

  // Search grocery items
  async searchGroceryItems(req, res) {
    try {
      const { query, category } = req.query;
      const where = {};

      if (query) {
        where.name = { [Op.iLike]: `%${query}%` };
      }
      if (category) {
        where.category = category;
      }

      const items = await GroceryItem.findAll({
        where,
        order: [['name', 'ASC']]
      });

      return this.sendSuccess(res, { items });
    } catch (error) {
      return this.sendError(res, 'Error searching grocery items', 500, error.message);
    }
  }

  // Get all categories
  async getCategories(req, res) {
    try {
      const categories = await GroceryItem.findAll({
        attributes: ['category'],
        group: ['category'],
        order: [['category', 'ASC']]
      });

      return this.sendSuccess(res, {
        categories: categories.map(c => c.category)
      });
    } catch (error) {
      return this.sendError(res, 'Error fetching categories', 500, error.message);
    }
  }

  // Create grocery item
  async createGroceryItem(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return this.sendValidationError(res, errors.array());
      }

      const item = await GroceryItem.create(req.body);

      return this.sendSuccess(res, { item }, 'Grocery item created successfully', 201);
    } catch (error) {
      return this.sendError(res, 'Error creating grocery item', 500, error.message);
    }
  }

  // Update grocery item
  async updateGroceryItem(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return this.sendValidationError(res, errors.array());
      }

      const item = await GroceryItem.findByPk(req.params.id);
      if (!item) {
        return this.sendNotFound(res, 'Grocery item not found');
      }

      await item.update(req.body);

      return this.sendSuccess(res, { item }, 'Grocery item updated successfully');
    } catch (error) {
      return this.sendError(res, 'Error updating grocery item', 500, error.message);
    }
  }

  // Delete grocery item
  async deleteGroceryItem(req, res) {
    try {
      const item = await GroceryItem.findByPk(req.params.id);
      if (!item) {
        return this.sendNotFound(res, 'Grocery item not found');
      }

      await item.destroy();

      return this.sendSuccess(res, null, 'Grocery item deleted successfully');
    } catch (error) {
      return this.sendError(res, 'Error deleting grocery item', 500, error.message);
    }
  }

  // Get grocery lists
  async getGroceryLists(req, res) {
    try {
      const lists = await GroceryList.findAll({
        where: { userId: req.user.id },
        include: [
          {
            model: GroceryItem,
            through: { attributes: ['quantity', 'unit'] }
          }
        ],
        order: [['createdAt', 'DESC']]
      });

      return this.sendSuccess(res, { lists });
    } catch (error) {
      return this.sendError(res, 'Error fetching grocery lists', 500, error.message);
    }
  }

  // Create grocery list
  async createGroceryList(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return this.sendValidationError(res, errors.array());
      }

      const list = await GroceryList.create({
        ...req.body,
        userId: req.user.id
      });

      return this.sendSuccess(res, { list }, 'Grocery list created successfully', 201);
    } catch (error) {
      return this.sendError(res, 'Error creating grocery list', 500, error.message);
    }
  }

  // Get grocery list by ID
  async getGroceryListById(req, res) {
    try {
      const list = await GroceryList.findOne({
        where: {
          id: req.params.id,
          userId: req.user.id
        },
        include: [
          {
            model: GroceryItem,
            through: { attributes: ['quantity', 'unit'] }
          }
        ]
      });

      if (!list) {
        return this.sendNotFound(res, 'Grocery list not found');
      }

      return this.sendSuccess(res, { list });
    } catch (error) {
      return this.sendError(res, 'Error fetching grocery list', 500, error.message);
    }
  }

  // Update grocery list
  async updateGroceryList(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return this.sendValidationError(res, errors.array());
      }

      const list = await GroceryList.findOne({
        where: {
          id: req.params.id,
          userId: req.user.id
        }
      });

      if (!list) {
        return this.sendNotFound(res, 'Grocery list not found');
      }

      await list.update(req.body);

      return this.sendSuccess(res, { list }, 'Grocery list updated successfully');
    } catch (error) {
      return this.sendError(res, 'Error updating grocery list', 500, error.message);
    }
  }

  // Delete grocery list
  async deleteGroceryList(req, res) {
    try {
      const list = await GroceryList.findOne({
        where: {
          id: req.params.id,
          userId: req.user.id
        }
      });

      if (!list) {
        return this.sendNotFound(res, 'Grocery list not found');
      }

      await list.destroy();

      return this.sendSuccess(res, null, 'Grocery list deleted successfully');
    } catch (error) {
      return this.sendError(res, 'Error deleting grocery list', 500, error.message);
    }
  }

  // Add item to list
  async addItemToList(req, res) {
    try {
      const list = await GroceryList.findOne({
        where: {
          id: req.params.id,
          userId: req.user.id
        }
      });

      if (!list) {
        return this.sendNotFound(res, 'Grocery list not found');
      }

      const item = await GroceryItem.findByPk(req.body.groceryItemId);
      if (!item) {
        return this.sendNotFound(res, 'Grocery item not found');
      }

      await list.addGroceryItem(item, {
        through: {
          quantity: req.body.quantity,
          unit: req.body.unit
        }
      });

      return this.sendSuccess(res, null, 'Item added to list successfully');
    } catch (error) {
      return this.sendError(res, 'Error adding item to list', 500, error.message);
    }
  }

  // Update list item
  async updateListItem(req, res) {
    try {
      const list = await GroceryList.findOne({
        where: {
          id: req.params.id,
          userId: req.user.id
        }
      });

      if (!list) {
        return this.sendNotFound(res, 'Grocery list not found');
      }

      await list.updateGroceryItem(req.params.itemId, {
        through: {
          quantity: req.body.quantity,
          unit: req.body.unit
        }
      });

      return this.sendSuccess(res, null, 'List item updated successfully');
    } catch (error) {
      return this.sendError(res, 'Error updating list item', 500, error.message);
    }
  }

  // Remove item from list
  async removeItemFromList(req, res) {
    try {
      const list = await GroceryList.findOne({
        where: {
          id: req.params.id,
          userId: req.user.id
        }
      });

      if (!list) {
        return this.sendNotFound(res, 'Grocery list not found');
      }

      await list.removeGroceryItem(req.params.itemId);

      return this.sendSuccess(res, null, 'Item removed from list successfully');
    } catch (error) {
      return this.sendError(res, 'Error removing item from list', 500, error.message);
    }
  }

  // Get item prices
  async getItemPrices(req, res) {
    try {
      const item = await GroceryItem.findByPk(req.params.id);
      if (!item) {
        return this.sendNotFound(res, 'Grocery item not found');
      }

      return this.sendSuccess(res, { prices: item.prices });
    } catch (error) {
      return this.sendError(res, 'Error fetching item prices', 500, error.message);
    }
  }

  // Update item prices
  async updateItemPrices(req, res) {
    try {
      const item = await GroceryItem.findByPk(req.params.id);
      if (!item) {
        return this.sendNotFound(res, 'Grocery item not found');
      }

      const prices = {
        ...item.prices,
        [req.body.store]: {
          price: req.body.price,
          lastUpdated: new Date()
        }
      };

      await item.update({ prices });

      return this.sendSuccess(res, { prices }, 'Item prices updated successfully');
    } catch (error) {
      return this.sendError(res, 'Error updating item prices', 500, error.message);
    }
  }
}

module.exports = new GroceryController(); 