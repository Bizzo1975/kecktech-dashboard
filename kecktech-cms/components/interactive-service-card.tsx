"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { ArrowRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// Dynamically import icons to avoid SSR issues
const iconMap: Record<string, React.ComponentType<React.SVGProps<SVGSVGElement>>> = {};

function getIcon(iconName: string): React.ComponentType<React.SVGProps<SVGSVGElement>> {
  if (iconMap[iconName]) {
    return iconMap[iconName];
  }

  // Lazy load icon
  const IconComponent = dynamic(
    () =>
      import("lucide-react").then((mod) => {
        const Icon = (mod as any)[iconName];
        if (Icon) {
          iconMap[iconName] = Icon;
          return { default: Icon };
        }
        return { default: mod.Server }; // fallback
      }),
    { ssr: false }
  ) as React.ComponentType<React.SVGProps<SVGSVGElement>>;

  iconMap[iconName] = IconComponent;
  return IconComponent;
}

interface InteractiveServiceCardProps {
  iconName: string;
  title: string;
  description: string;
  index: number;
}

export function InteractiveServiceCard({
  iconName,
  title,
  description,
  index,
}: InteractiveServiceCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const Icon = getIcon(iconName);

  return (
    <Card
      className={cn(
        "group relative overflow-hidden border transition-all duration-300 cursor-pointer",
        "hover:border-primary hover:shadow-lg hover:shadow-primary/10",
        "bg-card hover:bg-card/95",
        "h-full flex flex-col"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <CardHeader className="pb-4">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 group-hover:from-primary/20 group-hover:to-primary/10 group-hover:border-primary/30 transition-all duration-300">
          <Icon className="h-8 w-8 text-primary group-hover:scale-110 transition-transform duration-300" />
        </div>
        <CardTitle className="text-xl font-bold mb-2 text-white drop-shadow-[0_0_10px_rgba(0,0,0,0.8)] group-hover:text-primary transition-colors">
          {title}
        </CardTitle>
        <CardDescription className="text-base leading-relaxed text-white/90 drop-shadow-[0_0_8px_rgba(0,0,0,0.8)]">
          {description}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="pt-0 mt-auto">
        <div className="flex items-center text-primary font-semibold group-hover:translate-x-2 transition-transform duration-300">
          <span className="text-sm">Learn more</span>
          <ArrowRight className="ml-2 h-4 w-4" />
        </div>
      </CardContent>
    </Card>
  );
}
