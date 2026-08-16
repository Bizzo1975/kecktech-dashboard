# Quality Assurance Checklist

Use this checklist before deploying to production.

## Pre-Deployment Checklist

### Code Quality
- [ ] All linting errors resolved
- [ ] Code formatted with Prettier
- [ ] TypeScript errors resolved
- [ ] No console.log statements in production code
- [ ] No commented-out code
- [ ] All TODOs documented or resolved

### Functionality
- [ ] All pages load correctly
- [ ] Navigation works on all pages
- [ ] Forms submit and validate correctly
- [ ] Admin panel functions properly
- [ ] Service CRUD operations work
- [ ] Authentication works
- [ ] Search functionality works (if applicable)

### Responsive Design
- [ ] Mobile view (320px - 768px) tested
- [ ] Tablet view (768px - 1024px) tested
- [ ] Desktop view (1024px+) tested
- [ ] Large screens (1920px+) tested
- [ ] Touch interactions work on mobile
- [ ] No horizontal scrolling on any device

### Browser Compatibility
- [ ] Chrome (latest) tested
- [ ] Firefox (latest) tested
- [ ] Safari (latest) tested
- [ ] Edge (latest) tested
- [ ] Mobile browsers tested

### Accessibility (WCAG 2.1 AA)
- [ ] All images have alt text
- [ ] Form inputs have labels
- [ ] Keyboard navigation works
- [ ] Focus indicators visible
- [ ] Color contrast meets AA standards
- [ ] Screen reader tested
- [ ] ARIA labels where needed
- [ ] Semantic HTML used

### Performance
- [ ] Lighthouse Performance score > 90
- [ ] Lighthouse Accessibility score > 90
- [ ] Lighthouse Best Practices score > 90
- [ ] Lighthouse SEO score > 90
- [ ] Page load time < 3 seconds
- [ ] Images optimized
- [ ] Code splitting working
- [ ] No large bundle sizes

### SEO
- [ ] Meta tags present on all pages
- [ ] Open Graph tags present
- [ ] Structured data (JSON-LD) present
- [ ] Sitemap.xml accessible
- [ ] Robots.txt configured
- [ ] Canonical URLs set
- [ ] 404 page works
- [ ] Error pages work

### Security
- [ ] Environment variables secured
- [ ] API routes protected
- [ ] Input validation on all forms
- [ ] XSS prevention
- [ ] CSRF protection
- [ ] Authentication secure
- [ ] Passwords hashed
- [ ] SQL injection prevention

### Content
- [ ] All text proofread
- [ ] No placeholder text
- [ ] Images optimized and compressed
- [ ] Links work correctly
- [ ] Contact information correct
- [ ] Service descriptions complete

### Database
- [ ] Database migrations run
- [ ] Seed data populated (if needed)
- [ ] Backup strategy in place
- [ ] Database optimized

### Environment
- [ ] Production environment variables set
- [ ] Database connection working
- [ ] API endpoints working
- [ ] File uploads working (if applicable)
- [ ] Email sending works (if applicable)

### Monitoring
- [ ] Analytics configured
- [ ] Error tracking set up
- [ ] Performance monitoring active
- [ ] Uptime monitoring configured

### Documentation
- [ ] README updated
- [ ] API documentation complete
- [ ] Deployment guide written
- [ ] Environment setup documented

## Post-Deployment Checklist

- [ ] Site accessible at production URL
- [ ] All pages load correctly
- [ ] Forms submit successfully
- [ ] Admin panel accessible
- [ ] Analytics tracking working
- [ ] Error monitoring active
- [ ] Performance metrics acceptable
- [ ] SSL certificate valid
- [ ] DNS configured correctly

## Rollback Plan

- [ ] Previous version backed up
- [ ] Database backup created
- [ ] Rollback procedure documented
- [ ] Team notified of deployment

