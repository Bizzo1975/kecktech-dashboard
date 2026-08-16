const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const RecipeIngredient = sequelize.define('RecipeIngredient', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  recipeId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Recipes',
      key: 'id'
    }
  },
  groceryItemId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'GroceryItems',
      key: 'id'
    }
  },
  quantity: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  unit: {
    type: DataTypes.STRING,
    allowNull: false
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  optional: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  }
});

module.exports = RecipeIngredient; 