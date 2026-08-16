import { normalizeItemName, suggestCategoryAndAisle } from '@marketlist/shared';
import {
  CatalogItem,
  GroceryList,
  Household,
  HouseholdMember,
  ItemMemory,
  ListItem,
  MealPlan,
  PantryItem,
  PriceHistory,
  Recipe,
  RecipeIngredient,
  Store,
  User,
  sequelize,
} from '../models';
import { runMigrations } from './migrate';

const DEMO_EMAIL = 'demo@marketlist.app';
const DEMO_PASSWORD = 'demo12345';
const PARTNER_EMAIL = 'partner@marketlist.app';

const WEEKLY_ITEMS = [
  'Whole milk',
  'Sourdough bread',
  'Bananas',
  'Chicken thighs',
  'Olive oil',
  'Sparkling water',
  'Eggs',
  'Spinach',
  'Greek yogurt',
  'Pasta',
  'Garlic',
  'Bell peppers',
];

const CATALOG_ITEMS = [
  { name: 'Eggs', category: 'Dairy', description: 'Dozen large' },
  { name: 'Avocados', category: 'Produce', description: null },
  { name: 'Whole milk', category: 'Dairy', description: 'Gallon' },
  { name: 'Sourdough bread', category: 'Bakery', description: null },
  { name: 'Bananas', category: 'Produce', description: null },
  { name: 'Chicken thighs', category: 'Meat', description: 'Boneless' },
  { name: 'Olive oil', category: 'Pantry', description: 'Extra virgin' },
  { name: 'Sparkling water', category: 'Beverages', description: null },
  { name: 'Spinach', category: 'Produce', description: 'Fresh bag' },
  { name: 'Greek yogurt', category: 'Dairy', description: 'Plain' },
  { name: 'Pasta', category: 'Pantry', description: 'Spaghetti' },
  { name: 'Rice', category: 'Pantry', description: 'Long grain' },
  { name: 'Garlic', category: 'Produce', description: null },
  { name: 'Bell peppers', category: 'Produce', description: null },
  { name: 'Tomatoes', category: 'Produce', description: null },
  { name: 'Cheddar cheese', category: 'Dairy', description: null },
  { name: 'Butter', category: 'Dairy', description: 'Salted' },
];

const daysFromNow = (days: number): string => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

const daysAgo = (days: number): Date => new Date(Date.now() - days * 86400000);

