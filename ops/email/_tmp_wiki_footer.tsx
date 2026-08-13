const services = [
  { label: "White Glove Managed IT", href: "https://www.kecktech.net/services#white-glove" },
  { label: "Hardware-as-a-Service", href: "https://www.kecktech.net/services#haas" },
  { label: "AI Custom App Development", href: "https://www.kecktech.net/services#ai-apps" },
  { label: "Senior Technology Concierge", href: "https://www.kecktech.net/services#senior-tech" },
  { label: "Sovereign Private Hosting", href: "https://www.kecktech.net/services#hosting" },
];

const company = [
  { label: "About", href: "https://www.kecktech.net/about" },
  { label: "Pricing", href: "https://www.kecktech.net/pricing" },
  { label: "Contact", href: "https://www.kecktech.net/contact" },
  { label: "Privacy Policy", href: "https://www.kecktech.net/privacy" },
];

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="site-footer" role="contentinfo">
      <div className="footer-grid container">

        <div className="footer-col footer-brand">
          <a href="https://www.kecktech.net" aria-label="Kecktech IT Solutions Home">
            <img
              src="https://www.kecktech.net/brand/transparent-logo-white.png"
              alt="Kecktech IT Solutions"
              className="footer-logo"
            />
          </a>
          <p className="footer-tagline">
            Human-First IT. Your Data Stays in Kansas.<br />
            AI-Powered. Kansas-Built.
          </p>
        </div>

        <div className="footer-col">
          <h4 className="footer-heading">Services</h4>
          <ul className="footer-links">
            {services.map((s) => (
              <li key={s.href}>
                <a href={s.href}>{s.label}</a>
              </li>
            ))}
          </ul>
        </div>

        <div className="footer-col">
          <h4 className="footer-heading">Company</h4>
          <ul className="footer-links">
            {company.map((c) => (
              <li key={c.href}>
                <a href={c.href}>{c.label}</a>
              </li>
            ))}
          </ul>
        </div>

        <div className="footer-col">
          <h4 className="footer-heading">Contact</h4>
          <ul className="footer-contact">
            <li>
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <a href="mailto:support@kecktech.net">support@kecktech.net</a>
            </li>
            <li>
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Park City, Kansas
            </li>
            <li className="footer-hours">Mon–Fri 8am–6pm CST</li>
          </ul>
        </div>

      </div>

      <div className="footer-bar">
        <span>
          &copy; {year} Kecktech IT Solutions LLC &nbsp;&middot;&nbsp; All rights reserved &nbsp;&middot;&nbsp; Human-first IT. Kansas-built.
        </span>
      </div>
    </footer>
  );
}
