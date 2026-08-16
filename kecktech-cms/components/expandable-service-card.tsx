"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// Dynamically import icons to avoid SSR issues
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
        return { default: mod.Server };
      }),
    { ssr: false }
  ) as React.ComponentType<React.SVGProps<SVGSVGElement>>;

  iconMap[iconName] = IconComponent;
  return IconComponent;
}

interface ExpandableServiceCardProps {
  iconName: string;
  title: string;
  description: string;
  index: number;
  slug: string;
  backgroundImage?: string;
}

export function ExpandableServiceCard({
  iconName,
  title,
  description,
  index,
  slug,
  backgroundImage,
}: ExpandableServiceCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const router = useRouter();
  const Icon = getIcon(iconName);

  const handleClick = () => {
    router.push(`/services-demo/${slug}`);
  };

  return (
    <div
      style={{
        position: "relative",
        width: "72px",
        height: isExpanded || isHovered ? "368px" : "88px",
        zIndex: isExpanded || isHovered ? 200 : 100,
      }}
      onMouseEnter={() => {
        setIsHovered(true);
        setIsExpanded(true);
      }}
      onMouseLeave={() => {
        setIsHovered(false);
        setIsExpanded(false);
      }}
    >
      {/* Title text above icon - only visible when collapsed */}
      {!(isExpanded || isHovered) && (
        <div
          className="absolute top-0 left-0 right-0 text-center z-10"
          style={{
            position: "absolute",
            top: "0px",
            left: "0px",
            width: "72px",
            zIndex: 102,
          }}
        >
          <p className="text-xs font-semibold text-white drop-shadow-[0_0_8px_rgba(0,0,0,0.8)] line-clamp-2 px-1 mb-1">
            {title}
          </p>
        </div>
      )}

      {/* Icon container - the actual icon card that expansion starts from */}
      <div
        style={{
          position: "absolute",
          top: "30px",
          left: "0px",
          width: "72px",
          height: "72px",
          zIndex: 101,
          pointerEvents: "auto",
        }}
      >
        <Card
          className={cn(
            "group relative cursor-pointer",
            "hover:shadow-lg hover:shadow-primary/10",
            "border-0",
            "z-10"
          )}
          style={{
            height: "72px",
            width: "72px",
            backgroundColor: "rgba(15, 23, 42, 0.8)",
            overflow: "visible",
            position: "relative",
          }}
          onClick={handleClick}
        >
          {/* Icon - The actual icon card */}
          <div
            className="absolute left-0 flex items-center justify-center z-10"
            style={{ 
              top: "0px",
              height: "72px",
              width: "72px",
            }}
          >
            <div
              className="flex items-center justify-center rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 shadow-lg"
              style={{ 
                height: "72px",
                width: "72px",
                border: "2px solid rgba(59, 130, 246, 0.3)",
              }}
            >
              <Icon
                className="text-primary"
                style={{ 
                  height: "48px",
                  width: "48px",
                  strokeWidth: 2,
                }}
              />
            </div>
          </div>
        </Card>
      </div>

      {/* Expanded card - appears below icon row at 88px, starts exactly at bottom of icon row */}
      <Card
        className={cn(
          "group relative cursor-pointer",
          "hover:shadow-lg hover:shadow-primary/10",
          "border-0",
          "overflow-hidden"
        )}
        style={{
          height: isExpanded || isHovered ? "280px" : "0px",
          width: isExpanded || isHovered ? "400px" : "72px",
          transition: "height 1000ms ease-in-out, width 1000ms ease-in-out, opacity 1000ms ease-in-out",
          opacity: isExpanded || isHovered ? 1 : 0,
          backgroundColor: backgroundImage ? "transparent" : "rgba(15, 23, 42, 0.8)",
          backgroundImage: (isExpanded || isHovered) && backgroundImage 
            ? `linear-gradient(rgba(5, 5, 10, 0.75), rgba(5, 5, 10, 0.75)), url(${backgroundImage})`
            : "none",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          overflow: "hidden",
          position: "absolute",
          top: "102px",
          left: "0px",
          zIndex: 50,
          marginTop: "0px",
          paddingTop: "0px",
          pointerEvents: isExpanded || isHovered ? "auto" : "none",
          transformOrigin: "top left",
        }}
        onClick={handleClick}
      >
        {/* Icon in expanded card */}
        {(isExpanded || isHovered) && (
          <div
            className="absolute left-0 flex items-center justify-center z-10"
            style={{ 
              top: "0px",
              height: "80px",
              width: "80px",
            }}
          >
            <div
              className="flex items-center justify-center rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 shadow-lg"
              style={{ 
                height: "80px",
                width: "80px",
                border: "none",
              }}
            >
              <Icon
                className="text-primary"
                style={{ 
                  height: "48px",
                  width: "48px",
                  strokeWidth: 2.5,
                }}
              />
            </div>
          </div>
        )}

        {/* Title and Description - Only visible when expanded, positioned below icon */}
        {(isExpanded || isHovered) && (
          <div
            className="flex-1 flex flex-col overflow-hidden relative"
            style={{ 
              paddingTop: "100px",
              paddingLeft: "24px",
              paddingRight: "24px",
              paddingBottom: "24px",
              zIndex: 0,
              animation: "fadeIn 200ms ease-in-out 1000ms both"
            }}
          >
            <h3 className="text-xl font-bold mb-2 text-white drop-shadow-[0_0_10px_rgba(0,0,0,0.8)] group-hover:text-primary transition-colors">
              {title}
            </h3>
            <p className="text-base leading-relaxed text-white/90 drop-shadow-[0_0_8px_rgba(0,0,0,0.8)]">
              {description}
            </p>
            <div className="mt-4 flex items-center text-primary font-semibold group-hover:translate-x-2 transition-transform duration-300">
              <span className="text-sm">Learn more</span>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
