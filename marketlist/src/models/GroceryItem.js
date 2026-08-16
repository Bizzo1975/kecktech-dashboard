const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const GroceryItem = sequelize.define('GroceryItem', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  category: {
    type: DataTypes.STRING,
    allowNull: false
  },
  unit: {
    type: DataTypes.STRING,
    allowNull: false
  },
  prices: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {},
    comment: 'Store prices in format: { storeName: { price: number, lastUpdated: date } }'
  },
  averagePrice: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  barcode: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true
  },
  imageUrl: {
    type: DataTypes.STRING,
    allowNull: true
  },
  nutritionalInfo: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Nutritional information in standard format'
  }
});

module.exports = GroceryItem; 