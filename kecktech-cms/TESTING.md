# Testing Guide

This document outlines the testing strategy and procedures for the Kecktech IT Service & Support website.

## Testing Strategy

### Unit Tests
- **Location**: `__tests__/` directory
- **Framework**: Jest + React Testing Library
- **Coverage Target**: Critical components and utilities
- **Run**: `npm test`

### Integration Tests
- Test component interactions
- Test form submissions
- Test API route handlers

### E2E Tests (Future)
- Playwright or Cypress for end-to-end testing
- Test critical user flows

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm test -- --coverage

# Run specific test file
npm test -- button.test.tsx
```

## Test Coverage Goals

- **Components**: > 70%
- **Utilities**: > 90%
- **API Routes**: > 80%

## Manual Testing Checklist

### Cross-Browser Testing
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile browsers (iOS Safari, Chrome Mobile)

### Responsive Design Testing
- [ ] Mobile (320px - 768px)
- [ ] Tablet (768px - 1024px)
- [ ] Desktop (1024px+)
- [ ] Large Desktop (1920px+)

### Accessibility Testing
- [ ] Keyboard navigation
- [ ] Screen reader compatibility
- [ ] Color contrast (WCAG AA)
- [ ] Focus indicators
- [ ] ARIA labels

### Functionality Testing
- [ ] User registration/login
- [ ] Service CRUD operations
- [ ] Form submissions
- [ ] Navigation
- [ ] Search functionality
- [ ] Image loading

## Performance Testing

### Lighthouse Scores
- Performance: > 90
- Accessibility: > 90
- Best Practices: > 90
- SEO: > 90

### Core Web Vitals
- LCP: < 2.5s
- FID: < 100ms
- CLS: < 0.1

## Security Testing

- [ ] Input validation
- [ ] XSS prevention
- [ ] CSRF protection
- [ ] SQL injection prevention
- [ ] Authentication/authorization
- [ ] API security

## Browser Compatibility

### Supported Browsers
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

### Mobile
- iOS Safari 14+
- Chrome Mobile 90+

## Continuous Integration

Tests should run automatically on:
- Pull requests
- Commits to main branch
- Before deployment

