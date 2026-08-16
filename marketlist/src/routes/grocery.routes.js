const express = require('express');
const router = express.Router();
const groceryController = require('../controllers/grocery.controller');
const authMiddleware = require('../middleware/auth.middleware');
const { validateGroceryItem, validateGroceryList, validateListItem } = require('../validators/grocery.validator');

// Apply auth middleware to all routes
router.use(authMiddleware);

// Grocery Items routes
router.get('/items', groceryController.getAllGroceryItems);
router.get('/items/search', groceryController.searchGroceryItems);
router.get('/items/categories', groceryController.getCategories);
router.get('/items/:id', groceryController.getGroceryItemById);
router.post('/items', validateGroceryItem, groceryController.createGroceryItem);
router.put('/items/:id', validateGroceryItem, groceryController.updateGroceryItem);
router.delete('/items/:id', groceryController.deleteGroceryItem);
router.get('/items/:id/prices', groceryController.getItemPrices);
router.put('/items/:id/prices', groceryController.updateItemPrices);

// Grocery Lists routes
router.get('/lists', groceryController.getGroceryLists);
router.post('/lists', validateGroceryList, groceryController.createGroceryList);
router.get('/lists/:id', groceryController.getGroceryListById);
router.put('/lists/:id', validateGroceryList, groceryController.updateGroceryList);
router.delete('/lists/:id', groceryController.deleteGroceryList);

// List Items routes
router.post('/lists/:id/items', validateListItem, groceryController.addItemToList);
router.put('/lists/:id/items/:itemId', validateListItem, groceryController.updateListItem);
router.delete('/lists/:id/items/:itemId', groceryController.removeItemFromList);

module.exports = router; 