import { prisma } from "@/lib/prisma";

const PAGE_DEFAULTS: Record<
  string,
  { title: string; content: string; metaDescription: string }
> = {
  home: {
    title: "Home",
    metaDescription: "Kecktech IT Solutions — home page copy (JSON for Astro)",
    content: JSON.stringify(
      {
        hero: {
          h1: "Reliable IT support for small businesses and seniors.",
          subtitle:
            "Honest pricing. Real accountability. No tech jargon. We handle the technology so you can focus on what you do best.",
          cta: "Chat with Us →",
          ctaSecondary: "See Our Services ↓",
        },
        cta: {
          heading: "Ready for IT That Actually Works for You?",
          body: "No long-term contracts. Transparent pricing. A team that treats every client like a neighbor.",
          button: "Get a Free Assessment →",
        },
      },
      null,
      2
    ),
  },
  about: {
    title: "About",
    metaDescription: "About Kecktech — mission and story (JSON for Astro)",
    content: JSON.stringify(
      {
        hero: {
          h1: "Independent. Human-First. Built for Real People.",
          subtitle:
            "An independent managed service provider built in Park City, Kansas — human-first, privacy-focused, and built to last.",
        },
        mission: {
          label: "Our Mission",
          heading: "Why We Exist",
          body: "To deliver reliable, human-centered IT care to the clients Big Tech ignores.",
          quote: "Local, sovereign, sustainable technology is not just possible — it's better.",
          body2:
            "Kecktech is the IT partner that treats every client like a neighbor.",
        },
      },
      null,
      2
    ),
  },
  contact: {
    title: "Contact",
    metaDescription: "Contact Kecktech (JSON for Astro)",
    content: JSON.stringify(
      {
        hero: {
          h1: "Let's Talk",
          subtitle:
            "Real people. Real answers. No automated runaround. We typically respond within 2 business hours.",
        },
        form: {
          heading: "Send Us a Message",
          intro: "Fill out the form and we'll get back to you within 2 business hours by email.",
          submitButton: "Send Message →",
        },
        info: {
          heading: "Kecktech IT Solutions LLC",
          email: "support@kecktech.net",
          location: "Park City, Kansas",
          hours: "Mon–Fri 8am–6pm CST",
          hoursNote: "Emergency support available for managed clients",
          tagline: "Human-first. Your Data Stays in Kansas. AI-Powered.",
        },
      },
      null,
      2
    ),
  },
};

/** Find or create a marketing Page by slug (home / about / contact). */
export async function ensurePageBySlug(slug: string) {
  const key = slug.toLowerCase();
  const existing = await prisma.page.findUnique({ where: { slug: key } });
  if (existing) return existing;

  const defaults = PAGE_DEFAULTS[key] || {
    title: key.charAt(0).toUpperCase() + key.slice(1),
    content: "{\n  \"hero\": { \"h1\": \"\", \"subtitle\": \"\" }\n}",
    metaDescription: `${key} page`,
  };

  return prisma.page.create({
    data: {
      title: defaults.title,
      slug: key,
      content: defaults.content,
      metaTitle: defaults.title,
      metaDescription: defaults.metaDescription,
      published: true,
    },
  });
}
