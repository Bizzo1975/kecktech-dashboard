"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// Dynamically import icons
const iconMap: Record<string, React.ComponentType<React.SVGProps<SVGSVGElement>>> = {};

function getIcon(iconName: string): React.ComponentType<React.SVGProps<SVGSVGElement>> {
  if (iconMap[iconName]) {
    return iconMap[iconName];
  }

  const IconComponent = dynamic(
    () =>
      import("lucide-react").then((mod) => {
        const Icon = (mod as any)[iconName];
        if (Icon) {
          iconMap[iconName] = Icon;
          return { default: Icon };
        }
        return { default: mod.Target };
      }),
    { ssr: false }
  ) as React.ComponentType<React.SVGProps<SVGSVGElement>>;

  iconMap[iconName] = IconComponent;
  return IconComponent;
}

interface FlipValueCardProps {
  iconName: string;
  title: string;
  description: string;
  backgroundImage?: string;
}

export function FlipValueCard({
  iconName,
  title,
  description,
  backgroundImage,
}: FlipValueCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const Icon = getIcon(iconName);

  return (
    <div
      className="relative w-full h-48 cursor-pointer"
      onMouseEnter={() => setIsFlipped(true)}
      onMouseLeave={() => setIsFlipped(false)}
      style={{ 
        perspective: "1000px",
        WebkitPerspective: "1000px"
      }}
    >
      <div
        className="relative w-full h-full"
        style={{
          transformStyle: "preserve-3d",
          WebkitTransformStyle: "preserve-3d",
          transition: "transform 0.6s",
          transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
        }}
      >
        {/* Front Side - Image */}
        <div
          className="absolute inset-0 w-full h-full"
          style={{
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            transform: "rotateY(0deg)",
          }}
        >
          <Card
            className="w-full h-full bg-card/80 backdrop-blur-sm border-0 flex items-center justify-center relative overflow-hidden"
            style={{
              backgroundImage: backgroundImage ? `url(${backgroundImage})` : "none",
              backgroundSize: "cover",
              backgroundPosition: "center",
              backgroundColor: backgroundImage ? "rgba(5,5,10,0.7)" : "transparent",
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5"></div>
            <div className="relative z-10 text-center">
              <h3 className="text-lg font-bold text-white drop-shadow-[0_0_10px_rgba(0,0,0,0.8)]">
                {title}
              </h3>
            </div>
          </Card>
        </div>

        {/* Back Side - Text */}
        <div
          className="absolute inset-0 w-full h-full"
          style={{
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
          }}
        >
          <Card className="w-full h-full bg-card/80 backdrop-blur-sm border-0 flex items-center justify-center">
            <div className="flex flex-col items-center justify-center p-4 text-center">
              <h3 className="mb-2 text-lg font-bold text-white drop-shadow-[0_0_10px_rgba(0,0,0,0.8)]">
                {title}
              </h3>
              <p className="text-sm text-white/95 drop-shadow-[0_0_8px_rgba(0,0,0,0.8)]">
                {description}
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

