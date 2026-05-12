"use client";

import { useEffect, useState } from "react";

type LogoSize = "hero" | "large" | "medium" | "nav" | "sm";

interface LogoProps {
  size?: LogoSize;
  className?: string;
}

const SIZE_MAP: Record<LogoSize, { iconSize: number; textSize: string; gap: string }> = {
  hero: { iconSize: 80, textSize: "text-5xl", gap: "gap-4" },
  large: { iconSize: 56, textSize: "text-3xl", gap: "gap-3" },
  medium: { iconSize: 40, textSize: "text-2xl", gap: "gap-2.5" },
  nav: { iconSize: 32, textSize: "text-xl", gap: "gap-2" },
  sm: { iconSize: 24, textSize: "text-base", gap: "gap-2" },
};

/**
 * CasAlerts Logo component — Walnut Brick brand.
 *
 * Uses a brick icon (geometric SVG, walnut color) paired with the wordmark
 * in Marcellus font. Five size variants: hero, large, medium, nav, sm.
 * The sm variant renders as a flat brick (no border/corner detail) for clarity at small sizes.
 *
 * Detects light theme by watching body.light-theme class (matches existing theme system in app/layout.tsx).
 */
export default function Logo({ size = "medium", className = "" }: LogoProps) {
  const [isLight, setIsLight] = useState(false);

  useEffect(() => {
    const checkTheme = () => {
      setIsLight(document.body.classList.contains("light-theme"));
    };

    checkTheme();

    // Watch for class changes on body
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.body, { attributes: true, attributeFilter: ["class"] });

    return () => observer.disconnect();
  }, []);

  const { iconSize, textSize, gap } = SIZE_MAP[size];

  // Color tokens (CSS variables defined in globals.css Phase 1A)
  const brickFill = isLight ? "var(--walnut-600)" : "var(--walnut-400)";
  const brickStroke = isLight ? "var(--walnut-700)" : "var(--walnut-300)";
  const textColor = isLight ? "var(--walnut-800)" : "var(--cream-100)";

  // For very small sizes, render a flat brick without internal detail
  const isFlat = iconSize < 24;

  return (
    <div className={`inline-flex items-center ${gap} ${className}`}>
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 64 64"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="CasAlerts logo"
        role="img"
      >
        <title>CasAlerts</title>
        {/* Main brick body */}
        <rect
          x="4"
          y="14"
          width="56"
          height="36"
          rx="3"
          fill={brickFill}
          stroke={brickStroke}
          strokeWidth="2"
        />
        {!isFlat && (
          <>
            {/* Brick mortar lines for texture */}
            <line x1="4" y1="32" x2="60" y2="32" stroke={brickStroke} strokeWidth="1" opacity="0.5" />
            <line x1="22" y1="14" x2="22" y2="32" stroke={brickStroke} strokeWidth="1" opacity="0.5" />
            <line x1="42" y1="32" x2="42" y2="50" stroke={brickStroke} strokeWidth="1" opacity="0.5" />
          </>
        )}
      </svg>
      <span
        className={`${textSize} font-marcellus tracking-tight leading-none`}
        style={{ color: textColor }}
      >
        CasAlerts
      </span>
    </div>
  );
}