export const seedDemo = async () => {
  await runMigrations();

  let user = await User.findOne({ where: { email: DEMO_EMAIL } });
  if (!user) {
    user = await User.create({
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
      name: 'Demo Shopper',
      dietaryPrefs: ['vegetarian'],
    });
  } else {
    await user.update({ dietaryPrefs: user.dietaryPrefs?.length ? user.dietaryPrefs : ['vegetarian'] });
  }

  let partner = await User.findOne({ where: { email: PARTNER_EMAIL } });
  if (!partner) {
    partner = await User.create({
      email: PARTNER_EMAIL,
      password: DEMO_PASSWORD,
      name: 'Alex Partner',
      dietaryPrefs: [],
    });
  }

  let membership = await HouseholdMember.findOne({ where: { userId: user.id } });
  let household: Household;
  if (membership) {
    household = (await Household.findByPk(membership.householdId)) as Household;
  } else {
    household = await Household.create({
      name: 'Demo Home',
      inviteCode: 'DEMO01',
    });
    await HouseholdMember.create({
      householdId: household.id,
      userId: user.id,
      role: 'owner',
    });
  }

  const partnerMembership = await HouseholdMember.findOne({
    where: { userId: partner.id, householdId: household.id },
  });
  if (!partnerMembership) {
    await HouseholdMember.create({
      householdId: household.id,
      userId: partner.id,
      role: 'member',
    });
  }

  let list = await GroceryList.findOne({
    where: { householdId: household.id, name: 'Weekly run' },
  });
  if (!list) {
    list = await GroceryList.create({
      householdId: household.id,
      name: 'Weekly run',
      sortMode: 'aisle',
      type: 'shopping',
    });
  }

  const existingItems = await ListItem.findAll({ where: { listId: list.id } });
  const existingNames = new Set(existingItems.map((i) => normalizeItemName(i.name)));
  for (const name of WEEKLY_ITEMS) {
    if (existingNames.has(normalizeItemName(name))) continue;
    const suggested = suggestCategoryAndAisle(name);
    await ListItem.create({
      listId: list.id,
      name,
      category: suggested.category,
      aisleSection: suggested.aisleSection,
      quantity: 1,
      createdBy: user.id,
    });
  }

  const pantryDefs = [
    {
      name: 'Greek yogurt',
      category: 'Dairy',
      quantity: 2,
      unit: 'cups',
      expiryDate: daysFromNow(3),
      lowStockThreshold: 1,
    },
    {
      name: 'Rice',
      category: 'Pantry',
      quantity: 0.5,
      unit: 'bag',
      expiryDate: null as string | null,
      lowStockThreshold: 1,
    },
    {
      name: 'Spinach',
      category: 'Produce',
      quantity: 1,
      unit: 'bag',
      expiryDate: daysFromNow(1),
      lowStockThreshold: 1,
    },
    {
      name: 'Olive oil',
      category: 'Pantry',
      quantity: 1,
      unit: 'bottle',
      expiryDate: null as string | null,
      lowStockThreshold: 0.25,
    },
    {
      name: 'Eggs',
      category: 'Dairy',
      quantity: 12,
      unit: 'count',
      expiryDate: daysFromNow(14),
      lowStockThreshold: 6,
    },
  ];

  for (const def of pantryDefs) {
    const existing = await PantryItem.findOne({
      where: { householdId: household.id, name: def.name },
    });
    if (existing) {
      await existing.update({
        quantity: def.quantity,
        unit: def.unit,
        expiryDate: def.expiryDate,
        lowStockThreshold: def.lowStockThreshold,
        category: def.category,
      });
    } else {
      await PantryItem.create({
        householdId: household.id,
        ...def,
      });
    }
  }

  for (const item of CATALOG_ITEMS) {
    const existing = await CatalogItem.findOne({ where: { name: item.name } });
    if (!existing) {
      await CatalogItem.create(item);
    }
  }

  let neighborhood = await Store.findOne({
    where: { name: 'Neighborhood Market', householdId: household.id },
  });
  if (!neighborhood) {
    neighborhood = await Store.create({
      name: 'Neighborhood Market',
      householdId: household.id,
    });
  }

  let costClub = await Store.findOne({
    where: { name: 'Cost Club', householdId: household.id },
  });
  if (!costClub) {
    costClub = await Store.create({
      name: 'Cost Club',
      householdId: household.id,
    });
  }

  const priceSeed: Array<{
    itemName: string;
    storeId: string;
    price: number;
    daysAgo: number;
    category: string;
  }> = [
    { itemName: 'Whole milk', storeId: neighborhood.id, price: 3.49, daysAgo: 0, category: 'Dairy' },
    { itemName: 'Whole milk', storeId: neighborhood.id, price: 3.99, daysAgo: 7, category: 'Dairy' },
    { itemName: 'Whole milk', storeId: costClub.id, price: 2.99, daysAgo: 3, category: 'Dairy' },
    { itemName: 'Whole milk', storeId: costClub.id, price: 3.19, daysAgo: 14, category: 'Dairy' },
    { itemName: 'Eggs', storeId: neighborhood.id, price: 4.29, daysAgo: 2, category: 'Dairy' },
    { itemName: 'Eggs', storeId: neighborhood.id, price: 4.49, daysAgo: 9, category: 'Dairy' },
    { itemName: 'Eggs', storeId: costClub.id, price: 3.79, daysAgo: 5, category: 'Dairy' },
    { itemName: 'Bananas', storeId: neighborhood.id, price: 0.59, daysAgo: 1, category: 'Produce' },
    { itemName: 'Bananas', storeId: neighborhood.id, price: 0.69, daysAgo: 8, category: 'Produce' },
    { itemName: 'Bananas', storeId: costClub.id, price: 0.49, daysAgo: 4, category: 'Produce' },
    { itemName: 'Chicken thighs', storeId: neighborhood.id, price: 6.99, daysAgo: 6, category: 'Meat' },
    { itemName: 'Chicken thighs', storeId: costClub.id, price: 5.49, daysAgo: 12, category: 'Meat' },
    { itemName: 'Chicken thighs', storeId: neighborhood.id, price: 7.29, daysAgo: 20, category: 'Meat' },
    { itemName: 'Olive oil', storeId: neighborhood.id, price: 8.99, daysAgo: 10, category: 'Pantry' },
    { itemName: 'Olive oil', storeId: costClub.id, price: 7.49, daysAgo: 25, category: 'Pantry' },
    { itemName: 'Greek yogurt', storeId: neighborhood.id, price: 5.49, daysAgo: 3, category: 'Dairy' },
    { itemName: 'Greek yogurt', storeId: neighborhood.id, price: 5.99, daysAgo: 17, category: 'Dairy' },
    { itemName: 'Pasta', storeId: neighborhood.id, price: 1.79, daysAgo: 11, category: 'Pantry' },
    { itemName: 'Pasta', storeId: costClub.id, price: 1.29, daysAgo: 18, category: 'Pantry' },
    { itemName: 'Spinach', storeId: neighborhood.id, price: 3.49, daysAgo: 2, category: 'Produce' },
    { itemName: 'Spinach', storeId: neighborhood.id, price: 3.99, daysAgo: 9, category: 'Produce' },
    { itemName: 'Sourdough bread', storeId: neighborhood.id, price: 4.99, daysAgo: 1, category: 'Bakery' },
    { itemName: 'Sourdough bread', storeId: costClub.id, price: 3.99, daysAgo: 15, category: 'Bakery' },
    { itemName: 'Rice', storeId: costClub.id, price: 12.99, daysAgo: 30, category: 'Pantry' },
    { itemName: 'Rice', storeId: neighborhood.id, price: 4.49, daysAgo: 45, category: 'Pantry' },
  ];

  const priceCount = await PriceHistory.count({ where: { householdId: household.id } });
  if (priceCount < 20) {
    for (const row of priceSeed) {
      const already = await PriceHistory.findOne({
        where: {
          householdId: household.id,
          itemName: row.itemName,
          storeId: row.storeId,
          price: row.price,
        },
      });
      if (already) continue;
      await PriceHistory.create({
        itemName: row.itemName,
        storeId: row.storeId,
        householdId: household.id,
        price: row.price,
        recordedAt: daysAgo(row.daysAgo),
        category: row.category,
      });
    }
  }

  const recipeDefs = [
    {
      name: 'Pasta night',
      category: 'Dinner',
      instructions: 'Boil pasta. Simmer garlic and tomatoes. Toss together with olive oil.',
      ingredients: [
        { name: 'Pasta', quantity: 1, unit: 'box' },
        { name: 'Garlic', quantity: 3, unit: 'cloves' },
        { name: 'Tomatoes', quantity: 4, unit: 'count' },
        { name: 'Olive oil', quantity: 2, unit: 'tbsp' },
      ],
    },
    {
      name: 'Stir fry',
      category: 'Dinner',
      instructions: 'Stir-fry chicken with peppers and garlic. Serve over rice.',
      ingredients: [
        { name: 'Chicken thighs', quantity: 1, unit: 'lb' },
        { name: 'Bell peppers', quantity: 2, unit: 'count' },
        { name: 'Garlic', quantity: 2, unit: 'cloves' },
        { name: 'Rice', quantity: 2, unit: 'cups' },
        { name: 'Olive oil', quantity: 1, unit: 'tbsp' },
      ],
    },
    {
      name: 'Yogurt bowls',
      category: 'Breakfast',
      instructions: 'Scoop yogurt, top with bananas and a drizzle of honey if desired.',
      ingredients: [
        { name: 'Greek yogurt', quantity: 2, unit: 'cups' },
        { name: 'Bananas', quantity: 2, unit: 'count' },
        { name: 'Spinach', quantity: 1, unit: 'handful' },
      ],
    },
  ];

  const recipeByName = new Map<string, Recipe>();
  for (const def of recipeDefs) {
    let recipe = await Recipe.findOne({ where: { userId: user.id, name: def.name } });
    if (!recipe) {
      recipe = await Recipe.create({
        userId: user.id,
        householdId: household.id,
        name: def.name,
        instructions: def.instructions,
        category: def.category,
      });
      for (const ing of def.ingredients) {
        await RecipeIngredient.create({
          recipeId: recipe.id,
          name: ing.name,
          quantity: ing.quantity,
          unit: ing.unit,
        });
      }
    }
    recipeByName.set(def.name, recipe);
  }

  const dinnerRecipes = ['Pasta night', 'Stir fry', 'Yogurt bowls', 'Pasta night', 'Stir fry'];
  for (let i = 0; i < 5; i += 1) {
    const plannedDate = daysFromNow(i);
    const recipeName = dinnerRecipes[i];
    const recipe = recipeByName.get(recipeName);
    if (!recipe) continue;

    const existingPlan = await MealPlan.findOne({
      where: {
        userId: user.id,
        plannedDate,
        mealType: 'dinner',
      },
    });
    if (existingPlan) continue;

    await MealPlan.create({
      userId: user.id,
      householdId: household.id,
      recipeId: recipe.id,
      plannedDate,
      mealType: 'dinner',
      notes: null,
    });
  }

  const listItems = await ListItem.findAll({ where: { listId: list.id } });
  for (const item of listItems) {
    const canonicalName = normalizeItemName(item.name);
    const existingMemory = await ItemMemory.findOne({
      where: { householdId: household.id, canonicalName },
    });
    if (existingMemory) {
      await existingMemory.update({
        displayName: item.name,
        category: item.category,
        aisleSection: item.aisleSection,
        lastQuantity: item.quantity,
        lastUnit: item.unit,
        lastUsedAt: new Date(),
      });
    } else {
      await ItemMemory.create({
        householdId: household.id,
        canonicalName,
        displayName: item.name,
        category: item.category,
        aisleSection: item.aisleSection,
        lastQuantity: item.quantity,
        lastUnit: item.unit,
        useCount: 1,
        lastUsedAt: new Date(),
      });
    }
  }

  return {
    email: DEMO_EMAIL,
    password: DEMO_PASSWORD,
    partnerEmail: PARTNER_EMAIL,
    partnerPassword: DEMO_PASSWORD,
    householdId: household.id,
    inviteCode: household.inviteCode,
    listId: list.id,
  };
};

if (require.main === module) {
  sequelize
    .authenticate()
    .then(() => seedDemo())
    .then((info) => {
      console.log('Demo seed complete');
      console.log(JSON.stringify(info, null, 2));
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
