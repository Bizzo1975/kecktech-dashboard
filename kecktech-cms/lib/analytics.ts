// Analytics utility functions
// This can be extended with actual analytics implementation

export function trackEvent(eventName: string, properties?: Record<string, any>) {
  if (typeof window !== "undefined") {
    // Google Analytics 4
    if (window.gtag) {
      window.gtag("event", eventName, properties);
    }

    // Plausible Analytics
    if (window.plausible) {
      window.plausible(eventName, { props: properties });
    }

    // Custom analytics
    console.log("Event tracked:", eventName, properties);
  }
}

export function trackPageView(url: string) {
  if (typeof window !== "undefined") {
    if (window.gtag) {
      window.gtag("config", process.env.NEXT_PUBLIC_GA_ID || "", {
        page_path: url,
      });
    }
  }
}

// Extend Window interface
declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
    plausible?: (event: string, options?: { props?: Record<string, any> }) => void;
  }
}

