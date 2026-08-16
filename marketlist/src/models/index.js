const sequelize = require('../config/database');
const User = require('./User');
const Recipe = require('./Recipe');
const GroceryItem = require('./GroceryItem');
const Pantry = require('./Pantry');
const RecipeIngredient = require('./RecipeIngredient');
const MealPlan = require('./MealPlan');

// User - Recipe relationship (users can create recipes)
User.hasMany(Recipe, { foreignKey: 'userId' });
Recipe.belongsTo(User, { foreignKey: 'userId' });

// User - Pantry relationship (users have pantry items)
User.hasMany(Pantry, { foreignKey: 'userId' });
Pantry.belongsTo(User, { foreignKey: 'userId' });

// GroceryItem - Pantry relationship (pantry items are grocery items)
GroceryItem.hasMany(Pantry, { foreignKey: 'groceryItemId' });
Pantry.belongsTo(GroceryItem, { foreignKey: 'groceryItemId' });

// Recipe - GroceryItem relationship through RecipeIngredient
Recipe.belongsToMany(GroceryItem, { through: RecipeIngredient, foreignKey: 'recipeId' });
GroceryItem.belongsToMany(Recipe, { through: RecipeIngredient, foreignKey: 'groceryItemId' });

// User - MealPlan relationship
User.hasMany(MealPlan, { foreignKey: 'userId' });
MealPlan.belongsTo(User, { foreignKey: 'userId' });

// Recipe - MealPlan relationship
Recipe.hasMany(MealPlan, { foreignKey: 'recipeId' });
MealPlan.belongsTo(Recipe, { foreignKey: 'recipeId' });

module.exports = {
  sequelize,
  User,
  Recipe,
  GroceryItem,
  Pantry,
  RecipeIngredient,
  MealPlan
}; 