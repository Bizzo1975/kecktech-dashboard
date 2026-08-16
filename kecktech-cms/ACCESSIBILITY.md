# Accessibility Guide

This document outlines accessibility features and testing procedures.

## WCAG 2.1 AA Compliance

The website is designed to meet WCAG 2.1 Level AA standards.

### Color Contrast
- Text contrast ratio: 4.5:1 (normal text)
- Large text contrast ratio: 3:1
- Interactive elements: 3:1
- All colors tested with contrast checkers

### Keyboard Navigation
- All interactive elements accessible via keyboard
- Tab order logical and intuitive
- Focus indicators visible
- Skip links for main content

### Screen Readers
- Semantic HTML used throughout
- ARIA labels where needed
- Alt text for all images
- Form labels properly associated
- Headings structured hierarchically

### Forms
- All inputs have associated labels
- Error messages clearly associated
- Required fields indicated
- Validation feedback accessible

### Images
- All images have descriptive alt text
- Decorative images have empty alt attributes
- Complex images have detailed descriptions

### Links
- Link text is descriptive
- Links open in same window (unless indicated)
- External links clearly marked

## Testing Tools

### Automated Testing
- axe DevTools browser extension
- WAVE browser extension
- Lighthouse accessibility audit

### Manual Testing
- Keyboard-only navigation
- Screen reader testing (NVDA, JAWS, VoiceOver)
- Color contrast checkers
- Zoom testing (200%)

## Accessibility Features Implemented

1. **Semantic HTML**
   - Proper use of headings (h1-h6)
   - Semantic elements (nav, main, article, section)
   - Proper form structure

2. **ARIA Attributes**
   - aria-label for icon buttons
   - aria-describedby for form errors
   - aria-expanded for collapsible content
   - role attributes where needed

3. **Focus Management**
   - Visible focus indicators
   - Focus trap in modals
   - Focus restoration after modal close

4. **Color and Contrast**
   - High contrast mode support
   - Dark mode available
   - Color not sole indicator

5. **Responsive Design**
   - Works at all zoom levels
   - Mobile-friendly touch targets
   - No horizontal scrolling

## Known Issues

None currently. Report accessibility issues via contact form.

## Resources

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [axe DevTools](https://www.deque.com/axe/devtools/)

