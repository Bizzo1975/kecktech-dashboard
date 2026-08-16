const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const MealPlan = sequelize.define('MealPlan', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  recipeId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Recipes',
      key: 'id'
    }
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  mealType: {
    type: DataTypes.ENUM('breakfast', 'lunch', 'dinner', 'snack'),
    allowNull: false
  },
  servings: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
});

module.exports = MealPlan; 