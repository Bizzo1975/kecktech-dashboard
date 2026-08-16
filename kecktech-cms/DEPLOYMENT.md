# Deployment Guide

This guide covers deploying the Kecktech IT Service & Support website to production.

## Pre-Deployment Checklist

Before deploying, ensure you've completed:
- [ ] All tests passing
- [ ] QA checklist completed
- [ ] Environment variables configured
- [ ] Database migrations run
- [ ] Admin user created
- [ ] SSL certificate ready
- [ ] Domain configured

## Deployment Options

### Option 1: Vercel (Recommended)

Vercel is the recommended platform for Next.js applications.

#### Steps:

1. **Install Vercel CLI** (if not already installed):
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**:
   ```bash
   vercel login
   ```

3. **Deploy**:
   ```bash
   vercel
   ```

4. **Production Deployment**:
   ```bash
   vercel --prod
   ```

#### Environment Variables

Set these in Vercel dashboard:
- `DATABASE_URL` - Your production database URL
- `NEXTAUTH_SECRET` - Generate with: `openssl rand -base64 32`
- `NEXTAUTH_URL` - Your production URL
- `NEXT_PUBLIC_SITE_URL` - Your production URL
- `ADMIN_EMAIL` - Admin user email
- `ADMIN_PASSWORD` - Admin user password (will be hashed)

#### Database Setup

1. Create production database (PostgreSQL recommended for production)
2. Run migrations:
   ```bash
   npx prisma migrate deploy
   ```
3. Seed admin user:
   ```bash
   npm run db:seed
   ```

### Option 2: Self-Hosted

#### Requirements
- Node.js 18+
- PostgreSQL or SQLite
- PM2 or similar process manager
- Nginx (recommended)

#### Steps:

1. **Build the application**:
   ```bash
   npm run build
   ```

2. **Start production server**:
   ```bash
   npm start
   ```

3. **Using PM2**:
   ```bash
   npm install -g pm2
   pm2 start npm --name "kecktech-website" -- start
   pm2 save
   pm2 startup
   ```

4. **Nginx Configuration**:
   ```nginx
   server {
       listen 80;
       server_name yourdomain.com;

       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

5. **SSL with Let's Encrypt**:
   ```bash
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d yourdomain.com
   ```

## Domain Configuration

### DNS Settings

Point your domain to your hosting provider:

**For Vercel:**
- Add domain in Vercel dashboard
- Update DNS records as instructed

**For Self-Hosted:**
- A record: Point to server IP
- CNAME: www subdomain

### SSL Certificate

- Vercel: Automatic SSL
- Self-Hosted: Use Let's Encrypt (free)

## Post-Deployment

### Development vs Production Ports

- **Development**: Port 3021 (local testing)
- **Production**: Port 3000 (VM configuration)

### 1. Verify Deployment
- [ ] Site loads at production URL
- [ ] All pages accessible
- [ ] Forms work correctly
- [ ] Admin panel accessible
- [ ] Database connected

### 2. Configure Analytics
- [ ] Google Analytics tracking
- [ ] Error monitoring (Sentry recommended)
- [ ] Performance monitoring

### 3. Set Up Monitoring
- [ ] Uptime monitoring
- [ ] Error alerts
- [ ] Performance alerts

### 4. Create Backups
- [ ] Database backup strategy
- [ ] Automated backups configured
- [ ] Backup restoration tested

## Environment Variables

### Production Environment Variables

```env
# Database
DATABASE_URL="postgresql://user:password@host:5432/database"

# NextAuth
NEXTAUTH_URL="https://yourdomain.com"
NEXTAUTH_SECRET="your-secret-key-here"

# Site Configuration
NEXT_PUBLIC_SITE_URL="https://yourdomain.com"

# Admin
ADMIN_EMAIL="admin@yourdomain.com"
ADMIN_PASSWORD="secure-password"

# Optional: Analytics
NEXT_PUBLIC_GA_ID="G-XXXXXXXXXX"
```

## Database Migration

### Production Migration

```bash
# Generate migration
npx prisma migrate dev --name production_migration

# Deploy to production
npx prisma migrate deploy

# Generate Prisma Client
npx prisma generate
```

## Rollback Procedure

If issues occur:

1. **Vercel**: Use deployment history to rollback
2. **Self-Hosted**: 
   - Stop current process
   - Restore previous build
   - Restore database backup if needed
   - Restart service

## Monitoring

### Recommended Tools

- **Uptime**: UptimeRobot, Pingdom
- **Errors**: Sentry, LogRocket
- **Performance**: Vercel Analytics, Google Analytics
- **Logs**: Vercel Logs, PM2 logs

## Maintenance

### Regular Tasks

- [ ] Weekly: Check error logs
- [ ] Monthly: Update dependencies
- [ ] Quarterly: Security audit
- [ ] As needed: Content updates

### Updates

```bash
# Update dependencies
npm update

# Check for security vulnerabilities
npm audit

# Fix vulnerabilities
npm audit fix
```

## Support

For deployment issues:
- Check logs: `vercel logs` or PM2 logs
- Review error monitoring
- Check database connectivity
- Verify environment variables

