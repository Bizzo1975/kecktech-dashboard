"use client";

import { InteractiveServiceCard } from "@/components/interactive-service-card";

const services = [
  {
    icon: "Shield",
    title: "Cybersecurity",
    description: "Protect your business with enterprise-grade security solutions and monitoring.",
  },
  {
    icon: "Cloud",
    title: "Cloud Services",
    description: "Migrate to the cloud with confidence. Scalable infrastructure for your needs.",
  },
  {
    icon: "Network",
    title: "Network Solutions",
    description: "Design, implement, and maintain robust network infrastructure.",
  },
  {
    icon: "Server",
    title: "IT Infrastructure",
    description: "Complete IT infrastructure management and support.",
  },
  {
    icon: "Smartphone",
    title: "Device Management",
    description: "Mobile device management and enterprise mobility.",
  },
  {
    icon: "Zap",
    title: "24/7 Support",
    description: "Round-the-clock technical support when you need it.",
  },
];

export function ServicesOverview() {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 w-full">
      {services.map((service, index) => (
        <InteractiveServiceCard
          key={service.title}
          iconName={service.icon}
          title={service.title}
          description={service.description}
          index={index}
        />
      ))}
    </div>
  );
}
