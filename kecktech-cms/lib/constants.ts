export const siteConfig = {
  name: "Kecktech IT Service & Support",
  description: "Professional IT service and support for your business",
  url: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  ogImage: "/og-image.jpg",
  links: {
    twitter: "",
    github: "",
  },
};

export const navItems = [
  {
    title: "Home",
    href: "/",
  },
  {
    title: "Services",
    href: "/services",
  },
  {
    title: "About",
    href: "/about",
  },
  {
    title: "Contact",
    href: "/contact",
  },
];

