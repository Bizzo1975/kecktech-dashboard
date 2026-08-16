"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, Moon, Sun, ArrowLeft } from "lucide-react";
import { navItems } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Logo } from "@/components/ui/logo";
import { cn } from "@/lib/utils";

const sectionIds = {
  "/": "#home",
  "/services": "#services",
  "/about": "#about",
  "/contact": "#contact",
};

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [theme, setTheme] = React.useState<"light" | "dark">("light");
  const pathname = usePathname();
  const isHomePage = pathname === "/";
  const closeTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  React.useEffect(() => {
    // Check for saved theme preference or default to light
    const savedTheme = localStorage.getItem("theme") as "light" | "dark" | null;
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const initialTheme = savedTheme || (prefersDark ? "dark" : "light");
    
    setTheme(initialTheme);
    if (initialTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    
    if (newTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  const scrollToSection = (sectionId: string) => {
    if (isHomePage) {
      const element = document.querySelector(sectionId);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    } else {
      // Navigate to home page with hash
      window.location.href = `/${sectionId}`;
    }
    setMobileMenuOpen(false);
  };

  return (
    <>
      <header className="sticky top-0 z-50 w-full bg-[rgba(5,5,10,0.98)] shadow-sm">
        <Container>
          <div className="flex h-16 items-center justify-between gap-8">
            {/* Logo */}
            <Link href="/" className="flex-shrink-0 group">
              <Logo size="md" showText={true} variant="full" className="group-hover:opacity-90 transition-opacity" />
            </Link>

            {/* Right Side Actions */}
            <div className="flex items-center gap-3 flex-shrink-0">
              {/* Back Button (only on non-home pages) */}
              {!isHomePage && (
                <Button
                  asChild
                  variant="ghost"
                  size="sm"
                  className="whitespace-nowrap text-white drop-shadow-[0_0_10px_rgba(0,0,0,0.8)] hover:text-white/90"
                >
                  <Link href="/">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                  </Link>
                </Button>
              )}
              
              {/* Theme Toggle */}
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                className="h-9 w-9 text-white drop-shadow-[0_0_10px_rgba(0,0,0,0.8)] hover:bg-muted/50 flex-shrink-0"
                aria-label="Toggle theme"
              >
                {theme === "light" ? (
                  <Moon className="h-5 w-5" />
                ) : (
                  <Sun className="h-5 w-5" />
                )}
              </Button>
              
              {/* Hamburger Menu Button */}
              <div 
                className="relative"
                onMouseEnter={() => setMobileMenuOpen(true)}
              >
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 text-white drop-shadow-[0_0_10px_rgba(0,0,0,0.8)] hover:bg-muted/50 flex-shrink-0"
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  aria-label="Toggle menu"
                >
                  {mobileMenuOpen ? (
                    <X className="h-5 w-5" />
                  ) : (
                    <Menu className="h-5 w-5" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </Container>
      </header>

      {/* Floating Hamburger Menu - slides in from right */}
      {mobileMenuOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setMobileMenuOpen(false)}
          />
          {/* Floating Menu Panel - transparent background, only text visible */}
          <div 
            className="menu-panel group fixed z-50 h-full bg-transparent animate-in slide-in-from-right duration-300"
            style={{
              right: "12px", // Align with hamburger button position
              top: "64px", // Align with header height (h-16 = 64px)
              width: "200px", // Narrower width to center under icon
            }}
            onMouseEnter={() => {
              // Clear any pending close timeout
              if (closeTimeoutRef.current) {
                clearTimeout(closeTimeoutRef.current);
                closeTimeoutRef.current = null;
              }
              setMobileMenuOpen(true);
            }}
            onMouseLeave={(e) => {
              // Add a small delay before closing to allow moving to menu items
              const relatedTarget = e.relatedTarget as HTMLElement;
              if (!relatedTarget || (!relatedTarget.closest('.menu-panel') && !relatedTarget.closest('[aria-label="Toggle menu"]'))) {
                closeTimeoutRef.current = setTimeout(() => {
                  setMobileMenuOpen(false);
                }, 300); // 300ms delay to allow mouse movement
              }
            }}
          >
            <div className="flex flex-col h-full">
              {/* Menu Header - hidden on hover */}
              <div 
                className="menu-header flex items-center justify-between p-6 transition-opacity duration-200"
                style={{ display: 'none' }}
              >
                <Logo size="md" showText={true} variant="full" />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setMobileMenuOpen(false)}
                  className="h-9 w-9 text-white drop-shadow-[0_0_10px_rgba(0,0,0,0.8)] hover:bg-white/10"
                  aria-label="Close menu"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
              
              {/* Menu Items - floating text list */}
              <nav className="flex-1 overflow-y-auto px-6 pt-6 pb-6">
                <div className="flex flex-col space-y-4 items-center">
                  {navItems.map((item) => {
                    const sectionId = sectionIds[item.href as keyof typeof sectionIds] || item.href;
                    return (
                      <button
                        key={item.href}
                        onClick={() => scrollToSection(sectionId)}
                        className={cn(
                          "px-4 py-4 text-center text-xl font-bold text-white drop-shadow-[0_0_15px_rgba(0,0,0,0.9)] hover:drop-shadow-[0_0_20px_rgba(0,102,255,0.6)] rounded-lg transition-all duration-200 hover:translate-x-2"
                        )}
                      >
                        {item.title}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => scrollToSection("#contact")}
                    className={cn(
                      "px-4 py-4 text-center text-xl font-bold text-white drop-shadow-[0_0_15px_rgba(0,0,0,0.9)] hover:drop-shadow-[0_0_20px_rgba(0,102,255,0.6)] rounded-lg transition-all duration-200 hover:translate-x-2"
                    )}
                  >
                    Get Started
                  </button>
                </div>
              </nav>
            </div>
          </div>
        </>
      )}
    </>
  );
}
