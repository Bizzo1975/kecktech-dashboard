import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store';
import { addItem, removeItem, toggleItemChecked } from '../store/slices/grocerySlice';
import { GroceryItem } from '../types';

const GroceryListScreen = () => {
  const dispatch = useDispatch();
  const items = useSelector((state: RootState) => state.grocery.items);
  const [newItemName, setNewItemName] = useState('');
  const [newItemQuantity, setNewItemQuantity] = useState('1');
  const [newItemUnit, setNewItemUnit] = useState('');

  const handleAddItem = () => {
    if (newItemName.trim()) {
      const newItem: GroceryItem = {
        id: Date.now().toString(),
        name: newItemName.trim(),
        quantity: parseInt(newItemQuantity) || 1,
        unit: newItemUnit.trim(),
        isChecked: false,
      };
      dispatch(addItem(newItem));
      setNewItemName('');
      setNewItemQuantity('1');
      setNewItemUnit('');
    }
  };

  const renderItem = ({ item }: { item: GroceryItem }) => (
    <TouchableOpacity
      style={styles.itemContainer}
      onPress={() => dispatch(toggleItemChecked(item.id))}
    >
      <View style={styles.itemContent}>
        <Text style={[styles.itemName, item.isChecked && styles.checkedItem]}>
          {item.name}
        </Text>
        <Text style={styles.itemQuantity}>
          {item.quantity} {item.unit}
        </Text>
      </View>
      <TouchableOpacity
        onPress={() => dispatch(removeItem(item.id))}
        style={styles.deleteButton}
      >
        <Text style={styles.deleteButtonText}>×</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Item name"
          value={newItemName}
          onChangeText={setNewItemName}
        />
        <TextInput
          style={[styles.input, styles.quantityInput]}
          placeholder="Qty"
          value={newItemQuantity}
          onChangeText={setNewItemQuantity}
          keyboardType="numeric"
        />
        <TextInput
          style={[styles.input, styles.unitInput]}
          placeholder="Unit"
          value={newItemUnit}
          onChangeText={setNewItemUnit}
        />
        <TouchableOpacity style={styles.addButton} onPress={handleAddItem}>
          <Text style={styles.addButtonText}>Add</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={items}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        style={styles.list}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  inputContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  input: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 8,
    marginRight: 8,
  },
  quantityInput: {
    flex: 0.5,
  },
  unitInput: {
    flex: 0.5,
  },
  addButton: {
    backgroundColor: '#007AFF',
    padding: 10,
    borderRadius: 8,
    justifyContent: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  list: {
    flex: 1,
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  itemContent: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
  },
  checkedItem: {
    textDecorationLine: 'line-through',
    color: '#888',
  },
  itemQuantity: {
    fontSize: 14,
    color: '#666',
  },
  deleteButton: {
    padding: 8,
  },
  deleteButtonText: {
    color: '#FF3B30',
    fontSize: 24,
  },
});

export default GroceryListScreen; 