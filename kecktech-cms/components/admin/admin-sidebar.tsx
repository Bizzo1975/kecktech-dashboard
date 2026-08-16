"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Server,
  Users,
  Settings,
  LogOut,
  FileText,
  FolderKanban,
  File,
  ImageIcon,
  CalendarClock,
  Home,
  Info,
  Mail,
  Shield,
  Images,
  Newspaper,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { signOut } from "next-auth/react";

type NavItem = {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
};

const dashboardItems: NavItem[] = [
  { title: "Dashboard", href: "/admin", icon: LayoutDashboard },
];

const pageContentItems: NavItem[] = [
  { title: "Home Page", href: "/admin/pages/home", icon: Home },
  { title: "About", href: "/admin/pages/about", icon: Info },
  { title: "Contact", href: "/admin/pages/contact", icon: Mail },
  { title: "All Pages", href: "/admin/pages", icon: File },
  { title: "Posts", href: "/admin/posts", icon: FileText },
  { title: "Projects (Demos)", href: "/admin/projects", icon: FolderKanban },
  { title: "Newsletter", href: "/admin/newsletter", icon: Newspaper },
];

const managementItems: NavItem[] = [
  { title: "Content Scheduler", href: "/admin/content-scheduler", icon: CalendarClock },
  { title: "Media", href: "/admin/media", icon: ImageIcon },
  { title: "Slideshow", href: "/admin/slideshow", icon: Images },
  { title: "Services", href: "/admin/services", icon: Server },
];

const userItems: NavItem[] = [
  { title: "Users", href: "/admin/users", icon: Users },
  { title: "Security & 2FA", href: "/admin/security", icon: Shield },
];

const settingsItems: NavItem[] = [
  { title: "Settings", href: "/admin/settings", icon: Settings },
];

function isNavActive(pathname: string | null, href: string) {
  if (!pathname) return false;
  if (href === "/admin") return pathname === "/admin";
  // Avoid highlighting "All Pages" for /admin/pages/home|about|contact
  if (href === "/admin/pages") {
    return (
      pathname === "/admin/pages" ||
      pathname === "/admin/pages/new" ||
      /^\/admin\/pages\/[^/]+\/edit\/?$/.test(pathname)
    );
  }
  return pathname === href || pathname.startsWith(href + "/");
}

function NavGroup({
  label,
  items,
  pathname,
}: {
  label: string;
  items: NavItem[];
  pathname: string | null;
}) {
  return (
    <div className="space-y-1">
      <p className="px-3 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = isNavActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center space-x-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            <Icon className="h-5 w-5" />
            <span>{item.title}</span>
          </Link>
        );
      })}
    </div>
  );
}

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 border-r bg-card flex flex-col">
      <div className="flex h-16 items-center border-b px-6">
        <h2 className="text-lg font-semibold">Admin Panel</h2>
      </div>
      <div className="mx-3 mt-3 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] leading-snug text-muted-foreground">
        Marketing chrome (nav/demos) = Astro; editable copy/posts/projects = this
        CMS.
      </div>
      <nav className="flex-1 space-y-2 overflow-y-auto p-2 pb-4">
        <NavGroup label="Overview" items={dashboardItems} pathname={pathname} />
        <NavGroup label="Page Content" items={pageContentItems} pathname={pathname} />
        <NavGroup label="Management" items={managementItems} pathname={pathname} />
        <NavGroup label="Users & Security" items={userItems} pathname={pathname} />
        <NavGroup label="Settings" items={settingsItems} pathname={pathname} />
        <div className="px-3 pt-4">
          <Button
            variant="ghost"
            className="w-full justify-start text-muted-foreground hover:text-destructive"
            onClick={() => signOut({ callbackUrl: "/admin/login" })}
          >
            <LogOut className="mr-2 h-5 w-5" />
            Sign Out
          </Button>
        </div>
      </nav>
    </aside>
  );
}
