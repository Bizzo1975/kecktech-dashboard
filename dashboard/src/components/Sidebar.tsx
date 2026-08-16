import { headers } from "next/headers";
import { NavLink } from "@/components/NavLink";

type NavItem = {
  href: string;
  label: string;
  icon: string;
};

function canAccess(groups: string[], ...roles: string[]) {
  if (groups.includes("kecktech_admins")) return true;
  return roles.some((r) => groups.includes(r));
}

export async function Sidebar() {
  const h = await headers();
  const user = h.get("Remote-User") || "";
  const groups = (h.get("Remote-Groups") || "")
    .split(",")
    .map((g) => g.trim())
    .filter(Boolean);

  const nav: NavItem[] = [
    { href: "/", label: "Stack Health", icon: "🖥️" },
  ];

  if (canAccess(groups, "kecktech_support", "kecktech_staff"))
    nav.push({ href: "/support", label: "Support Desk", icon: "🎧" });

  if (canAccess(groups, "kecktech_billing"))
    nav.push({ href: "/billing", label: "Billing", icon: "💰" });

  if (canAccess(groups, "kecktech_billing", "kecktech_sales"))
    nav.push({ href: "/sales", label: "Sales & CRM", icon: "📈" });

  if (canAccess(groups, "kecktech_support")) {
    nav.push({ href: "/ops", label: "Operations", icon: "⚙️" });
    nav.push({ href: "/ops/email-onboard", label: "Email domains", icon: "✉" });
  }

  if (canAccess(groups, "kecktech_support", "kecktech_billing"))
    nav.push({ href: "/reports/sla", label: "SLA Reports", icon: "📋" });

  // If no special groups, show all (dev mode / pre-auth)
  if (groups.length === 0) {
    nav.push(
      { href: "/support", label: "Support Desk", icon: "🎧" },
      { href: "/billing", label: "Billing", icon: "💰" },
      { href: "/sales", label: "Sales & CRM", icon: "📈" },
      { href: "/ops", label: "Operations", icon: "⚙️" },
      { href: "/ops/email-onboard", label: "Email domains", icon: "✉" },
      { href: "/reports/sla", label: "SLA Reports", icon: "📋" }
    );
  }

  return (
    <aside
      style={{
        width: "220px",
        minWidth: "220px",
        background: "#1e293b",
        borderRight: "1px solid #334155",
        display: "flex",
        flexDirection: "column",
        padding: "24px 0",
        height: "100vh",
        position: "sticky",
        top: 0,
        overflowY: "auto",
      }}
    >
      {/* Logo */}
      <div style={{ padding: "0 20px 20px", borderBottom: "1px solid #334155" }}>
        <a href="/" style={{ display: "block" }}>
          <img
            src="/brand/transparent-logo.png"
            alt="Kecktech"
            style={{ height: 36, width: "auto", objectFit: "contain" }}
          />
        </a>
      </div>

      {/* Nav */}
      <nav style={{ padding: "16px 12px", flex: 1 }}>
        {nav.map((item) => (
          <NavLink key={item.href} href={item.href} icon={item.icon} label={item.label} />
        ))}

        {/* Documentation & external links — always visible */}
        <div style={{ marginTop: "12px", paddingTop: "12px", borderTop: "1px solid #334155" }}>
          <NavLink href="https://help.kecktech.net/books/support-processes" icon="📖" label="Support Processes" external style={{ color: "#94a3b8" }} />
          <NavLink href="https://portal.kecktech.net" icon="👤" label="Customer Portal" external style={{ color: "#94a3b8" }} />
        </div>
      </nav>

      {/* User */}
      {user && (
        <div
          style={{
            padding: "16px 20px 0",
            borderTop: "1px solid #334155",
            fontSize: "12px",
            color: "#64748b",
          }}
        >
          <div style={{ color: "#94a3b8", fontWeight: 500, marginBottom: "2px" }}>
            {user}
          </div>
          <div>{groups.slice(0, 2).join(", ")}</div>
        </div>
      )}
    </aside>
  );
}
