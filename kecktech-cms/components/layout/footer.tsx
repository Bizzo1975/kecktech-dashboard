import Link from "next/link";
import { Container } from "@/components/ui/container";
import { Logo } from "@/components/ui/logo";

export function Footer() {
  const currentYear = new Date().getFullYear();

  const footerLinks = {
    services: [
      { href: "/services", label: "All Services" },
      { href: "/services/cybersecurity", label: "Cybersecurity" },
      { href: "/services/cloud", label: "Cloud Services" },
      { href: "/services/network", label: "Network Solutions" },
    ],
    company: [
      { href: "/about", label: "About Us" },
      { href: "/contact", label: "Contact" },
      { href: "/careers", label: "Careers" },
      { href: "/blog", label: "Blog" },
    ],
    legal: [
      { href: "/privacy", label: "Privacy Policy" },
      { href: "/terms", label: "Terms of Service" },
      { href: "/cookies", label: "Cookie Policy" },
    ],
  };

  return (
    <footer className="bg-transparent">
      <Container>
        <div className="py-12 md:py-16">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
            {/* Brand Column */}
            <div className="space-y-4">
              <Link href="/" className="flex items-center group">
                <Logo size="md" showText={true} variant="full" className="group-hover:opacity-90 transition-opacity" />
              </Link>
              <p className="text-sm text-white/95 leading-relaxed drop-shadow-[0_0_8px_rgba(0,0,0,0.8)]">
                Professional IT service and support solutions for modern businesses.
              </p>
            </div>

            {/* Services Column */}
            <div>
              <h3 className="mb-4 text-sm font-semibold text-white drop-shadow-[0_0_8px_rgba(0,0,0,0.8)]">Services</h3>
              <ul className="space-y-3">
                {footerLinks.services.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-white/95 hover:text-white transition-colors drop-shadow-[0_0_8px_rgba(0,0,0,0.8)]"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Company Column */}
            <div>
              <h3 className="mb-4 text-sm font-semibold text-white drop-shadow-[0_0_8px_rgba(0,0,0,0.8)]">Company</h3>
              <ul className="space-y-3">
                {footerLinks.company.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-white/95 hover:text-white transition-colors drop-shadow-[0_0_8px_rgba(0,0,0,0.8)]"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Legal Column */}
            <div>
              <h3 className="mb-4 text-sm font-semibold text-white drop-shadow-[0_0_8px_rgba(0,0,0,0.8)]">Legal</h3>
              <ul className="space-y-3">
                {footerLinks.legal.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-white/95 hover:text-white transition-colors drop-shadow-[0_0_8px_rgba(0,0,0,0.8)]"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="mt-12 border-t border-border/20 pt-8">
            <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
              <p className="text-sm text-white/95 drop-shadow-[0_0_8px_rgba(0,0,0,0.8)]">
                © {currentYear} Kecktech. All rights reserved.
              </p>
              <div className="flex items-center space-x-6">
                <Link
                  href="/privacy"
                  className="text-sm text-foreground/70 hover:text-foreground transition-colors"
                >
                  Privacy
                </Link>
                <Link
                  href="/terms"
                  className="text-sm text-foreground/70 hover:text-foreground transition-colors"
                >
                  Terms
                </Link>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </footer>
  );
}
