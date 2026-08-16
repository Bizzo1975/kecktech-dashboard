# Lighthouse Audit Guide

This guide helps you run Lighthouse audits to measure and improve website performance.

## Running Lighthouse

### Option 1: Chrome DevTools
1. Open Chrome DevTools (F12)
2. Go to the "Lighthouse" tab
3. Select categories: Performance, Accessibility, Best Practices, SEO
4. Click "Analyze page load"

### Option 2: Lighthouse CLI
```bash
npm install -g @lhci/cli
lhci autorun --collect.url=http://localhost:3000
```

### Option 3: Online Tools
- [PageSpeed Insights](https://pagespeed.web.dev/)
- [WebPageTest](https://www.webpagetest.org/)

## Target Scores

- **Performance**: > 90
- **Accessibility**: > 90
- **Best Practices**: > 90
- **SEO**: > 90

## Common Optimizations

1. **Image Optimization**
   - Use Next.js Image component
   - Provide proper width/height
   - Use WebP/AVIF formats
   - Lazy load below-the-fold images

2. **Code Splitting**
   - Dynamic imports for heavy components
   - Route-based code splitting (automatic in Next.js)

3. **Font Optimization**
   - Use `next/font` for automatic optimization
   - Preload critical fonts

4. **Reduce JavaScript**
   - Tree-shake unused code
   - Minimize bundle size
   - Use dynamic imports

5. **Caching**
   - Set proper cache headers
   - Use CDN for static assets

6. **Core Web Vitals**
   - LCP (Largest Contentful Paint): < 2.5s
   - FID (First Input Delay): < 100ms
   - CLS (Cumulative Layout Shift): < 0.1

## Monitoring

Set up continuous monitoring:
- Google Search Console
- Vercel Analytics
- Custom performance monitoring

