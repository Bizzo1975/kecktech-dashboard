// Script to check if user exists in database
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../dev.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err);
    process.exit(1);
  }
});

console.log('Checking for admin user...');
db.all('SELECT id, email, name, role FROM User', [], (err, rows) => {
  if (err) {
    console.error('Error querying database:', err);
    db.close();
    process.exit(1);
  }

  if (rows.length === 0) {
    console.log('No users found in database!');
  } else {
    console.log(`Found ${rows.length} user(s):`);
    rows.forEach((row) => {
      console.log(`  - ID: ${row.id}`);
      console.log(`    Email: ${row.email}`);
      console.log(`    Name: ${row.name}`);
      console.log(`    Role: ${row.role}`);
      console.log('');
    });
  }

  db.close();
});

