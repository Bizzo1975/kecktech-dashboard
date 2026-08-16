// Simple script to create admin user - works around Prisma client issues
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

// Use the same DATABASE_URL as Prisma, or fallback to default
// Try to read from .env file manually
let dbPath = process.env.DATABASE_URL;
if (!dbPath) {
  // Try to read .env file
  try {
    const envPath = path.join(__dirname, '../.env');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      const match = envContent.match(/DATABASE_URL=["']?([^"'\n]+)["']?/);
      if (match) {
        dbPath = match[1];
      }
    }
  } catch (e) {
    // Ignore errors reading .env
  }
}

// Parse DATABASE_URL format (file:./dev.db or file:./prisma/dev.db)
if (dbPath) {
  dbPath = dbPath.replace(/^file:/, '');
  if (!path.isAbsolute(dbPath)) {
    dbPath = path.join(__dirname, '..', dbPath);
  }
} else {
  // Fallback to default location
  dbPath = path.join(__dirname, '../dev.db');
}

console.log('Using database path:', dbPath);

async function createAdmin() {
  // Check if database exists
  if (!require('fs').existsSync(dbPath)) {
    console.log('Database not found. Please run "npm run db:push" first.');
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('Error opening database:', err);
        reject(err);
        return;
      }
    });

    const email = process.env.ADMIN_EMAIL || 'admin@kecktech.com';
    const password = process.env.ADMIN_PASSWORD || 'admin123';

    // Hash password
    bcrypt.hash(password, 10, (err, hash) => {
      if (err) {
        console.error('Error hashing password:', err);
        db.close();
        reject(err);
        return;
      }

      // Check if user exists and delete if it does
      db.get('SELECT * FROM User WHERE email = ?', [email], (err, row) => {
        if (err) {
          console.error('Error checking user:', err);
          db.close();
          reject(err);
          return;
        }

        if (row) {
          console.log(`⚠ Admin user with email ${email} already exists. Deleting and recreating...`);
          // Delete existing user to recreate with fresh hash
          db.run('DELETE FROM User WHERE email = ?', [email], (deleteErr) => {
            if (deleteErr) {
              console.error('Error deleting existing user:', deleteErr);
              db.close();
              reject(deleteErr);
              return;
            }
            console.log('✓ Deleted existing user, creating new one...');
            createUser();
          });
        } else {
          createUser();
        }

        function createUser() {
          // Create user
          const id = 'admin-' + Date.now();
          const now = new Date().toISOString();
          
          db.run(
            `INSERT INTO User (id, email, passwordHash, name, role, createdAt, updatedAt)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [id, email, hash, 'Admin User', 'admin', now, now],
            function(insertErr) {
              if (insertErr) {
                console.error('Error creating user:', insertErr);
                db.close();
                reject(insertErr);
                return;
              }

              console.log('✓ Admin user created successfully!');
              console.log(`  Email: ${email}`);
              console.log(`  Password: ${password}`);
              console.log('\n⚠️  Please change the password in production!');
              db.close();
              resolve();
            }
          );
        }
      });
    });
  });
}

createAdmin()
  .then(() => {
    // Don't exit with error code if user already exists (that's fine)
    process.exit(0);
  })
  .catch((err) => {
    // Only exit with error if it's a real error (not "user exists")
    if (err.message && err.message.includes('already exists')) {
      process.exit(0);
    } else {
      console.error('Failed to create admin user:', err);
      process.exit(1);
    }
  });

