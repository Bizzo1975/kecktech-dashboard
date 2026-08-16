# Creating Admin User

Due to Prisma 7 compatibility, use one of these methods to create an admin user:

## Method 1: Using Prisma Studio (Recommended)

1. Open Prisma Studio:
   ```bash
   npm run db:studio
   ```

2. Prisma Studio will open in your browser (usually http://localhost:5555)

3. Click on the **User** model

4. Click **Add record**

5. Fill in the form:
   - **email**: `admin@kecktech.com` (or your preferred email)
   - **passwordHash**: Generate using the command below
   - **name**: `Admin User` (optional)
   - **role**: `admin`

6. Click **Save 1 change**

### Generate Password Hash

Run this in a separate terminal:
```bash
node -e "const bcrypt = require('bcryptjs'); bcrypt.hash('yourpassword', 10).then(hash => console.log('Hash:', hash));"
```

Copy the hash and paste it into the passwordHash field.

## Method 2: Using SQL (Advanced)

1. Open your database file (dev.db) with a SQLite browser
2. Run this SQL (replace the hash with your generated hash):

```sql
INSERT INTO User (id, email, passwordHash, name, role, createdAt, updatedAt)
VALUES (
  'admin-001',
  'admin@kecktech.com',
  '$2a$10$YOUR_HASHED_PASSWORD_HERE',
  'Admin User',
  'admin',
  datetime('now'),
  datetime('now')
);
```

## Method 3: Direct Database Edit

1. Install DB Browser for SQLite (or similar)
2. Open `dev.db`
3. Navigate to User table
4. Add new record with the fields above

## Quick Test Credentials

After creating the user, you can log in at:
- URL: http://localhost:3021/admin/login
- Email: `admin@kecktech.com`
- Password: `admin123` (or whatever you set)

## Verify User Creation

Check if user exists:
```bash
npm run db:studio
```

Look in the User table to confirm your admin user is there.

