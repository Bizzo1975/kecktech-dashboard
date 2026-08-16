import { runMigrations } from './migrate';

runMigrations()
  .then(() => {
    console.log('Migrations finished');
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
