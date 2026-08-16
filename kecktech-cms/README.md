# Kecktech IT Service & Support Website

A modern, professional website for Kecktech IT Service & Support business, built with Next.js 16, TypeScript, and Tailwind CSS. Features a complete Content Management System for easy service offering management.

## 🚀 Features

- 🎨 Modern, cutting-edge design with 2025 trends
- 🌙 Dark mode support with system preference detection
- 📱 Fully responsive and mobile-first design
- 🔐 Admin authentication system
- 📝 Content Management System for service offerings
- ⚡ Optimized for performance and SEO
- ♿ Accessible (WCAG 2.1 AA compliant)
- 🎭 Smooth animations and micro-interactions
- 🔍 SEO optimized with structured data
- 📊 Analytics ready

## 🛠️ Tech Stack

- **Framework**: Next.js 16 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **Database**: SQLite (dev) / PostgreSQL (production) with Prisma ORM
- **Authentication**: NextAuth.js
- **UI Components**: Radix UI primitives
- **Animations**: Framer Motion
- **Forms**: React Hook Form with Zod validation
- **Testing**: Jest + React Testing Library

## 📋 Prerequisites

- Node.js 18+ 
- npm or yarn
- Git

## 🚀 Quick Start

### Option 1: Using Startup Script (Windows)

**PowerShell:**
```powershell
.\startup-all.ps1
```

**Command Prompt:**
```cmd
startup-all.bat
```

### Option 2: Manual Setup

1. **Install dependencies**:
```bash
npm install
```

2. **Set up environment variables**:
```bash
cp .env.example .env
```

Edit `.env` and configure:
- `DATABASE_URL` - SQLite database path (or PostgreSQL for production)
- `NEXTAUTH_SECRET` - Secret key for NextAuth (generate: `openssl rand -base64 32`)
- `NEXTAUTH_URL` - Your site URL (http://localhost:3000 for development)
- `ADMIN_EMAIL` - Admin user email
- `ADMIN_PASSWORD` - Admin user password (will be hashed)
- `NEXT_PUBLIC_SITE_URL` - Your site URL

3. **Generate Prisma client**:
```bash
npm run db:generate
```

4. **Push database schema**:
```bash
npm run db:push
```

5. **Seed admin user**:
```bash
npm run db:seed
```

6. **Start development server**:
```bash
npm run dev
```

Open [http://localhost:3021](http://localhost:3021) in your browser.

**Note**: Development server uses port 3021. Production will use port 3000.

## 📁 Project Structure

```
website/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   ├── admin/             # Admin panel pages
│   └── (pages)/           # Public pages
├── components/             # React components
│   ├── ui/                # Reusable UI components
│   ├── admin/             # Admin components
│   ├── layout/            # Layout components
│   └── animations/        # Animation components
├── lib/                   # Utility functions
├── prisma/                # Prisma schema and migrations
├── public/                # Static assets
├── scripts/               # Utility scripts
├── __tests__/             # Test files
└── types/                 # TypeScript type definitions
```

## 📚 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint errors
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting
- `npm run test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage
- `npm run db:generate` - Generate Prisma client
- `npm run db:push` - Push database schema changes
- `npm run db:migrate` - Create and run migrations
- `npm run db:studio` - Open Prisma Studio
- `npm run db:seed` - Seed admin user

## 🗄️ Database Schema

The project uses Prisma ORM. Key models:

- **User** - Admin users for authentication
- **Service** - IT service offerings
- **ServiceCategory** - Service categories
- **Page** - CMS pages
- **Setting** - Site-wide settings

## 🔐 Admin Panel

Access the admin panel at `/admin/login` after seeding the admin user.

**Default credentials** (change in production):
- Email: `admin@kecktech.com` (or as set in `.env`)
- Password: `admin123` (or as set in `.env`)

See [CMS_DOCUMENTATION.md](./CMS_DOCUMENTATION.md) for detailed CMS usage.

## 🎨 Design Features

- **Glassmorphism**: Modern frosted glass effects
- **Micro-interactions**: Smooth hover and click animations
- **Scroll animations**: Elements animate on scroll
- **Geometric backgrounds**: Animated shape backgrounds
- **Dark mode**: System preference detection with manual toggle
- **Responsive grids**: Mobile-first responsive layouts

## ♿ Accessibility

- WCAG 2.1 AA compliant
- Keyboard navigation support
- Screen reader compatible
- High contrast mode
- Focus indicators
- Semantic HTML

See [ACCESSIBILITY.md](./ACCESSIBILITY.md) for details.

## 🔒 Security

- Password hashing with bcrypt
- JWT authentication
- Role-based access control
- Input validation
- XSS prevention
- SQL injection prevention (Prisma ORM)

See [SECURITY.md](./SECURITY.md) for details.

## 🧪 Testing

- Unit tests with Jest
- Component tests with React Testing Library
- Accessibility testing
- Cross-browser testing
- Performance testing

See [TESTING.md](./TESTING.md) for details.

## 📦 Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy

### Self-Hosted

1. Build the project: `npm run build`
2. Start the server: `npm run start`
3. Set up reverse proxy (Nginx recommended)
4. Configure SSL certificate

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.

## 📖 Documentation

- [PROJECT_PLAN.md](../PROJECT_PLAN.md) - Complete project plan
- [CMS_DOCUMENTATION.md](./CMS_DOCUMENTATION.md) - CMS usage guide
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Deployment guide
- [TESTING.md](./TESTING.md) - Testing guide
- [QA_CHECKLIST.md](./QA_CHECKLIST.md) - Quality assurance checklist
- [ACCESSIBILITY.md](./ACCESSIBILITY.md) - Accessibility guide
- [SECURITY.md](./SECURITY.md) - Security guide

## 🎯 Key Pages

- `/` - Homepage with hero and services overview
- `/services` - All services listing
- `/services/[slug]` - Individual service details
- `/about` - About us page
- `/contact` - Contact form
- `/admin` - Admin dashboard
- `/admin/services` - Service management
- `/admin/login` - Admin login

## Development Port

- **Development**: Port 3021 (http://localhost:3021)
- **Production**: Port 3000 (configured on VM)

## 🐛 Troubleshooting

### Database Issues
- Ensure Prisma client is generated: `npm run db:generate`
- Check database URL in `.env`
- Run migrations: `npm run db:migrate`

### Authentication Issues
- Verify `NEXTAUTH_SECRET` is set
- Check `NEXTAUTH_URL` matches your domain
- Ensure admin user exists: `npm run db:seed`

### Build Issues
- Clear `.next` folder: `rm -rf .next`
- Reinstall dependencies: `rm -rf node_modules && npm install`
- Check TypeScript errors: `npm run build`

## 📝 License

Private - Kecktech IT Service & Support

## 🙏 Acknowledgments

Built with modern web technologies and best practices for 2025.

---

**Status**: ✅ Production Ready

All 8 phases of development are complete. The website is ready for deployment and use.
