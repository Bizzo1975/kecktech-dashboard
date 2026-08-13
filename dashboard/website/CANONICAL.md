# Kecktech marketing site — canonical tree

**This directory is the canonical public marketing site** for kecktech.net
(Astro: Home / About / Services / Pricing / Blog HTML / Demos / Contact).

| Surface | Local path | Live path |
|---------|------------|-----------|
| Marketing HTML (this tree) | `F:/Github/kecktech-dashboard/dashboard/website` | `/opt/docker/dashboard/website` |
| Blog JSON + ME Manager CMS API | `F:/Github/kecktech/Kecktech/website` | `/opt/docker/kecktech-cms` (`:8085`) |

Do **not** edit Home/About/Services/Pricing/Demos/Contact in the Next CMS tree.
Do **not** archive the CMS tree — ME Manager bridges and `/api/blog` still live there.

Contract: [me-manager/docs/SITE_HOOKS.md](../../../me-manager/docs/SITE_HOOKS.md) · [KECKTECH_BLOG_RESTORE.md](../../../me-manager/docs/KECKTECH_BLOG_RESTORE.md)
