const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Recipe = sequelize.define('Recipe', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  instructions: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  prepTime: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Preparation time in minutes'
  },
  cookTime: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Cooking time in minutes'
  },
  servings: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1
  },
  difficulty: {
    type: DataTypes.ENUM('easy', 'medium', 'hard'),
    allowNull: false,
    defaultValue: 'medium'
  },
  imageUrl: {
    type: DataTypes.STRING,
    allowNull: true
  },
  isPublic: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  tags: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    allowNull: true,
    defaultValue: []
  }
});

module.exports = Recipe; 