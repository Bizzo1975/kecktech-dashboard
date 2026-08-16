export interface GroceryItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  price?: number;
  store?: string;
  category?: string;
  isChecked: boolean;
}

export interface Recipe {
  id: string;
  name: string;
  ingredients: GroceryItem[];
  instructions: string[];
  prepTime: number;
  cookTime: number;
  servings: number;
  image?: string;
}

export interface MealPlan {
  id: string;
  date: string;
  meals: {
    breakfast?: Recipe;
    lunch?: Recipe;
    dinner?: Recipe;
    snacks?: Recipe[];
  };
}

export interface PantryItem extends GroceryItem {
  expiryDate?: string;
  location?: string;
}

export interface Store {
  id: string;
  name: string;
  location: string;
  items: {
    itemId: string;
    price: number;
    lastUpdated: string;
  }[];
} 