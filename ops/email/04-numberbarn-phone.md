# NumberBarn business phone (kecktech.net only)

## Buy

1. https://www.numberbarn.com/ — Forward plan (~$6.99/mo)
2. Prefer Wichita / 316 area if available
3. Set call forward destination to your personal cell
4. Optional: SMS add-on (~$1/mo)

## Do not

- Port the Google Voice free number `(316) 768-0034`
- Publish any phone on willworkforlunch, jacob-roman, unclejonsitgarage, or product demos

## After you have the number

Update these files in the kecktech website repo:

- `dashboard/website/src/data/global.json` → `phone`
- `dashboard/website/src/data/contact.json` → `phone` / intro text
- `dashboard/website/src/pages/privacy.astro` / about / ContactForm copy if hardcoded

Replace `(316) 768-0034` with the new NumberBarn number, then deploy.

Until the number is purchased, site phone fields use placeholder `PENDING_NUMBERBARN` in inventory notes only — keep existing GV number temporarily or remove from public pages per preference.
