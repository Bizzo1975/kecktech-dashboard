const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Pantry = sequelize.define('Pantry', {
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
    allowNull: false,
    defaultValue: 0
  },
  unit: {
    type: DataTypes.STRING,
    allowNull: false
  },
  expirationDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  purchaseDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  purchasePrice: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  store: {
    type: DataTypes.STRING,
    allowNull: true
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
});

module.exports = Pantry; 