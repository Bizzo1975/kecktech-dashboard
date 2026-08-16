# Quick Start Guide

Get the development server running in minutes!

## Option 1: Use Startup Script (Easiest)

### Windows PowerShell:
```powershell
.\startup-all.ps1
```

### Windows Command Prompt:
```cmd
startup-all.bat
```

The script will:
1. Check/install dependencies
2. Generate Prisma client
3. Set up database
4. Start development server

## Option 2: Manual Start

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Set Up Database
```bash
npm run db:generate
npm run db:push
```

### Step 3: Create Admin User (Optional)
If the seed script doesn't work, use Prisma Studio:
```bash
npm run db:studio
```
Then manually create a user in the User table with:
- email: admin@kecktech.com (or your preferred email)
- passwordHash: (use bcrypt to hash your password)
- name: Admin User
- role: admin

Or use this quick Node script:
```bash
node -e "const bcrypt = require('bcryptjs'); bcrypt.hash('yourpassword', 10).then(hash => console.log(hash));"
```

### Step 4: Start Server
```bash
npm run dev
```

## Access the Website

- **Homepage**: http://localhost:3021
- **Admin Panel**: http://localhost:3021/admin/login
- **Services**: http://localhost:3021/services
- **About**: http://localhost:3021/about
- **Contact**: http://localhost:3021/contact

**Note**: Development uses port 3021. Production uses port 3000.

## Default Admin Credentials

If you used the seed script:
- Email: `admin@kecktech.com` (or as set in `.env`)
- Password: `admin123` (or as set in `.env`)

**⚠️ IMPORTANT**: Change these credentials in production!

## Troubleshooting

### Port 3021 Already in Use
```bash
# Kill process on port 3021 (Windows)
netstat -ano | findstr :3021
taskkill /PID <PID> /F

# Or use a different port
PORT=3022 npm run dev
```

### Database Issues
```bash
# Reset database (WARNING: Deletes all data)
rm dev.db
npm run db:push
```

### Prisma Client Issues
```bash
# Regenerate Prisma client
npm run db:generate
```

### Module Not Found Errors
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

## Next Steps

1. ✅ Server running? Check http://localhost:3021
2. ✅ Can log in? Try /admin/login
3. ✅ Create a service? Go to /admin/services
4. ✅ Test the site? Browse all pages

## Need Help?

- Check [README.md](./README.md) for full documentation
- Review [DEPLOYMENT.md](./DEPLOYMENT.md) for deployment info
- See [CMS_DOCUMENTATION.md](./CMS_DOCUMENTATION.md) for CMS usage

