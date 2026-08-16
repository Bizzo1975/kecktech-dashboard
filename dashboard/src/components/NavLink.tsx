"use client";

import { usePathname } from "next/navigation";

export function NavLink({
  href,
  icon,
  label,
  external,
  style,
}: {
  href: string;
  icon: string;
  label: string;
  external?: boolean;
  style?: React.CSSProperties;
}) {
  const pathname = usePathname();
  const isActive = pathname === href;

  return (
    <a
      href={href}
      className="sidebar-nav-link"
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      style={{
        ...(isActive
          ? {
              background: "#0f172a",
              color: "#f1f5f9",
              borderLeft: "3px solid #3b82f6",
              paddingLeft: "9px",
            }
          : {}),
        ...style,
      }}
    >
      <span style={{ fontSize: "16px" }}>{icon}</span>
      {label}
    </a>
  );
}
