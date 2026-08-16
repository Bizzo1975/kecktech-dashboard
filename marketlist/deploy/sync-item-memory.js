const { sequelize, ItemMemory } = require('./dist/models');

(async () => {
  await sequelize.authenticate();
  await ItemMemory.sync();
  console.log('item_memories_ok');
  process.exit(0);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
