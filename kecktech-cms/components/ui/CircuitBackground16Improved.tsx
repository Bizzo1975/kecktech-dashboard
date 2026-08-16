"use client";

import React, { useEffect, useRef } from "react";

interface LinePath {
  points: { x: number; y: number }[];
  endCircle: { x: number; y: number };
  color?: string; // Optional color for the line
  cornerRadius?: number; // Optional custom corner radius for this line
  skipEndCircle?: boolean; // Skip drawing end circle (for connected lines)
}

interface ElectricityBall {
  lineIndex: number;
  progress: number;
  speed: number;
  direction: 1 | -1;
  color?: string; // Optional color to match the line
}

interface RectangleConfig {
  id: 'main' | 'services' | 'about' | 'why' | 'contact';
  selector: string; // CSS selector to find the element
  scale: number;
  widthMultiplier: number;
  manualOffsetX: number;
  manualOffsetY: number;
  colorMap?: { red?: string; blue?: string; yellow?: string };
  useExtendedRightSide: boolean;
  skipLines?: {
    skipTopBlue?: boolean;
    skipRightBlue?: boolean;
    skipTopRed?: boolean;
    skipBottomBlue?: boolean;
    [key: string]: boolean | undefined;
  };
  customPaths?: {
    [lineKey: string]: (
      startX: number,
      startY: number,
      line: { beforeBend: number; afterBend: number; turnDirection: 'left' | 'right'; color: string },
      scaledBaseLength: number,
      scaledCornerRadius: number,
      targetX: number,
      targetY: number,
      scaledHalfWidth: number,
      scaledHalfHeight: number
    ) => LinePath;
  };
  drawLogo?: boolean; // Whether to draw logo in center (only for main processor)
  textWidth?: number; // Text width for dynamic sizing
  textHeight?: number; // Text height for dynamic sizing
}

interface Connection {
  from: { rectId: string; lineKey: string };
  to: { rectId: string; lineKey: string };
  path: LinePath;
}

const CircuitBackground16Improved: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let lines: LinePath[] = [];
    let balls: ElectricityBall[] = [];
    let animationFrameId: number;
    let width = canvas.offsetWidth || window.innerWidth;
    let height = canvas.offsetHeight || window.innerHeight;
    let centerX = 0;
    let centerY = 0;
    let processorSize = 0; // Base size (height)
    let processorWidth = 0; // Width (2.5x the base size)
    let processorHeight = 0; // Height (same as base size)
    let baseLength = 0; // Base length for circuit lines
    const ballRadius = 5;
    const cornerRadius = 16; // Sharper turns (40% of original 40px)

    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      width = rect.width || canvas.offsetWidth || window.innerWidth;
      // Use viewport height for processor positioning and sizing (original behavior)
      const viewportHeight = window.innerHeight;
      // Use document height for canvas to cover all sections
      const documentHeight = Math.max(
        document.documentElement.scrollHeight,
        document.documentElement.clientHeight,
        document.body.scrollHeight,
        document.body.clientHeight,
        viewportHeight
      );
      height = documentHeight;

      if (width > 0 && height > 0) {
        canvas.width = width;
        canvas.height = height;
        centerX = width / 2;
        // Position processor so top yellow line is as close as possible to "& Support" text without touching
        centerY = viewportHeight / 2 + 20;
        // Use viewport dimensions for processor and line sizing (original size)
        processorSize = Math.min(width, viewportHeight) * 0.13; // Base size for height
        processorWidth = processorSize * 2.5; // Width is 2.5x the base size
        processorHeight = processorSize; // Height is same as base size
        baseLength = Math.min(width, viewportHeight) * 0.12; // Base length for circuit lines
        initCircuit();
      }
    };

    const createCleanBendPath = (
      startX: number,
      startY: number,
      direction: 'up' | 'down' | 'left' | 'right',
      turnDirection: 'left' | 'right',
      straightLength: number,
      turnLength: number,
      cornerRadius: number
    ): LinePath => {
      const points: { x: number; y: number }[] = [];
      let endX: number = startX;
      let endY: number = startY;

      // Start point
      points.push({ x: startX, y: startY });

      // Go straight out from processor
      let straightEndX = startX;
      let straightEndY = startY;

      if (direction === 'up') {
        straightEndY = startY - straightLength;
      } else if (direction === 'down') {
        straightEndY = startY + straightLength;
      } else if (direction === 'left') {
        straightEndX = startX - straightLength;
      } else if (direction === 'right') {
        straightEndX = startX + straightLength;
      }

      points.push({ x: straightEndX, y: straightEndY });

      // Make 90-degree turn
      let turnStartX = straightEndX;
      let turnStartY = straightEndY;
      let cornerX = turnStartX;
      let cornerY = turnStartY;

      if (direction === 'up') {
        cornerY = turnStartY;
        if (turnDirection === 'left') {
          cornerX = turnStartX - cornerRadius;
          endX = cornerX - turnLength;
          endY = cornerY;
        } else {
          cornerX = turnStartX + cornerRadius;
          endX = cornerX + turnLength;
          endY = cornerY;
        }
      } else if (direction === 'down') {
        cornerY = turnStartY;
        if (turnDirection === 'left') {
          cornerX = turnStartX + cornerRadius;
          endX = cornerX + turnLength;
          endY = cornerY;
        } else {
          cornerX = turnStartX - cornerRadius;
          endX = cornerX - turnLength;
          endY = cornerY;
        }
      } else if (direction === 'left') {
        cornerX = turnStartX;
        if (turnDirection === 'left') {
          cornerY = turnStartY + cornerRadius;
          endX = cornerX;
          endY = cornerY + turnLength;
        } else {
          cornerY = turnStartY - cornerRadius;
          endX = cornerX;
          endY = cornerY - turnLength;
        }
      } else if (direction === 'right') {
        cornerX = turnStartX;
        if (turnDirection === 'left') {
          cornerY = turnStartY - cornerRadius;
          endX = cornerX;
          endY = cornerY - turnLength;
        } else {
          cornerY = turnStartY + cornerRadius;
          endX = cornerX;
          endY = cornerY + turnLength;
        }
      }

      points.push({ x: cornerX, y: cornerY });
      points.push({ x: endX, y: endY });

      return {
        points,
        endCircle: { x: endX, y: endY },
      };
    };

    // Custom path builders for special line configurations
    const customPathBuilders = {
      // Yellow line on right-middle of About rectangle: connects to Why Kecktech
      'about-right-middle-yellow': (
        startX: number,
        startY: number,
        line: { beforeBend: number; afterBend: number; turnDirection: 'left' | 'right'; color: string },
        scaledBaseLength: number,
        scaledCornerRadius: number,
        targetX: number,
        targetY: number,
        scaledHalfWidth: number,
        scaledHalfHeight: number
      ): LinePath => {
        // Find "Why Kecktech?" heading
        let whyHeading: Element | null = null;
        const allH2s = document.querySelectorAll('h2');
        for (const h2 of Array.from(allH2s)) {
          if (h2.textContent?.includes('Why') && h2.textContent?.includes('Kecktech')) {
            whyHeading = h2;
            break;
          }
        }

        // Default target if not found
        let endX = startX + scaledBaseLength * 5;
        let endY = startY + scaledBaseLength * 10;

        if (whyHeading) {
          const whyRect = whyHeading.getBoundingClientRect();
          const scrollY = window.scrollY || window.pageYOffset || 0;
          // Target the TOP of the Why Kecktech chip
          // The chip is centered on the text
          const whyX = whyRect.left + whyRect.width / 2;
          const whyY = whyRect.top + whyRect.height / 2 + scrollY;

          // Calculate top edge of Why chip
          // We need the scale of the Why chip to know its height
          // Assuming scale 0.8 like others
          const whyScale = 0.8;
          const whyHeight = processorHeight * whyScale;
          const whyTop = whyY - whyHeight / 2;

          endX = whyX; // Connect to center X
          endY = whyTop; // Connect to top Y
        }

        const points: { x: number; y: number }[] = [];

        // 1. Start point (right side of About rectangle)
        points.push({ x: startX, y: startY });

        // 2. Go straight RIGHT
        const rightEndX = startX + line.beforeBend;
        points.push({ x: rightEndX, y: startY });

        // 3. Turn DOWN
        const corner1X = rightEndX;
        const corner1Y = startY + scaledCornerRadius;
        points.push({ x: corner1X, y: corner1Y });

        // 4. Go DOWN until we are above the Why section
        // We need to go down enough to clear the "Our Values" section
        // But we also need to turn LEFT to reach Why (which is to the right? Wait, About is Left, Why is Right)
        // About (Left) -> Why (Right). So we need to go RIGHT more?
        // Let's check positions: About is Left aligned. Why is Right aligned.
        // So Why.x > About.x.
        // So we go Right, then Down, then... Right?
        // Let's see: startX is on Right of About. endX is Center of Why (which is further Right).
        // So we just need to go Right -> Down -> Right -> Down?
        // Or Right -> Down -> Left?

        // Let's assume Why is to the Right.
        // Path: Right -> Down -> Right -> Down

        // However, we want to avoid text. "Our Values" is below About.
        // We should go Down past Values, then turn Right to Why?
        // Or go Right past Values, then Down?

        // Let's try: Right (long) -> Down -> Left/Right to align -> Down

        // Calculate intermediate Y (between About and Why, avoiding Values)
        // "Our Values" is in between.
        // Let's go DOWN first (from the Right turn), but how far?
        // If we go straight down from `rightEndX`, where are we?
        // `rightEndX` is `startX + beforeBend`. `startX` is About Right Edge.
        // About is Left aligned. `rightEndX` is likely in the middle of the screen or left-center.
        // Why is Right aligned. So `endX` > `rightEndX`.

        // So we need to go RIGHT again.

        // Path:
        // 1. Start (About Right)
        // 2. Right (to `rightEndX`)
        // 3. Turn Down
        // 4. Down to `midY`
        // 5. Turn Right
        // 6. Right to `endX` (Why Center)
        // 7. Turn Down
        // 8. Down to `endY` (Why Top)

        const midY = endY - scaledBaseLength * 2; // Stop above Why

        // Check if we need to go Left or Right to reach endX from corner1X
        const goingRight = endX > corner1X;

        // 4. Down to midY
        const downEndY = midY - scaledCornerRadius;
        points.push({ x: corner1X, y: downEndY });

        // 5. Turn Right (or Left)
        const corner2X = corner1X;
        const corner2Y = midY;
        points.push({ x: corner2X, y: corner2Y });

        // 6. Horizontal to endX
        // We need to turn DOWN at endX, so stop cornerRadius before
        const horizontalEndX = endX + (goingRight ? -scaledCornerRadius : scaledCornerRadius);
        points.push({ x: horizontalEndX, y: corner2Y });

        // 7. Turn Down
        const corner3X = endX;
        const corner3Y = corner2Y + scaledCornerRadius; // Turn is 'below' the horizontal line
        // Wait, if we are going Right, and turn Down:
        // Horizontal -> Corner -> Down
        // Corner is at (endX, midY + radius)? No.
        // If we use arcTo logic:
        // ctx.arcTo(cornerX, cornerY, endX, endY, radius)
        // Here we are building points for `createCleanBendPath` style rendering or custom rendering.
        // The main draw loop uses `arcTo` on the points.
        // So we just need the corner point.

        // Point 6 was the start of the turn.
        // Point 7 is the corner.
        points.push({ x: endX, y: midY }); // Corner point

        // 8. Down to endY
        points.push({ x: endX, y: endY });

        return {
          points,
          endCircle: { x: endX, y: endY },
          color: 'yellow',
          cornerRadius: scaledCornerRadius,
          skipEndCircle: true, // Connects to chip
        };
      },

      // Blue line on left-bottom of Why rectangle: connects to Contact Us
      'why-left-bottom-blue': (
        startX: number,
        startY: number,
        line: { beforeBend: number; afterBend: number; turnDirection: 'left' | 'right'; color: string },
        scaledBaseLength: number,
        scaledCornerRadius: number,
        targetX: number,
        targetY: number,
        scaledHalfWidth: number,
        scaledHalfHeight: number
      ): LinePath => {
        // Find "Contact Us" heading
        let contactHeading: Element | null = null;
        const allH2s = document.querySelectorAll('section#contact h2');
        for (const h2 of Array.from(allH2s)) {
          if (h2.textContent?.includes('Contact') && h2.textContent?.includes('Us')) {
            contactHeading = h2;
            break;
          }
        }

        // Default target
        let endX = startX - scaledBaseLength * 5;
        let endY = startY + scaledBaseLength * 10;

        if (contactHeading) {
          const contactRect = contactHeading.getBoundingClientRect();
          const scrollY = window.scrollY || window.pageYOffset || 0;
          // Target the TOP of the Contact chip
          const contactX = contactRect.left + contactRect.width / 2;
          const contactY = contactRect.top + contactRect.height / 2 + scrollY;

          const contactScale = 0.8;
          const contactHeight = processorHeight * contactScale;
          const contactTop = contactY - contactHeight / 2;

          endX = contactX;
          endY = contactTop;
        }

        const points: { x: number; y: number }[] = [];

        // 1. Start point (Left side of Why rectangle)
        points.push({ x: startX, y: startY });

        // 2. Go straight LEFT
        // Reduce beforeBend to avoid hitting the "Why" cards which are to the left
        // Go left just a bit, then turn down in the gap between Header and Cards
        const safeLeftDistance = scaledBaseLength * 0.5;
        const leftEndX = startX - safeLeftDistance;
        points.push({ x: leftEndX, y: startY });

        // 3. Turn DOWN
        const corner1X = leftEndX;
        const corner1Y = startY + scaledCornerRadius;
        points.push({ x: corner1X, y: corner1Y });

        // 4. Go DOWN to midY
        // Why is Right. Contact is Left.
        // We are at `leftEndX` (Why Left - beforeBend).
        // We need to go Left to reach Contact X.

        const midY = endY - scaledBaseLength * 2;
        const downEndY = midY - scaledCornerRadius;
        points.push({ x: corner1X, y: downEndY });

        // 5. Turn Left (to reach endX)
        // Contact is Left of Why. So endX < corner1X.
        const corner2X = corner1X;
        const corner2Y = midY;
        points.push({ x: corner2X, y: corner2Y });

        // 6. Horizontal to endX
        const horizontalEndX = endX + scaledCornerRadius; // Stop before corner
        points.push({ x: horizontalEndX, y: corner2Y });

        // 7. Turn Down
        points.push({ x: endX, y: midY }); // Corner

        // 8. Down to endY
        points.push({ x: endX, y: endY });

        return {
          points,
          endCircle: { x: endX, y: endY },
          color: 'blue',
          cornerRadius: scaledCornerRadius,
          skipEndCircle: true,
        };
      },

      // Red line on left-bottom of Services rectangle: extends left then down to connect to About rectangle
      'services-left-bottom-red': (
        startX: number,
        startY: number,
        line: { beforeBend: number; afterBend: number; turnDirection: 'left' | 'right'; color: string },
        scaledBaseLength: number,
        scaledCornerRadius: number,
        targetX: number,
        targetY: number,
        scaledHalfWidth: number,
        scaledHalfHeight: number
      ): LinePath => {
        // Find Device Management and 24/7 Support icon positions
        const iconContainer = document.querySelector('section#services div[style*="position"][style*="absolute"][style*="left"]');
        let deviceMgmtX = 0;
        let supportIconX = 0;

        if (iconContainer) {
          const iconCards = iconContainer.querySelectorAll('div[style*="width"][style*="72px"]');
          if (iconCards.length >= 3) {
            const deviceCard = iconCards[1];
            const deviceRect = deviceCard.getBoundingClientRect();
            deviceMgmtX = deviceRect.left + deviceRect.width / 2;
            const supportCard = iconCards[2];
            const supportRect = supportCard.getBoundingClientRect();
            supportIconX = supportRect.left + supportRect.width / 2;
          }
        }

        // Calculate midpoint between the two icons
        let midpointX = 0;
        if (deviceMgmtX > 0 && supportIconX > 0) {
          midpointX = (deviceMgmtX + supportIconX) / 2;
        } else {
          midpointX = startX - scaledBaseLength * 2;
        }

        // Create custom path: goes straight left, turns down at midpoint between icons
        const points: { x: number; y: number }[] = [];
        points.push({ x: startX, y: startY });
        const topRedLineLength = scaledBaseLength * 1.2;
        const straightEndX = startX - (topRedLineLength * 6.2);
        points.push({ x: straightEndX, y: startY });
        const cornerX = straightEndX;
        const cornerY = startY + scaledCornerRadius;
        points.push({ x: cornerX, y: cornerY });

        // Extend down to connect with third rectangle (About Kecktech)
        const aboutHeading = document.querySelector('section#about h2');
        let endY = cornerY + scaledBaseLength * 0.8;
        if (aboutHeading) {
          const aboutRect = aboutHeading.getBoundingClientRect();
          const scrollY = window.scrollY || window.pageYOffset || 0;
          const aboutX = aboutRect.left + aboutRect.width / 2 - 395;
          const aboutY = aboutRect.top + aboutRect.height / 2 + scrollY;
          const aboutScale = 0.8;
          const aboutWidthMultiplier = 2.5;
          const aboutScaledHeight = processorHeight * aboutScale;
          const aboutTopEdge = aboutY - aboutScaledHeight / 2;
          endY = aboutTopEdge;
        } else {
          endY = cornerY + scaledBaseLength * 5;
        }

        points.push({ x: cornerX, y: endY });

        return {
          points,
          endCircle: { x: cornerX, y: endY },
          color: 'red',
          skipEndCircle: true,
        };
      },
    };

    // Function to get rectangle configurations
    const getRectangleConfigs = (): RectangleConfig[] => {
      return [
        {
          id: 'main',
          selector: 'section#home',
          scale: 1.0,
          widthMultiplier: 2.5,
          manualOffsetX: 0,
          manualOffsetY: 0,
          useExtendedRightSide: false,
          drawLogo: true,
        },
        {
          id: 'services',
          selector: 'section#services h2',
          scale: 0.8,
          widthMultiplier: 2.0,
          manualOffsetX: 0,
          manualOffsetY: 0,
          useExtendedRightSide: false,
          skipLines: { skipTopBlue: true },
          customPaths: {
            'left-top-red': customPathBuilders['services-left-bottom-red'], // 'top' position on left side is visually bottom
          },
        },
        {
          id: 'about',
          selector: 'section#about h2',
          scale: 0.8,
          widthMultiplier: 2.5,
          manualOffsetX: 0,
          manualOffsetY: 0,
          useExtendedRightSide: true,
          colorMap: { red: 'blue', blue: 'red' },
          skipLines: { skipTopRed: true },
          customPaths: {
            'right-middle-yellow': customPathBuilders['about-right-middle-yellow'],
          },
        },
        {
          id: 'why',
          selector: 'h2', // Will be filtered to find "Why Kecktech?"
          scale: 0.8,
          widthMultiplier: 2.4,
          manualOffsetX: 0,
          manualOffsetY: 0,
          useExtendedRightSide: false,
          skipLines: { skipTopYellow: true }, // Connects from About
          customPaths: {
            'left-bottom-blue': customPathBuilders['why-left-bottom-blue'],
          },
        },
        {
          id: 'contact',
          selector: 'section#contact h2',
          scale: 0.8,
          widthMultiplier: 1.8,
          manualOffsetX: 0,
          manualOffsetY: 0,
          useExtendedRightSide: false,
          skipLines: { skipTopBlue: true }, // Connects from Why
        },
      ];
    };

    const initCircuit = () => {
      lines = [];
      balls = [];

      const halfWidth = processorWidth / 2;
      const halfHeight = processorHeight / 2;
      const linesPerSide = 3;
      const topBottomSpacing = processorWidth / (linesPerSide + 1); // Spacing for top/bottom sides
      const leftRightSpacing = processorHeight / (linesPerSide + 1); // Spacing for left/right sides

      // Define line parameters using clear naming convention
      // Each line has: beforeBend (length before 90° turn), afterBend (length after turn), turnDirection

      // TOP SIDE: left, center, right (lines go straight up, then turn left or right)
      const topSide = {
        left: { beforeBend: baseLength * 0.7, afterBend: baseLength * 1.0, turnDirection: 'left' as const, color: 'red' },
        center: { beforeBend: baseLength * 1.5, afterBend: baseLength * 1.0, turnDirection: 'right' as const, color: 'yellow' }, // Increased to be longer than blue
        right: { beforeBend: baseLength * 1.3, afterBend: baseLength * 1.0, turnDirection: 'right' as const, color: 'blue' },
      };

      // BOTTOM SIDE: left, center, right (lines go straight down, then turn left or right)
      // Mirrored from top side
      const bottomSide = {
        left: { beforeBend: baseLength * 0.7, afterBend: baseLength * 1.0, turnDirection: 'left' as const, color: 'red' },
        center: { beforeBend: baseLength * 1.5, afterBend: baseLength * 1.0, turnDirection: 'right' as const, color: 'yellow' },
        right: { beforeBend: baseLength * 1.3, afterBend: baseLength * 1.0, turnDirection: 'right' as const, color: 'blue' },
      };

      // LEFT SIDE: top, middle, bottom (lines go straight left, then turn up or down)
      // Note: For left side, 'left' turn = down, 'right' turn = up
      // Top and bottom lines swapped, keeping their designs
      // Blue line afterBend increased to match yellow line height
      const leftSide = {
        top: { beforeBend: baseLength * 1.2, afterBend: baseLength * 1.0, turnDirection: 'left' as const, color: 'red' }, // down (was bottom)
        middle: { beforeBend: baseLength * 1.0, afterBend: baseLength * 1.4, turnDirection: 'right' as const, color: 'blue' }, // up - extended to match yellow height
        bottom: { beforeBend: baseLength * 0.8, afterBend: baseLength * 1.0, turnDirection: 'right' as const, color: 'yellow' }, // up - will be calculated dynamically to reach midpoint
      };

      // RIGHT SIDE: top, middle, bottom (lines go straight right, then turn up or down)
      // Note: 'left' turn = up, 'right' turn = down
      const rightSide = {
        top: { beforeBend: baseLength * 0.8, afterBend: baseLength * 1.0, turnDirection: 'left' as const, color: 'red' }, // up
        middle: { beforeBend: baseLength * 1.2, afterBend: baseLength * 1.0, turnDirection: 'right' as const, color: 'yellow' }, // down
        bottom: { beforeBend: baseLength * 1.0, afterBend: baseLength * 1.0, turnDirection: 'right' as const, color: 'blue' }, // down (changed from up)
      };

      // Create TOP SIDE lines (left, center, right)
      const topOrder = ['left', 'center', 'right'] as const;
      topOrder.forEach((position, i) => {
        const line = topSide[position];
        const startX = centerX - halfWidth + topBottomSpacing * (i + 1);
        const startY = centerY - halfHeight;

        let path;

        // Special case: red line (left) on top needs two bends - first left, then up
        // Should align with left side blue and yellow lines, evenly spaced
        if (position === 'left' && line.color === 'red') {
          const points: { x: number; y: number }[] = [];

          // Start point
          points.push({ x: startX, y: startY });

          // Go straight up from processor (same beforeBend length)
          const straightEndY = startY - line.beforeBend;
          points.push({ x: startX, y: straightEndY });

          // First bend: turn left
          const firstCornerX = startX - cornerRadius;
          const firstCornerY = straightEndY;
          points.push({ x: firstCornerX, y: firstCornerY });

          // Horizontal segment - shortened after first bend
          const horizontalLength = baseLength * 0.6; // Shorter than original afterBend
          const midX = firstCornerX - horizontalLength;
          points.push({ x: midX, y: firstCornerY });

          // Second bend: turn up (to align with left side lines)
          const secondCornerX = midX;
          const secondCornerY = firstCornerY - cornerRadius;
          points.push({ x: secondCornerX, y: secondCornerY });

          // Continue up to end - position to be parallel with left side blue and yellow
          // Target Y position to align with left side lines' horizontal segments
          // Position it between blue (middle) and yellow (bottom) lines
          // Go UP (negative Y direction) from the second corner
          const verticalLength = baseLength * 1.2; // Length to go up after second bend
          const endX = secondCornerX;
          const endY = secondCornerY - verticalLength; // Go up (negative Y)
          points.push({ x: endX, y: endY });

          path = {
            points,
            endCircle: { x: endX, y: endY },
            color: line.color,
          };
        } else {
          // Normal single bend path
          path = createCleanBendPath(
            startX,
            startY,
            'up',
            line.turnDirection,
            line.beforeBend,
            line.afterBend,
            cornerRadius
          );
          path.color = line.color;
        }

        lines.push(path);
      });

      // Create RIGHT SIDE lines (top, middle, bottom)
      const rightOrder = ['top', 'middle', 'bottom'] as const;
      rightOrder.forEach((position, i) => {
        const line = rightSide[position];
        const startX = centerX + halfWidth;
        const startY = centerY - halfHeight + leftRightSpacing * (i + 1);

        // SKIP the BOTTOM line on right side (it's BLUE - will be replaced by connecting line to second rectangle)
        if (position === 'bottom' && line.color === 'blue') {
          return; // Skip this line entirely - DO NOT DRAW IT
        }

        const path = createCleanBendPath(
          startX,
          startY,
          'right',
          line.turnDirection,
          line.beforeBend,
          line.afterBend,
          cornerRadius
        );
        // Add color to the path
        path.color = line.color;
        lines.push(path);
      });

      // Create BOTTOM SIDE lines (left, center, right)
      const bottomOrder = ['left', 'center', 'right'] as const;
      bottomOrder.forEach((position, i) => {
        const line = bottomSide[position];
        const startX = centerX + halfWidth - topBottomSpacing * (i + 1);
        const startY = centerY + halfHeight;

        let path;

        // Red line (left) on bottom - needs two bends: first left, then right (to avoid crossing text)
        if (position === 'left' && line.color === 'red') {
          const points: { x: number; y: number }[] = [];

          // Start point
          points.push({ x: startX, y: startY });

          // Go straight down from processor
          const straightEndY = startY + line.beforeBend;
          points.push({ x: startX, y: straightEndY });

          // First bend: turn left
          const firstCornerX = startX + cornerRadius;
          const firstCornerY = straightEndY;
          points.push({ x: firstCornerX, y: firstCornerY });

          // Horizontal segment after first bend
          const horizontalLength = baseLength * 0.6;
          const midX = firstCornerX + horizontalLength;
          points.push({ x: midX, y: firstCornerY });

          // Second bend: turn right (to avoid crossing text)
          const secondCornerX = midX;
          const secondCornerY = firstCornerY + cornerRadius;
          points.push({ x: secondCornerX, y: secondCornerY });

          // Continue down to end
          const verticalLength = baseLength * 1.0;
          const endX = secondCornerX;
          const endY = secondCornerY + verticalLength;
          points.push({ x: endX, y: endY });

          path = {
            points,
            endCircle: { x: endX, y: endY },
            color: line.color,
          };
        } else if (position === 'right' && line.color === 'blue') {
          // Special case: blue line (right) on bottom needs three bends - first left, then down, then right (to avoid crossing text)
          const points: { x: number; y: number }[] = [];

          // Start point
          points.push({ x: startX, y: startY });

          // Go straight down from processor (same beforeBend length - 1.3x)
          const straightEndY = startY + line.beforeBend;
          points.push({ x: startX, y: straightEndY });

          // First bend: turn left (switched from right)
          const firstCornerX = startX - cornerRadius;
          const firstCornerY = straightEndY;
          points.push({ x: firstCornerX, y: firstCornerY });

          // Horizontal segment - shortened after first bend (shorter than original 1.0x)
          const horizontalLength = baseLength * 0.6; // Shorter than original afterBend
          const midX = firstCornerX - horizontalLength;
          points.push({ x: midX, y: firstCornerY });

          // Second bend: turn down (to avoid crossing right side bottom red line, mirrored from top)
          const secondCornerX = midX;
          const secondCornerY = firstCornerY + cornerRadius;
          points.push({ x: secondCornerX, y: secondCornerY });

          // Continue down (shortened length) before third bend
          const verticalLength = baseLength * 0.5; // Shortened end length
          const thirdBendY = secondCornerY + verticalLength;
          points.push({ x: secondCornerX, y: thirdBendY });

          // Third bend: turn left (opposite direction, to avoid crossing text "businesses")
          // For 'down' direction with 'right' turnDirection (which actually goes left), use: cornerX = turnStartX - cornerRadius
          const thirdCornerX = secondCornerX - cornerRadius;
          const thirdCornerY = thirdBendY;
          points.push({ x: thirdCornerX, y: thirdCornerY });

          // Final horizontal segment (shortened, going left)
          const finalHorizontalLength = baseLength * 0.4;
          const endX = thirdCornerX - finalHorizontalLength;
          const endY = thirdCornerY;
          points.push({ x: endX, y: endY });

          path = {
            points,
            endCircle: { x: endX, y: endY },
            color: line.color,
          };
        } else {
          // Normal single bend path
          path = createCleanBendPath(
            startX,
            startY,
            'down',
            line.turnDirection,
            line.beforeBend,
            line.afterBend,
            cornerRadius
          );
          path.color = line.color;
        }

        lines.push(path);
      });

      // Calculate end positions for blue line and top red line to find midpoint
      // Top left red line end position
      const topRedStartX = centerX - halfWidth + topBottomSpacing * 1;
      const topRedStartY = centerY - halfHeight;
      const topRedStraightEndY = topRedStartY - baseLength * 0.7;
      const topRedFirstCornerX = topRedStartX - cornerRadius;
      const topRedMidX = topRedFirstCornerX - baseLength * 0.6;
      const topRedSecondCornerY = topRedStraightEndY - cornerRadius;
      const topRedEndY = topRedSecondCornerY - baseLength * 1.2;

      // Left side blue line (middle) end position - turns right (up)
      const blueStartX = centerX - halfWidth;
      const blueStartY = centerY + halfHeight - leftRightSpacing * 2;
      const blueStraightEndX = blueStartX - baseLength * 1.0;
      const blueCornerY = blueStartY - cornerRadius; // Right turn (up), corner is above
      const blueEndY = blueCornerY - baseLength * 1.4; // Goes up (negative Y)

      // Calculate midpoint Y between blue line end and top red line end
      const midpointY = (blueEndY + topRedEndY) / 2;

      // Calculate required afterBend for yellow line to reach midpoint
      // Yellow line turns right (up), so after going left, it turns up
      const yellowStartX = centerX - halfWidth;
      const yellowStartY = centerY + halfHeight - leftRightSpacing * 3;
      const yellowStraightEndX = yellowStartX - baseLength * 0.8; // Goes left this distance
      const yellowCornerY = yellowStartY - cornerRadius; // Right turn (up), corner is above start
      // Distance needed to go up from corner to reach midpoint
      const requiredAfterBend = yellowCornerY - midpointY; // Go up (negative Y direction)

      // Update yellow line's afterBend
      leftSide.bottom.afterBend = requiredAfterBend;

      // Create LEFT SIDE lines (top, middle, bottom)
      const leftOrder = ['top', 'middle', 'bottom'] as const;
      leftOrder.forEach((position, i) => {
        const line = leftSide[position];
        const startX = centerX - halfWidth;
        const startY = centerY + halfHeight - leftRightSpacing * (i + 1);

        const path = createCleanBendPath(
          startX,
          startY,
          'left',
          line.turnDirection,
          line.beforeBend,
          line.afterBend,
          cornerRadius
        );
        // Add color to the path
        path.color = line.color;
        lines.push(path);
      });

      // Initialize 5 balls - match blue balls to blue lines
      // Find all blue lines
      const blueLineIndices: number[] = [];
      lines.forEach((line, index) => {
        if (line.color === 'blue') {
          blueLineIndices.push(index);
        }
      });

      // Track which lines are already occupied
      const occupiedLines = new Set<number>();

      // Create balls - assign blue balls to blue lines, others randomly
      // Ensure no two balls are on the same line
      for (let i = 0; i < 5; i++) {
        let lineIndex: number;
        let ballColor: string | undefined;
        let attempts = 0;
        const maxAttempts = 100; // Prevent infinite loop

        do {
          if (i < blueLineIndices.length && blueLineIndices.length > 0) {
            // Assign to blue lines first
            const availableBlueLines = blueLineIndices.filter(idx => !occupiedLines.has(idx));
            if (availableBlueLines.length > 0) {
              lineIndex = availableBlueLines[Math.floor(Math.random() * availableBlueLines.length)];
              ballColor = 'blue';
            } else {
              // No available blue lines, pick any unoccupied line
              const availableLines = lines.map((_, idx) => idx).filter(idx => !occupiedLines.has(idx));
              if (availableLines.length > 0) {
                lineIndex = availableLines[Math.floor(Math.random() * availableLines.length)];
                const line = lines[lineIndex];
                ballColor = line.color;
              } else {
                // All lines occupied, just pick any line
                lineIndex = Math.floor(Math.random() * lines.length);
                const line = lines[lineIndex];
                ballColor = line.color;
              }
            }
          } else {
            // Assign remaining balls randomly to unoccupied lines
            const availableLines = lines.map((_, idx) => idx).filter(idx => !occupiedLines.has(idx));
            if (availableLines.length > 0) {
              lineIndex = availableLines[Math.floor(Math.random() * availableLines.length)];
              const line = lines[lineIndex];
              ballColor = line.color; // Match ball color to line color
            } else {
              // All lines occupied, just pick any line
              lineIndex = Math.floor(Math.random() * lines.length);
              const line = lines[lineIndex];
              ballColor = line.color;
            }
          }
          attempts++;
        } while (occupiedLines.has(lineIndex) && attempts < maxAttempts);

        occupiedLines.add(lineIndex);

        balls.push({
          lineIndex,
          progress: Math.random() * 0.3,
          speed: 0.003 + Math.random() * 0.009,
          direction: Math.random() > 0.5 ? 1 : -1,
          color: ballColor,
        });
      }
    };

    const getPointOnPath = (line: LinePath, progress: number): { x: number; y: number } => {
      const totalLength = line.points.length - 1;
      const segment = Math.floor(progress * totalLength);
      const segmentProgress = (progress * totalLength) % 1;
      const clampedSegment = Math.min(segment, line.points.length - 2);

      const p1 = line.points[clampedSegment];
      const p2 = line.points[clampedSegment + 1];

      return {
        x: p1.x + (p2.x - p1.x) * segmentProgress,
        y: p1.y + (p2.y - p1.y) * segmentProgress,
      };
    };

    // Track which elements have been logged to prevent console spam
    const loggedElements = new Set<string>();

    const drawCircuit = () => {
      if (width <= 0 || height <= 0 || lines.length === 0) {
        animationFrameId = requestAnimationFrame(drawCircuit);
        return;
      }

      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = "rgba(5, 5, 10, 0.98)";
      ctx.fillRect(0, 0, width, height);

      // Draw circuit lines
      ctx.lineWidth = 2;

      lines.forEach((line, lineIndex) => {
        // Use custom color for left side lines (last 3 lines), default color for others
        if (line.color) {
          const colorMap: { [key: string]: string } = {
            'red': 'rgba(255, 100, 100, 0.6)',
            'blue': 'rgba(100, 150, 255, 0.6)',
            'yellow': 'rgba(255, 255, 100, 0.6)',
          };
          ctx.strokeStyle = colorMap[line.color] || "rgba(150, 180, 255, 0.22)";
        } else {
          ctx.strokeStyle = "rgba(150, 180, 255, 0.22)";
        }

        ctx.beginPath();
        ctx.moveTo(line.points[0].x, line.points[0].y);

        for (let i = 1; i < line.points.length; i++) {
          // Check if this is a corner point (has points before and after)
          if (i < line.points.length - 1 && line.points.length > 2) {
            // Draw rounded corner (90° bend)
            const p0 = line.points[i - 1];
            const p1 = line.points[i];
            const p2 = line.points[i + 1];

            const angle1 = Math.atan2(p1.y - p0.y, p1.x - p0.x);
            const angle2 = Math.atan2(p2.y - p1.y, p2.x - p1.x);

            const cornerX = p1.x;
            const cornerY = p1.y;

            // Use line's custom cornerRadius if available, otherwise use global cornerRadius
            const radius = line.cornerRadius ?? cornerRadius;

            ctx.lineTo(cornerX - Math.cos(angle1) * radius, cornerY - Math.sin(angle1) * radius);
            ctx.arcTo(cornerX, cornerY, cornerX + Math.cos(angle2) * radius, cornerY + Math.sin(angle2) * radius, radius);
            i++; // Skip the corner point as it's handled by arcTo
            if (i < line.points.length) {
              ctx.lineTo(line.points[i].x, line.points[i].y);
            }
          } else {
            ctx.lineTo(line.points[i].x, line.points[i].y);
          }
        }
        ctx.stroke();
      });

      // Draw end circles
      ctx.lineWidth = 1.5;
      lines.forEach((line) => {
        // Skip end circle if line is connected
        if (line.skipEndCircle) return;

        // Use custom color for left side lines, default color for others
        if (line.color) {
          const colorMap: { [key: string]: { fill: string; stroke: string } } = {
            'red': { fill: 'rgba(255, 100, 100, 0.5)', stroke: 'rgba(255, 100, 100, 0.7)' },
            'blue': { fill: 'rgba(100, 150, 255, 0.5)', stroke: 'rgba(100, 150, 255, 0.7)' },
            'yellow': { fill: 'rgba(255, 255, 100, 0.5)', stroke: 'rgba(255, 255, 100, 0.7)' },
          };
          const colors = colorMap[line.color];
          ctx.fillStyle = colors.fill;
          ctx.strokeStyle = colors.stroke;
        } else {
          ctx.fillStyle = "rgba(150, 180, 255, 0.35)";
          ctx.strokeStyle = "rgba(150, 180, 255, 0.5)";
        }

        ctx.beginPath();
        ctx.arc(line.endCircle.x, line.endCircle.y, ballRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      });

      // Draw central processor (rectangle: 2.5x wide, same height)
      ctx.fillStyle = "rgba(100, 130, 180, 0.28)";
      ctx.fillRect(centerX - processorWidth / 2, centerY - processorHeight / 2, processorWidth, processorHeight);

      ctx.strokeStyle = "rgba(150, 180, 255, 0.55)";
      ctx.lineWidth = 2.5;
      ctx.strokeRect(centerX - processorWidth / 2, centerY - processorHeight / 2, processorWidth, processorHeight);

      // Draw fine circuit connection lines around the rectangle
      ctx.save();
      ctx.strokeStyle = "rgba(100, 200, 255, 0.4)";
      ctx.lineWidth = 1.5;
      ctx.lineCap = "round";

      const connectionLength = baseLength * 0.15; // Short connection lines
      const spacing = baseLength * 0.2; // Spacing between connections
      const halfW = processorWidth / 2;
      const halfH = processorHeight / 2;

      // Top side connections (pointing up)
      const topConnections = Math.floor(processorWidth / spacing);
      for (let i = 1; i <= topConnections; i++) {
        const x = centerX - halfW + (processorWidth / (topConnections + 1)) * i;
        const y = centerY - halfH;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y - connectionLength);
        ctx.stroke();
      }

      // Bottom side connections (pointing down)
      const bottomConnections = Math.floor(processorWidth / spacing);
      for (let i = 1; i <= bottomConnections; i++) {
        const x = centerX - halfW + (processorWidth / (bottomConnections + 1)) * i;
        const y = centerY + halfH;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y + connectionLength);
        ctx.stroke();
      }

      // Left side connections (pointing left)
      const leftConnections = Math.floor(processorHeight / spacing);
      for (let i = 1; i <= leftConnections; i++) {
        const x = centerX - halfW;
        const y = centerY - halfH + (processorHeight / (leftConnections + 1)) * i;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - connectionLength, y);
        ctx.stroke();
      }

      // Right side connections (pointing right)
      const rightConnections = Math.floor(processorHeight / spacing);
      for (let i = 1; i <= rightConnections; i++) {
        const x = centerX + halfW;
        const y = centerY - halfH + (processorHeight / (rightConnections + 1)) * i;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + connectionLength, y);
        ctx.stroke();
      }

      ctx.restore();

      // Draw logo text in center of processor - all on one line
      ctx.save();
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";

      // Calculate text metrics for proper alignment - smaller font to fit on one line
      const baseFontSize = Math.max(processorHeight * 0.2, 12);
      const smallFontSize = Math.max(processorHeight * 0.14, 7);

      // Create gradient for the "K"
      const kGradient = ctx.createLinearGradient(
        centerX - processorWidth * 0.2, centerY - processorHeight * 0.2,
        centerX + processorWidth * 0.2, centerY + processorHeight * 0.2
      );
      kGradient.addColorStop(0, "rgba(0, 102, 255, 0.95)");
      kGradient.addColorStop(0.5, "rgba(59, 130, 246, 0.95)");
      kGradient.addColorStop(1, "rgba(6, 182, 212, 0.95)");

      // Draw "K" with creative font (Orbitron-style, bold, tech look)
      ctx.fillStyle = kGradient;
      ctx.font = `900 ${baseFontSize * 1.1}px 'Orbitron', 'Rajdhani', 'Exo 2', sans-serif`;
      const kText = "K";
      const kMetrics = ctx.measureText(kText);

      // Draw "ecktech" with regular font
      ctx.fillStyle = "rgba(150, 220, 255, 0.9)";
      ctx.font = `bold ${baseFontSize}px sans-serif`;
      const restText = "ecktech";
      const restMetrics = ctx.measureText(restText);

      // Draw ".net" with smaller font
      ctx.fillStyle = "rgba(100, 200, 255, 0.7)";
      ctx.font = `${smallFontSize}px sans-serif`;
      const dotNetText = ".net";
      const dotNetMetrics = ctx.measureText(dotNetText);

      // Calculate total width and center everything
      const totalWidth = kMetrics.width + restMetrics.width + dotNetMetrics.width + (baseFontSize * 0.15);
      const startX = centerX - totalWidth / 2;

      // Draw all parts on one line, centered
      ctx.fillStyle = kGradient;
      ctx.font = `900 ${baseFontSize * 1.1}px 'Orbitron', 'Rajdhani', 'Exo 2', sans-serif`;
      ctx.fillText(kText, startX, centerY);

      ctx.fillStyle = "rgba(150, 220, 255, 0.9)";
      ctx.font = `bold ${baseFontSize}px sans-serif`;
      ctx.fillText(restText, startX + kMetrics.width + baseFontSize * 0.05, centerY);

      ctx.fillStyle = "rgba(100, 200, 255, 0.7)";
      ctx.font = `${smallFontSize}px sans-serif`;
      ctx.fillText(dotNetText, startX + kMetrics.width + restMetrics.width + baseFontSize * 0.1, centerY);

      ctx.restore();

      // Update and draw electricity balls
      balls.forEach((ball) => {
        const line = lines[ball.lineIndex];
        if (!line) return;

        ball.progress += ball.speed * ball.direction;

        // Reverse direction at ends
        if (ball.progress >= 1) {
          ball.direction = -1;
          ball.progress = 1;
        } else if (ball.progress <= 0) {
          // Ball reached start, start on a different line
          // Get all currently occupied lines
          const occupiedLines = new Set(balls.map(b => b.lineIndex));

          // If ball has a color, try to find a matching line that's not occupied
          let newLineIndex: number;
          if (ball.color) {
            const matchingLines = lines.map((l, idx) => ({ line: l, idx }))
              .filter(({ line, idx }) => line.color === ball.color && !occupiedLines.has(idx));
            if (matchingLines.length > 0) {
              newLineIndex = matchingLines[Math.floor(Math.random() * matchingLines.length)].idx;
            } else {
              // No matching color lines available, find any unoccupied line
              const availableLines = lines.map((_, idx) => idx).filter(idx => !occupiedLines.has(idx));
              if (availableLines.length > 0) {
                newLineIndex = availableLines[Math.floor(Math.random() * availableLines.length)];
              } else {
                // All lines occupied, just pick any line (shouldn't happen with 5 balls and more lines)
                newLineIndex = Math.floor(Math.random() * lines.length);
              }
            }
          } else {
            // Find any unoccupied line
            const availableLines = lines.map((_, idx) => idx).filter(idx => !occupiedLines.has(idx));
            if (availableLines.length > 0) {
              newLineIndex = availableLines[Math.floor(Math.random() * availableLines.length)];
            } else {
              newLineIndex = Math.floor(Math.random() * lines.length);
            }
          }
          ball.lineIndex = newLineIndex;
          ball.progress = 0;
          ball.direction = 1;
          ball.speed = 0.003 + Math.random() * 0.009;
          // Preserve ball color when switching lines
          if (!ball.color) {
            ball.color = lines[newLineIndex].color;
          }
        }

        const position = getPointOnPath(line, ball.progress);

        // Get ball color from ball or line
        const ballColor = ball.color || line.color;

        // Color map for balls matching line colors
        const ballColorMap: { [key: string]: { glow: string[], core: string } } = {
          'blue': {
            glow: ["rgba(100, 200, 255, 1)", "rgba(100, 200, 255, 0.6)", "rgba(150, 220, 255, 0.3)", "rgba(100, 200, 255, 0)"],
            core: "rgba(150, 220, 255, 1)"
          },
          'red': {
            glow: ["rgba(255, 100, 100, 1)", "rgba(255, 100, 100, 0.6)", "rgba(255, 150, 150, 0.3)", "rgba(255, 100, 100, 0)"],
            core: "rgba(255, 150, 150, 1)"
          },
          'yellow': {
            glow: ["rgba(255, 255, 100, 1)", "rgba(255, 255, 100, 0.6)", "rgba(255, 255, 150, 0.3)", "rgba(255, 255, 100, 0)"],
            core: "rgba(255, 255, 150, 1)"
          }
        };

        // Use color from map or default blue
        const colors = ballColorMap[ballColor || ''] || ballColorMap['blue'];

        // Draw electricity ball with glow
        const glowGradient = ctx.createRadialGradient(position.x, position.y, 0, position.x, position.y, ballRadius * 3);
        glowGradient.addColorStop(0, colors.glow[0]);
        glowGradient.addColorStop(0.4, colors.glow[1]);
        glowGradient.addColorStop(0.7, colors.glow[2]);
        glowGradient.addColorStop(1, colors.glow[3]);

        ctx.fillStyle = glowGradient;
        ctx.beginPath();
        ctx.arc(position.x, position.y, ballRadius * 3, 0, Math.PI * 2);
        ctx.fill();

        // Draw core ball
        ctx.fillStyle = colors.core;
        ctx.beginPath();
        ctx.arc(position.x, position.y, ballRadius, 0, Math.PI * 2);
        ctx.fill();
      });

      // Draw connecting blue line between main processor and second rectangle
      // EXACT PATH: Start between bottom 2 short lines → Right → Turn down before yellow → Down to text → Turn right before text → Right → Turn down at second rectangle → Down to connect
      const servicesHeading = document.querySelector('section#services h2');
      if (servicesHeading) {
        const headingRect = servicesHeading.getBoundingClientRect();
        const scrollY = window.scrollY || window.pageYOffset || 0;
        const servicesX = headingRect.left + headingRect.width / 2 + 450; // manualOffsetX from drawCircuitPatternAroundServices
        const servicesY = headingRect.top + headingRect.height / 2 + scrollY;
        const scale = 0.8;
        const scaledProcessorHeight = processorHeight * scale;
        const scaledProcessorWidth = processorWidth * scale;
        const scaledBaseLength = baseLength * scale;
        const scaledTopBottomSpacing = scaledProcessorWidth / 4; // For top/bottom lines
        const scaledLeftRightSpacing = scaledProcessorHeight / 4; // For left/right lines
        const scaledCornerRadius = cornerRadius * scale;

        // Calculate connection line spacing for main processor
        const connectionLength = baseLength * 0.15;
        const spacing = baseLength * 0.2;
        const halfW = processorWidth / 2;
        const halfH = processorHeight / 2;
        const rightConnections = Math.floor(processorHeight / spacing);

        // START: Between bottom 2 short lines on right side of main processor
        // Bottom 2 lines are at positions: (rightConnections-1) and rightConnections
        const bottomLine2Y = centerY - halfH + (processorHeight / (rightConnections + 1)) * (rightConnections - 1);
        const bottomLine1Y = centerY - halfH + (processorHeight / (rightConnections + 1)) * rightConnections;
        const startY = (bottomLine2Y + bottomLine1Y) / 2; // Between the two bottom lines
        const startX = centerX + halfW; // Right edge of main processor

        // Yellow line position on right side (middle line, goes down then right)
        const yellowLineStartY = centerY - halfH + (processorHeight / (rightConnections + 1)) * 2; // Middle position
        const yellowLineStartX = centerX + halfW;
        const yellowLineBeforeBend = baseLength * 1.2; // beforeBend for yellow line
        const yellowLineStraightEndY = yellowLineStartY + yellowLineBeforeBend; // Goes down
        const yellowLineCornerX = yellowLineStartX + cornerRadius; // Turns right after going down
        const yellowLineCornerY = yellowLineStraightEndY;
        const yellowLineAfterBend = baseLength * 1.0; // afterBend for yellow line
        const yellowLineEndX = yellowLineCornerX + yellowLineAfterBend; // Where yellow line ends horizontally

        // "Our Services" text position
        const textTopY = headingRect.top + scrollY;
        const textBottomY = headingRect.bottom + scrollY;

        // Find "technology" text position (in "Empowering businesses with cutting-edge technology solutions...")
        const technologyText = document.querySelector('section#home p.max-w-3xl');
        let technologyTextTopY = textTopY; // Default to services text if not found
        if (technologyText) {
          const techRect = technologyText.getBoundingClientRect();
          technologyTextTopY = techRect.top + scrollY;
        }

        // Second rectangle top side - calculate connection point (top right area)
        const scaledConnectionLength = scaledBaseLength * 0.15;
        const scaledSpacing = scaledBaseLength * 0.2;
        const secondRectTopConnections = Math.floor(scaledProcessorWidth / scaledSpacing);
        // Calculate X positions relative to left edge of second rectangle
        const secondRectLeftEdge = servicesX - scaledProcessorWidth / 2;
        // Calculate spacing between connection lines
        const lineSpacing = scaledProcessorWidth / (secondRectTopConnections + 1);
        // Connect at the rightmost connection line on the top, then move 4.5 lines further right
        const rightmostLineX = secondRectLeftEdge + lineSpacing * secondRectTopConnections; // Rightmost line on top
        const secondRectConnectX = rightmostLineX + (lineSpacing * 4.5); // Move 4.5 lines further right
        const secondRectConnectY = servicesY - scaledProcessorHeight / 2; // Top edge of second rectangle (where connection lines start)

        // Draw connecting blue line with EXACT path
        ctx.save();
        ctx.strokeStyle = "rgba(100, 200, 255, 0.5)";
        ctx.lineWidth = 2.5;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.beginPath();

        // 1. Start between bottom 2 short lines on right side of main processor
        ctx.moveTo(startX, startY);

        // 2. Continue RIGHT until BEFORE yellow line turns right
        // Yellow line goes DOWN first, then turns RIGHT at yellowLineCornerX
        // Blue line must turn DOWN at an X position BEFORE yellowLineCornerX
        const marginBeforeYellow = cornerRadius * 2; // Margin to ensure we turn before yellow line
        const turnDownX = yellowLineCornerX - marginBeforeYellow; // Turn down BEFORE yellow line turns right

        // Ensure we go RIGHT (turnDownX must be > startX)
        const finalTurnDownX = turnDownX > startX ? turnDownX : startX + baseLength * 0.5;

        // 3. Go RIGHT to point where arc starts (cornerRadius before the corner)
        ctx.lineTo(finalTurnDownX - cornerRadius, startY);

        // 4. Turn DOWN (before yellow line's horizontal segment, using same radius as all other bends)
        // arcTo(cornerX, cornerY, endX, endY, radius) - draws arc from current point through corner to end point
        const cornerX1 = finalTurnDownX;
        const cornerY1 = startY;
        // Go down almost to the "technology" text
        const almostAtTextY = technologyTextTopY - 5; // Almost touch the text (5px margin)
        ctx.arcTo(cornerX1, cornerY1, cornerX1, almostAtTextY, cornerRadius);

        // 5. Continue DOWN almost to the text
        ctx.lineTo(finalTurnDownX, almostAtTextY - cornerRadius);

        // 6. Turn RIGHT 90 degrees (toward right side of screen, using same radius as other bends)
        const cornerX2 = finalTurnDownX;
        const cornerY2 = almostAtTextY;
        // After the bend, go completely horizontal
        const horizontalY = almostAtTextY; // Keep same Y level after right turn
        const endXAfterBend2 = finalTurnDownX + baseLength * 2; // Go right a good distance
        ctx.arcTo(cornerX2, cornerY2, endXAfterBend2, horizontalY, cornerRadius);

        // 7. Continue RIGHT completely horizontal until aligned with connection point on second rectangle
        // The connection point is at the space between far right 2 lines on second rectangle TOP
        const alignedX = secondRectConnectX;
        ctx.lineTo(alignedX - cornerRadius, horizontalY);

        // 8. Turn DOWN (toward second chip, will connect to top, using same radius)
        const cornerX3 = alignedX;
        const cornerY3 = horizontalY;
        const endYAfterBend3 = secondRectConnectY;
        ctx.arcTo(cornerX3, cornerY3, cornerX3, endYAfterBend3, cornerRadius);

        // 9. Go DOWN to connect to second rectangle at the TOP edge (at the space between far right 2 small lines)
        ctx.lineTo(alignedX, secondRectConnectY);

        ctx.stroke();
        ctx.restore();
      }

      // Draw all additional rectangles using configuration system
      const configs = getRectangleConfigs();
      configs.forEach(config => {
        // Skip main processor (handled separately with logo)
        if (config.id === 'main') return;

        // Handle special selector for "Why Kecktech?"
        let element: Element | null = null;
        if (config.id === 'why') {
          const allH2s = document.querySelectorAll('h2');
          for (const h2 of Array.from(allH2s)) {
            const text = h2.textContent || '';
            if (text.includes('Why') && text.includes('Kecktech')) {
              element = h2;
              break;
            }
          }
        } else {
          element = document.querySelector(config.selector);
        }

        if (!element) {
          console.warn(`[${config.id}] Element not found with selector: ${config.selector}`);
          return;
        }

        // Verify we found the correct element by checking its text content
        const elementText = element.textContent?.trim() || '';
        if (config.id === 'contact' && !elementText.includes('Contact')) {
          // Try to find the correct h2 element
          const allH2s = document.querySelectorAll('section#contact h2');
          for (const h2 of Array.from(allH2s)) {
            const text = h2.textContent?.trim() || '';
            if (text.includes('Contact') && text.includes('Us')) {
              element = h2;
              break;
            }
          }
        }

        const headingRect = element.getBoundingClientRect();
        if (headingRect.width === 0 || headingRect.height === 0) {
          console.warn(`[${config.id}] Element found but has zero dimensions:`, headingRect);
          return;
        }

        // Get canvas position to convert viewport coordinates to canvas coordinates
        const canvasRect = canvas.getBoundingClientRect();
        // Get scroll position - CRITICAL: must get accurate scroll position
        const scrollY = window.scrollY ?? window.pageYOffset ?? document.documentElement.scrollTop ?? document.body.scrollTop ?? 0;

        // Convert viewport coordinates to document/canvas coordinates
        // getBoundingClientRect() returns coordinates relative to the VIEWPORT
        // Canvas covers the full DOCUMENT, so we need to convert viewport coords to document coords
        // Formula: document Y = viewport Y + scrollY
        //          document X = viewport X (canvas starts at viewport 0,0)

        // Calculate text bounds in document/canvas coordinates
        // getBoundingClientRect() returns viewport coordinates
        // Canvas is absolute inset-0, covering the full document
        // Canvas internal coordinates match document coordinates
        // To convert viewport to document: viewport Y + scrollY = document Y
        // For X: viewport X = document X (canvas starts at viewport 0,0)
        const textLeftDoc = headingRect.left; // X is same in viewport and document
        const textTopDoc = headingRect.top + scrollY; // Y needs scroll offset to convert to document
        const textRightDoc = textLeftDoc + headingRect.width;
        const textBottomDoc = textTopDoc + headingRect.height;

        // Calculate text CENTER in document/canvas coordinates
        // This MUST be where the rectangle center is drawn
        const textCenterX = textLeftDoc + headingRect.width / 2;
        const textCenterY = textTopDoc + headingRect.height / 2;

        // Rectangle center = text center (exact match, no offsets)
        let baseX = textCenterX;
        let baseY = textCenterY;

        // DEBUG: Logging disabled to prevent console crashes
        // Uncomment below to enable one-time logging per element
        // const logKey = `${config.id}-initial`;
        // if (!loggedElements.has(logKey)) {
        //   loggedElements.add(logKey);
        //   console.log(`[${config.id}] POSITION:`, 
        //     `Text="${element.textContent?.substring(0, 30)}"`,
        //     `Viewport=(${headingRect.left.toFixed(0)},${headingRect.top.toFixed(0)})`,
        //     `ScrollY=${scrollY.toFixed(0)}`,
        //     `Doc=(${textLeftDoc.toFixed(0)},${textTopDoc.toFixed(0)})`,
        //     `TextCenter=(${textCenterX.toFixed(0)},${textCenterY.toFixed(0)})`,
        //     `RectCenter=(${baseX.toFixed(0)},${baseY.toFixed(0)})`,
        //     `Canvas=${canvas.width}x${canvas.height}`
        //   );
        // }

        // DEBUG: All logging disabled to prevent console crashes
        // Re-enable below if needed for debugging
        // if (Math.random() < 0.01) {
        //   console.log(`[${config.id}] Coordinate conversion:`, {
        //     viewport: { left: headingRect.left, top: headingRect.top },
        //     scrollY: scrollY,
        //     document: { left: textLeftDoc, top: textTopDoc },
        //     textCenter: { x: textCenterX, y: textCenterY },
        //     textSize: { width: headingRect.width, height: headingRect.height }
        //   });
        // }

        // REMOVED: Special positioning offsets for "Why Kecktech?" and "Contact Us"
        // These were causing rectangles to be offset from text center
        // We want rectangles centered exactly on text with 10px padding
        // getBoundingClientRect() already gives us the correct text position

        // Store text dimensions in config for dynamic sizing
        const configWithText = {
          ...config,
          textWidth: headingRect.width,
          textHeight: headingRect.height,
        };

        // Position rectangle centered on text
        // baseX and baseY are the text center coordinates
        // Rectangle center MUST match text center exactly
        const rectX = baseX;
        const rectY = baseY;

        // ONE-TIME LOG: Show what coordinates we're using to draw
        const drawLogKey = `draw-${config.id}`;
        if (!loggedElements.has(drawLogKey)) {
          loggedElements.add(drawLogKey);
          console.log(`[${config.id}] DRAWING at coordinates:`, {
            textCenter: { x: textCenterX.toFixed(1), y: textCenterY.toFixed(1) },
            rectCenter: { x: rectX.toFixed(1), y: rectY.toFixed(1) },
            canvasSize: { width: canvas.width, height: canvas.height },
            canvasRect: { left: canvasRect.left, top: canvasRect.top },
            scrollY: scrollY.toFixed(1)
          });
        }

        // CRITICAL VERIFICATION: Ensure rectX and rectY match textCenterX and textCenterY
        // If they don't match, something is wrong with the calculation
        if (Math.abs(rectX - textCenterX) > 0.1 || Math.abs(rectY - textCenterY) > 0.1) {
          console.error(`[${config.id}] MISMATCH: Rectangle center doesn't match text center!`, {
            textCenter: { x: textCenterX, y: textCenterY },
            rectCenter: { x: rectX, y: rectY },
            difference: { x: Math.abs(rectX - textCenterX), y: Math.abs(rectY - textCenterY) }
          });
        }

        // DEBUG: Logging disabled to prevent console crashes
        // Verify the calculation is correct
        // if (Math.random() < 0.01) {
        //   console.log(`[${config.id}] Final positioning:`, {
        //     textElement: element.textContent?.substring(0, 30),
        //     textBounds: {
        //       viewportLeft: headingRect.left.toFixed(1),
        //       viewportTop: headingRect.top.toFixed(1),
        //       viewportWidth: headingRect.width.toFixed(1),
        //       viewportHeight: headingRect.height.toFixed(1)
        //     },
        //     canvasCoords: {
        //       textLeft: textLeftDoc.toFixed(1),
        //       textTop: textTopDoc.toFixed(1),
        //       textCenterX: textCenterX.toFixed(1),
        //       textCenterY: textCenterY.toFixed(1)
        //     },
        //     rectCenter: {
        //       x: rectX.toFixed(1),
        //       y: rectY.toFixed(1)
        //     },
        //     scrollY: scrollY.toFixed(1),
        //     canvasRect: {
        //       left: canvasRect.left.toFixed(1),
        //       top: canvasRect.top.toFixed(1)
        //     }
        //   });
        // }

        // Validate coordinates are reasonable (within canvas bounds)
        if (isNaN(rectX) || isNaN(rectY) || rectX < -10000 || rectX > 20000 || rectY < -10000 || rectY > 50000) {
          console.error(`[${config.id}] Invalid rectangle coordinates: x=${rectX}, y=${rectY}`, {
            textLeft: textLeftDoc,
            textTop: textTopDoc,
            textCenter: { x: textCenterX, y: textCenterY },
            rectCenter: { x: rectX, y: rectY },
            scrollY: scrollY,
            canvasRect: { left: canvasRect.left, top: canvasRect.top }
          });
          return;
        }

        // Calculate expected rectangle bounds for verification
        const expectedRectWidth = headingRect.width + 20;
        const expectedRectHeight = headingRect.height + 20;
        const expectedRectLeft = rectX - expectedRectWidth / 2;
        const expectedRectRight = rectX + expectedRectWidth / 2;
        const expectedRectTop = rectY - expectedRectHeight / 2;
        const expectedRectBottom = rectY + expectedRectHeight / 2;

        // Text bounds in canvas coordinates (already calculated above)
        // Use textLeftDoc, textTopDoc, textRightDoc, textBottomDoc

        // DEBUG: Logging disabled to prevent console crashes
        // Debug log with detailed info
        // console.log(`[${config.id}] Text found:`, {
        //   text: element.textContent?.substring(0, 50),
        //   viewportTextBounds: {
        //     left: headingRect.left.toFixed(1),
        //     top: headingRect.top.toFixed(1),
        //     right: (headingRect.left + headingRect.width).toFixed(1),
        //     bottom: (headingRect.top + headingRect.height).toFixed(1),
        //     width: headingRect.width.toFixed(1),
        //     height: headingRect.height.toFixed(1)
        //   },
        //   canvasTextBounds: {
        //     left: textLeftDoc.toFixed(1),
        //     top: textTopDoc.toFixed(1),
        //     right: textRightDoc.toFixed(1),
        //     bottom: textBottomDoc.toFixed(1)
        //   },
        //   textCenter: { x: baseX.toFixed(1), y: baseY.toFixed(1) },
        //   rectCenter: { x: rectX.toFixed(1), y: rectY.toFixed(1) },
        //   expectedRectBounds: {
        //     left: expectedRectLeft.toFixed(1),
        //     top: expectedRectTop.toFixed(1),
        //     right: expectedRectRight.toFixed(1),
        //     bottom: expectedRectBottom.toFixed(1),
        //     width: expectedRectWidth.toFixed(1),
        //     height: expectedRectHeight.toFixed(1)
        //   },
        //   padding: '10px on all sides',
        //   verification: {
        //     textLeftShouldBe: (expectedRectLeft + 10).toFixed(1),
        //     textRightShouldBe: (expectedRectRight - 10).toFixed(1),
        //     textTopShouldBe: (expectedRectTop + 10).toFixed(1),
        //     textBottomShouldBe: (expectedRectBottom - 10).toFixed(1)
        //   }
        // });

        // Draw the rectangle centered on text
        drawCircuitPatternAt(ctx, rectX, rectY, configWithText);
      });

      animationFrameId = requestAnimationFrame(drawCircuit);
    };

    // Function to create exact copy of circuit pattern at a different position (without logo)
    const createCircuitPatternAt = (
      targetX: number,
      targetY: number,
      config: RectangleConfig
    ): LinePath[] => {
      const scale = config.scale;
      const widthMultiplier = config.widthMultiplier;
      const useExtendedRightSide = config.useExtendedRightSide;
      const skipLines = config.skipLines;

      // Calculate rectangle size - if text dimensions are provided, size to fit text with padding
      let scaledProcessorWidth: number;
      let scaledProcessorHeight: number;

      if (config.textWidth && config.textHeight && config.id !== 'main') {
        // Size rectangle to fit text with 10px padding on each side
        const padding = 10; // 10px fixed padding
        // Use text-based size directly (text width/height + 10px padding on each side)
        scaledProcessorWidth = config.textWidth + (padding * 2); // 10px left + 10px right
        scaledProcessorHeight = config.textHeight + (padding * 2); // 10px top + 10px bottom
        // ONE-TIME LOG: Verify sizing calculation
        const sizeLogKey = `size-${config.id}`;
        if (!loggedElements.has(sizeLogKey)) {
          loggedElements.add(sizeLogKey);
          console.log(`[${config.id}] Rectangle sizing:`, {
            textWidth: config.textWidth.toFixed(1),
            textHeight: config.textHeight.toFixed(1),
            padding: padding,
            rectWidth: scaledProcessorWidth.toFixed(1),
            rectHeight: scaledProcessorHeight.toFixed(1),
            expectedWidth: (config.textWidth + 20).toFixed(1),
            expectedHeight: (config.textHeight + 20).toFixed(1)
          });
        }
      } else {
        // Main processor or no text dimensions - use original sizing
        scaledProcessorWidth = processorWidth * scale * widthMultiplier;
        scaledProcessorHeight = processorHeight * scale;
        if (config.id !== 'main') {
          // console.log(`[${config.id}] Using original sizing (no text dimensions): textWidth=${config.textWidth}, textHeight=${config.textHeight}`);
        }
      }
      const scaledBaseLength = baseLength * scale;
      const scaledCornerRadius = cornerRadius * scale;
      const scaledHalfWidth = scaledProcessorWidth / 2;
      const scaledHalfHeight = scaledProcessorHeight / 2;
      const scaledTopBottomSpacing = scaledProcessorWidth / 4; // linesPerSide + 1 = 4
      const scaledLeftRightSpacing = scaledProcessorHeight / 4;

      const patternLines: LinePath[] = [];

      // Define line parameters exactly as in main circuit
      const topSide = {
        left: { beforeBend: scaledBaseLength * 0.7, afterBend: scaledBaseLength * 1.0, turnDirection: 'left' as const, color: 'red' },
        center: { beforeBend: scaledBaseLength * 1.5, afterBend: scaledBaseLength * 1.0, turnDirection: 'right' as const, color: 'yellow' },
        right: { beforeBend: scaledBaseLength * 1.3, afterBend: scaledBaseLength * 1.0, turnDirection: 'right' as const, color: 'blue' },
      };

      const bottomSide = {
        left: { beforeBend: scaledBaseLength * 0.7, afterBend: scaledBaseLength * 1.0, turnDirection: 'left' as const, color: 'red' },
        center: { beforeBend: scaledBaseLength * 1.5, afterBend: scaledBaseLength * 1.0, turnDirection: 'right' as const, color: 'yellow' },
        right: { beforeBend: scaledBaseLength * 1.3, afterBend: scaledBaseLength * 1.0, turnDirection: 'right' as const, color: 'blue' },
      };

      const leftSide = {
        top: { beforeBend: scaledBaseLength * 1.2, afterBend: scaledBaseLength * 1.0, turnDirection: 'left' as const, color: 'red' },
        middle: { beforeBend: scaledBaseLength * 1.0, afterBend: scaledBaseLength * 1.4, turnDirection: 'right' as const, color: 'blue' },
        bottom: { beforeBend: scaledBaseLength * 0.8, afterBend: scaledBaseLength * 1.0, turnDirection: 'right' as const, color: 'yellow' },
      };

      const rightSide = {
        top: { beforeBend: scaledBaseLength * 0.8, afterBend: scaledBaseLength * 1.0, turnDirection: 'left' as const, color: 'red' },
        middle: { beforeBend: useExtendedRightSide ? scaledBaseLength * 2.5 : scaledBaseLength * 1.2, afterBend: scaledBaseLength * 1.0, turnDirection: 'right' as const, color: 'yellow' }, // Extended for About Kecktech only
        bottom: { beforeBend: useExtendedRightSide ? scaledBaseLength * 2.1 : scaledBaseLength * 1.0, afterBend: scaledBaseLength * 1.0, turnDirection: 'right' as const, color: 'blue' }, // Extended for About Kecktech only
      };

      // Create TOP SIDE lines with exact same logic as main circuit
      const topOrder = ['left', 'center', 'right'] as const;
      topOrder.forEach((position, i) => {
        const line = topSide[position];
        const startX = targetX - scaledHalfWidth + scaledTopBottomSpacing * (i + 1);
        const startY = targetY - scaledHalfHeight;

        // Skip blue line on top if skipTopBlue is true
        if (position === 'right' && line.color === 'blue' && skipLines?.skipTopBlue) {
          return; // Skip this line
        }

        let path: LinePath;

        // Special case: red line (left) on top needs three bends - first left, then up, then left (to avoid touching "running" text)
        if (position === 'left' && line.color === 'red') {
          const points: { x: number; y: number }[] = [];
          points.push({ x: startX, y: startY });
          const straightEndY = startY - line.beforeBend;
          points.push({ x: startX, y: straightEndY });
          const firstCornerX = startX - scaledCornerRadius;
          const firstCornerY = straightEndY;
          points.push({ x: firstCornerX, y: firstCornerY });
          const horizontalLength = scaledBaseLength * 0.6;
          const midX = firstCornerX - horizontalLength;
          points.push({ x: midX, y: firstCornerY });
          const secondCornerX = midX;
          const secondCornerY = firstCornerY - scaledCornerRadius;
          points.push({ x: secondCornerX, y: secondCornerY });

          // Continue up (shortened length) before third bend
          const verticalLength = scaledBaseLength * 0.5; // Shortened end length
          const thirdBendY = secondCornerY - verticalLength;
          points.push({ x: secondCornerX, y: thirdBendY });

          // Third bend: turn left (to avoid touching "running" text)
          const thirdCornerX = secondCornerX - scaledCornerRadius;
          const thirdCornerY = thirdBendY;
          points.push({ x: thirdCornerX, y: thirdCornerY });

          // Final horizontal segment (shortened, going left)
          const finalHorizontalLength = scaledBaseLength * 0.4;
          const endX = thirdCornerX - finalHorizontalLength;
          const endY = thirdCornerY;
          points.push({ x: endX, y: endY });

          path = {
            points,
            endCircle: { x: endX, y: endY },
            color: line.color,
          };
        } else if (position === 'right' && line.color === 'blue') {
          // Skip this line if skipTopBlue is true (for second rectangle)
          if (skipLines?.skipTopBlue) {
            return; // Skip this line entirely
          }
          // Normal blue line on top
          path = createCleanBendPath(startX, startY, 'up', line.turnDirection, line.beforeBend, line.afterBend, scaledCornerRadius);
          path.color = line.color;
        } else {
          path = createCleanBendPath(startX, startY, 'up', line.turnDirection, line.beforeBend, line.afterBend, scaledCornerRadius);
          path.color = line.color;
        }

        patternLines.push(path);
      });

      // Create RIGHT SIDE lines
      const rightOrder = ['top', 'middle', 'bottom'] as const;
      rightOrder.forEach((position, i) => {
        const line = rightSide[position];
        const startX = targetX + scaledHalfWidth;
        const startY = targetY - scaledHalfHeight + scaledLeftRightSpacing * (i + 1);

        // Skip blue line on right if skipRightBlue is true
        if (position === 'top' && line.color === 'blue' && skipLines?.skipRightBlue) {
          return; // Skip this line
        }

        let path: LinePath;

        // Check for custom path
        const lineKey = `right-${position}-${line.color}`;
        if (config.customPaths && config.customPaths[lineKey]) {
          // Custom path found - use it
          path = config.customPaths[lineKey](
            startX,
            startY,
            line,
            scaledBaseLength,
            scaledCornerRadius,
            targetX,
            targetY,
            scaledHalfWidth,
            scaledHalfHeight
          );
        } else {
          // Normal path for all other cases
          path = createCleanBendPath(startX, startY, 'right', line.turnDirection, line.beforeBend, line.afterBend, scaledCornerRadius);
          path.color = line.color;
        }

        patternLines.push(path);
      });

      // Create BOTTOM SIDE lines with exact same logic
      const bottomOrder = ['left', 'center', 'right'] as const;
      bottomOrder.forEach((position, i) => {
        const line = bottomSide[position];
        const startX = targetX + scaledHalfWidth - scaledTopBottomSpacing * (i + 1);
        const startY = targetY + scaledHalfHeight;

        let path: LinePath;

        // Special case: red line (left) on bottom needs three bends - first left, then down, then right (to avoid touching text)
        if (position === 'left' && line.color === 'red') {
          const points: { x: number; y: number }[] = [];
          points.push({ x: startX, y: startY });
          const straightEndY = startY + line.beforeBend;
          points.push({ x: startX, y: straightEndY });
          const firstCornerX = startX + scaledCornerRadius;
          const firstCornerY = straightEndY;
          points.push({ x: firstCornerX, y: firstCornerY });
          const horizontalLength = scaledBaseLength * 0.6;
          const midX = firstCornerX + horizontalLength;
          points.push({ x: midX, y: firstCornerY });
          const secondCornerX = midX;
          const secondCornerY = firstCornerY + scaledCornerRadius;
          points.push({ x: secondCornerX, y: secondCornerY });

          // Continue down (shortened length) before third bend
          const verticalLength = scaledBaseLength * 0.5; // Shortened end length
          const thirdBendY = secondCornerY + verticalLength;
          points.push({ x: secondCornerX, y: thirdBendY });

          // Third bend: turn right (to avoid touching text)
          const thirdCornerX = secondCornerX + scaledCornerRadius;
          const thirdCornerY = thirdBendY;
          points.push({ x: thirdCornerX, y: thirdCornerY });

          // Final horizontal segment (shortened, going right)
          const finalHorizontalLength = scaledBaseLength * 0.4;
          const endX = thirdCornerX + finalHorizontalLength;
          const endY = thirdCornerY;
          points.push({ x: endX, y: endY });

          path = {
            points,
            endCircle: { x: endX, y: endY },
            color: line.color,
          };
        } else if (position === 'right' && line.color === 'blue') {
          // Special case: blue line (right) on bottom needs three bends - first left, then down, then left (to avoid touching text)
          const points: { x: number; y: number }[] = [];
          points.push({ x: startX, y: startY });
          const straightEndY = startY + line.beforeBend;
          points.push({ x: startX, y: straightEndY });
          const firstCornerX = startX - scaledCornerRadius;
          const firstCornerY = straightEndY;
          points.push({ x: firstCornerX, y: firstCornerY });
          // Reduced horizontal length to shorten the line after first bend
          const horizontalLength = scaledBaseLength * 0.3;
          const midX = firstCornerX - horizontalLength;
          points.push({ x: midX, y: firstCornerY });
          const secondCornerX = midX;
          const secondCornerY = firstCornerY + scaledCornerRadius;
          points.push({ x: secondCornerX, y: secondCornerY });

          // Continue down (shortened length) before third bend
          const verticalLength = scaledBaseLength * 0.5; // Shortened end length
          const thirdBendY = secondCornerY + verticalLength;
          points.push({ x: secondCornerX, y: thirdBendY });

          // Third bend: turn left (to avoid touching text)
          const thirdCornerX = secondCornerX - scaledCornerRadius;
          const thirdCornerY = thirdBendY;
          points.push({ x: thirdCornerX, y: thirdCornerY });

          // Final horizontal segment (shortened, going left)
          const finalHorizontalLength = scaledBaseLength * 0.4;
          const endX = thirdCornerX - finalHorizontalLength;
          const endY = thirdCornerY;
          points.push({ x: endX, y: endY });

          path = {
            points,
            endCircle: { x: endX, y: endY },
            color: line.color,
          };
        } else {
          path = createCleanBendPath(startX, startY, 'down', line.turnDirection, line.beforeBend, line.afterBend, scaledCornerRadius);
          path.color = line.color;
        }

        patternLines.push(path);
      });

      // Calculate yellow line position for LEFT SIDE (same logic as main circuit)
      const topRedStartX = targetX - scaledHalfWidth + scaledTopBottomSpacing * 1;
      const topRedStartY = targetY - scaledHalfHeight;
      const topRedStraightEndY = topRedStartY - scaledBaseLength * 0.7;
      const topRedFirstCornerX = topRedStartX - scaledCornerRadius;
      const topRedMidX = topRedFirstCornerX - scaledBaseLength * 0.6;
      const topRedSecondCornerY = topRedStraightEndY - scaledCornerRadius;
      const topRedEndY = topRedSecondCornerY - scaledBaseLength * 1.2;

      const blueStartX = targetX - scaledHalfWidth;
      const blueStartY = targetY + scaledHalfHeight - scaledLeftRightSpacing * 2;
      const blueStraightEndX = blueStartX - scaledBaseLength * 1.0;
      const blueCornerY = blueStartY - scaledCornerRadius;
      const blueEndY = blueCornerY - scaledBaseLength * 1.4;

      const midpointY = (blueEndY + topRedEndY) / 2;

      const yellowStartX = targetX - scaledHalfWidth;
      const yellowStartY = targetY + scaledHalfHeight - scaledLeftRightSpacing * 3;
      const yellowStraightEndX = yellowStartX - scaledBaseLength * 0.8;
      const yellowCornerY = yellowStartY - scaledCornerRadius;
      const requiredAfterBend = yellowCornerY - midpointY;

      leftSide.bottom.afterBend = requiredAfterBend;

      // Create LEFT SIDE lines
      const leftOrder = ['top', 'middle', 'bottom'] as const;
      leftOrder.forEach((position, i) => {
        const line = leftSide[position];
        const startX = targetX - scaledHalfWidth;
        const startY = targetY + scaledHalfHeight - scaledLeftRightSpacing * (i + 1);

        let path: LinePath;

        // Check for custom path
        const lineKey = `left-${position}-${line.color}`;
        if (config.customPaths && config.customPaths[lineKey]) {
          path = config.customPaths[lineKey](
            startX,
            startY,
            line,
            scaledBaseLength,
            scaledCornerRadius,
            targetX,
            targetY,
            scaledHalfWidth,
            scaledHalfHeight
          );
        } else if (config.id === 'services' && position === 'bottom' && line.color === 'yellow') {
          // Bottom position (visually TOP) should be YELLOW for second rectangle (keep normal path)
          path = createCleanBendPath(startX, startY, 'left', line.turnDirection, line.beforeBend, line.afterBend, scaledCornerRadius);
          path.color = 'yellow'; // Keep yellow
        } else {
          // Normal path for all other cases
          path = createCleanBendPath(startX, startY, 'left', line.turnDirection, line.beforeBend, line.afterBend, scaledCornerRadius);
          path.color = line.color;
        }

        patternLines.push(path);
      });

      return patternLines;
    };

    // Function to draw the circuit pattern at a specific position
    const drawCircuitPatternAt = (
      ctx: CanvasRenderingContext2D,
      targetX: number,
      targetY: number,
      config: RectangleConfig
    ) => {
      const scale = config.scale;
      const widthMultiplier = config.widthMultiplier;
      const useExtendedRightSide = config.useExtendedRightSide;
      const skipLines = config.skipLines;
      const colorMap = config.colorMap;

      // Calculate rectangle size - if text dimensions are provided, size to fit text with padding
      // Otherwise use the original fixed size
      let scaledProcessorWidth: number;
      let scaledProcessorHeight: number;

      if (config.textWidth && config.textHeight && config.id !== 'main') {
        // Size rectangle to fit text with 10px padding on each side
        const padding = 10; // 10px fixed padding
        // Use text-based size directly (text width/height + 10px padding on each side)
        scaledProcessorWidth = config.textWidth + (padding * 2); // 10px left + 10px right
        scaledProcessorHeight = config.textHeight + (padding * 2); // 10px top + 10px bottom
        // ONE-TIME LOG: Verify sizing calculation
        const sizeLogKey = `size-${config.id}`;
        if (!loggedElements.has(sizeLogKey)) {
          loggedElements.add(sizeLogKey);
          console.log(`[${config.id}] Rectangle sizing:`, {
            textWidth: config.textWidth.toFixed(1),
            textHeight: config.textHeight.toFixed(1),
            padding: padding,
            rectWidth: scaledProcessorWidth.toFixed(1),
            rectHeight: scaledProcessorHeight.toFixed(1),
            expectedWidth: (config.textWidth + 20).toFixed(1),
            expectedHeight: (config.textHeight + 20).toFixed(1)
          });
        }
      } else {
        // Main processor or no text dimensions - use original sizing
        scaledProcessorWidth = processorWidth * scale * widthMultiplier;
        scaledProcessorHeight = processorHeight * scale;
        if (config.id !== 'main') {
          // console.log(`[${config.id}] Using original sizing (no text dimensions): textWidth=${config.textWidth}, textHeight=${config.textHeight}`);
        }
      }

      const scaledBaseLength = baseLength * scale;
      const scaledHalfWidth = scaledProcessorWidth / 2;
      const scaledHalfHeight = scaledProcessorHeight / 2;

      // Draw processor rectangle
      // Rectangle is drawn centered at targetX, targetY with dimensions scaledProcessorWidth x scaledProcessorHeight
      // targetX and targetY are the CENTER of the rectangle (which should match text center)
      const rectLeft = targetX - scaledHalfWidth;
      const rectTop = targetY - scaledHalfHeight;
      const rectRight = targetX + scaledHalfWidth;
      const rectBottom = targetY + scaledHalfHeight;

      // DEBUG: Logging disabled to prevent console crashes
      // Debug: Log rectangle bounds for non-main rectangles (reduce spam - log 1% of frames)
      // if (config.id !== 'main' && config.textWidth && config.textHeight && Math.random() < 0.01) {
      //   console.log(`[${config.id}] DRAWING rectangle at:`, {
      //     targetCenter: { x: targetX.toFixed(1), y: targetY.toFixed(1) },
      //     rectBounds: {
      //       left: rectLeft.toFixed(1),
      //       top: rectTop.toFixed(1),
      //       right: rectRight.toFixed(1),
      //       bottom: rectBottom.toFixed(1)
      //     },
      //     size: `${scaledProcessorWidth.toFixed(1)}x${scaledProcessorHeight.toFixed(1)}`,
      //     textSize: `${config.textWidth.toFixed(1)}x${config.textHeight.toFixed(1)}`,
      //     padding: '10px on all sides',
      //     expectedTextBounds: {
      //       left: (targetX - scaledHalfWidth + 10).toFixed(1),
      //       top: (targetY - scaledHalfHeight + 10).toFixed(1),
      //       right: (targetX + scaledHalfWidth - 10).toFixed(1),
      //       bottom: (targetY + scaledHalfHeight - 10).toFixed(1)
      //     }
      //   });
      // }

      // Ensure rectangle is within canvas bounds (clip if needed, but still draw)
      const canvasWidth = ctx.canvas.width;
      const canvasHeight = ctx.canvas.height;

      // Draw rectangle (even if partially off-screen, it will be clipped by canvas)
      // Use brighter colors for non-main rectangles to ensure visibility
      if (config.id !== 'main') {
        // Use different colors for each rectangle to verify they're being drawn separately
        const colors: { [key: string]: { fill: string; stroke: string } } = {
          'services': { fill: "rgba(255, 100, 100, 0.4)", stroke: "rgba(255, 150, 150, 0.8)" },
          'about': { fill: "rgba(100, 255, 100, 0.4)", stroke: "rgba(150, 255, 150, 0.8)" },
          'why': { fill: "rgba(100, 100, 255, 0.4)", stroke: "rgba(150, 150, 255, 0.8)" },
          'contact': { fill: "rgba(255, 255, 100, 0.4)", stroke: "rgba(255, 255, 150, 0.8)" },
        };
        const rectColors = colors[config.id] || { fill: "rgba(100, 130, 180, 0.4)", stroke: "rgba(150, 180, 255, 0.7)" };

        ctx.fillStyle = rectColors.fill;
        ctx.fillRect(rectLeft, rectTop, scaledProcessorWidth, scaledProcessorHeight);

        ctx.strokeStyle = rectColors.stroke;
        ctx.lineWidth = 3; // Thicker stroke for visibility
        ctx.strokeRect(rectLeft, rectTop, scaledProcessorWidth, scaledProcessorHeight);

        // Debug: Draw visual markers to verify position
        // Red dot at calculated center
        ctx.fillStyle = "rgba(255, 0, 0, 1)";
        ctx.beginPath();
        ctx.arc(targetX, targetY, 5, 0, Math.PI * 2);
        ctx.fill();

        // Green dot at rectangle top-left corner
        ctx.fillStyle = "rgba(0, 255, 0, 1)";
        ctx.beginPath();
        ctx.arc(rectLeft, rectTop, 3, 0, Math.PI * 2);
        ctx.fill();

        // Blue dot at rectangle bottom-right corner
        ctx.fillStyle = "rgba(0, 0, 255, 1)";
        ctx.beginPath();
        ctx.arc(rectRight, rectBottom, 3, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Main processor uses original colors
        ctx.fillStyle = "rgba(100, 130, 180, 0.28)";
        ctx.fillRect(rectLeft, rectTop, scaledProcessorWidth, scaledProcessorHeight);

        ctx.strokeStyle = "rgba(150, 180, 255, 0.55)";
        ctx.lineWidth = 2.5;
        ctx.strokeRect(rectLeft, rectTop, scaledProcessorWidth, scaledProcessorHeight);
      }

      // Draw connection lines around the rectangle
      ctx.save();
      ctx.strokeStyle = "rgba(100, 200, 255, 0.4)";
      ctx.lineWidth = 1.5;
      ctx.lineCap = "round";

      const scaledConnectionLength = scaledBaseLength * 0.15;
      const scaledSpacing = scaledBaseLength * 0.2;

      // Top side connections
      const topConnections = Math.floor(scaledProcessorWidth / scaledSpacing);
      for (let i = 1; i <= topConnections; i++) {
        const x = targetX - scaledHalfWidth + (scaledProcessorWidth / (topConnections + 1)) * i;
        const y = targetY - scaledHalfHeight;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y - scaledConnectionLength);
        ctx.stroke();
      }

      // Bottom side connections
      for (let i = 1; i <= topConnections; i++) {
        const x = targetX - scaledHalfWidth + (scaledProcessorWidth / (topConnections + 1)) * i;
        const y = targetY + scaledHalfHeight;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y + scaledConnectionLength);
        ctx.stroke();
      }

      // Left side connections
      const leftConnections = Math.floor(scaledProcessorHeight / scaledSpacing);
      for (let i = 1; i <= leftConnections; i++) {
        const x = targetX - scaledHalfWidth;
        const y = targetY - scaledHalfHeight + (scaledProcessorHeight / (leftConnections + 1)) * i;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - scaledConnectionLength, y);
        ctx.stroke();
      }

      // Right side connections
      for (let i = 1; i <= leftConnections; i++) {
        const x = targetX + scaledHalfWidth;
        const y = targetY - scaledHalfHeight + (scaledProcessorHeight / (leftConnections + 1)) * i;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + scaledConnectionLength, y);
        ctx.stroke();
      }

      ctx.restore();

      // Create and draw all lines using exact same logic as main circuit
      // Use the same config (with text dimensions) for line creation
      const patternLines = createCircuitPatternAt(targetX, targetY, config);

      // Apply color map if provided (for color swapping)
      if (colorMap) {
        patternLines.forEach((line) => {
          if (line.color && colorMap[line.color as keyof typeof colorMap]) {
            line.color = colorMap[line.color as keyof typeof colorMap] as 'red' | 'blue' | 'yellow';
          }
        });

        // Remove the top right red line if skipTopRed is true (for third rectangle only)
        // The third rectangle swaps colors, so the top right blue line becomes red after swap
        if (skipLines?.skipTopRed && colorMap.red === 'blue' && colorMap.blue === 'red') {
          // Find the top right line - it's the red line (after color swap) on the top side
          // The top side lines are the first 3 lines in patternLines array
          // Top order: left (red->blue), center (yellow->yellow), right (blue->red)
          // So after swap, the third line (index 2) is the top right red line
          const topRightRedIndex = patternLines.findIndex((line, index) => {
            // Check if it's one of the first 3 lines (top side) and is red after swap
            return index < 3 && line.color === 'red';
          });
          if (topRightRedIndex !== -1) {
            patternLines.splice(topRightRedIndex, 1);
          }
        }
      }

      // Draw the pattern lines
      drawPatternLines(ctx, patternLines, scale);
    };

    // Helper function to draw pattern lines (extracted for reuse)
    const drawPatternLines = (ctx: CanvasRenderingContext2D, patternLines: LinePath[], scale: number) => {
      // Draw all lines
      ctx.lineWidth = 2;
      patternLines.forEach((line) => {
        const colorMap: { [key: string]: string } = {
          'red': 'rgba(255, 100, 100, 0.6)',
          'blue': 'rgba(100, 150, 255, 0.6)',
          'yellow': 'rgba(255, 255, 100, 0.6)',
        };
        ctx.strokeStyle = (line.color && colorMap[line.color]) || "rgba(150, 180, 255, 0.22)";

        ctx.beginPath();
        ctx.moveTo(line.points[0].x, line.points[0].y);

        for (let i = 1; i < line.points.length; i++) {
          if (i < line.points.length - 1 && line.points.length > 2) {
            const p0 = line.points[i - 1];
            const p1 = line.points[i];
            const p2 = line.points[i + 1];
            const angle1 = Math.atan2(p1.y - p0.y, p1.x - p0.x);
            const angle2 = Math.atan2(p2.y - p1.y, p2.x - p1.x);
            const radius = cornerRadius * scale;
            ctx.lineTo(p1.x - Math.cos(angle1) * radius, p1.y - Math.sin(angle1) * radius);
            ctx.arcTo(p1.x, p1.y, p1.x + Math.cos(angle2) * radius, p1.y + Math.sin(angle2) * radius, radius);
            i++;
            if (i < line.points.length) {
              ctx.lineTo(line.points[i].x, line.points[i].y);
            }
          } else {
            ctx.lineTo(line.points[i].x, line.points[i].y);
          }
        }
        ctx.stroke();

        // Draw end circle (skip if line is connected)
        if (!line.skipEndCircle) {
          const colorMapFill: { [key: string]: { fill: string; stroke: string } } = {
            'red': { fill: 'rgba(255, 100, 100, 0.5)', stroke: 'rgba(255, 100, 100, 0.7)' },
            'blue': { fill: 'rgba(100, 150, 255, 0.5)', stroke: 'rgba(100, 150, 255, 0.7)' },
            'yellow': { fill: 'rgba(255, 255, 100, 0.5)', stroke: 'rgba(255, 255, 100, 0.7)' },
          };
          const colors = (line.color && colorMapFill[line.color]) || { fill: "rgba(150, 180, 255, 0.35)", stroke: "rgba(150, 180, 255, 0.5)" };
          ctx.fillStyle = colors.fill;
          ctx.strokeStyle = colors.stroke;
          ctx.beginPath();
          ctx.arc(line.endCircle.x, line.endCircle.y, ballRadius * scale, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
      });
    };

    // Old individual drawing functions removed - now using unified loop in drawCircuit

    // Debounce resize to prevent flashing during scroll
    let resizeTimeout: NodeJS.Timeout;
    const debouncedResizeCanvas = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        resizeCanvas();
      }, 100);
    };

    const resizeObserver = new ResizeObserver(() => {
      debouncedResizeCanvas();
    });

    if (canvas.parentElement) {
      resizeObserver.observe(canvas.parentElement);
    }

    // Don't observe document.body - it causes flashing on scroll
    // Instead, check document height periodically and on window resize

    window.addEventListener("resize", debouncedResizeCanvas);

    // Update canvas height when page content changes, but debounced
    let lastDocumentHeight = 0;
    const updateCanvasHeight = () => {
      const currentHeight = Math.max(
        document.documentElement.scrollHeight,
        document.documentElement.clientHeight,
        document.body.scrollHeight,
        document.body.clientHeight,
        window.innerHeight
      );
      // Only resize if height actually changed significantly
      if (Math.abs(currentHeight - lastDocumentHeight) > 50) {
        lastDocumentHeight = currentHeight;
        debouncedResizeCanvas();
      }
    };

    // Use MutationObserver with debouncing to watch for DOM changes
    const mutationObserver = new MutationObserver(() => {
      updateCanvasHeight();
    });
    mutationObserver.observe(document.body, {
      childList: true,
      subtree: false, // Only watch direct children, not all descendants
      attributes: false // Don't watch attribute changes
    });

    // Watch the "Our Services" heading for position changes
    const servicesHeadingObserver = new ResizeObserver(() => {
      // Force a redraw when the heading position might have changed
      if (canvas.width > 0 && canvas.height > 0) {
        drawCircuit();
      }
    });

    // Observe the services section for layout changes
    const servicesSection = document.querySelector('section#services');
    if (servicesSection) {
      servicesHeadingObserver.observe(servicesSection);
    }

    // Also observe the about section for layout changes
    const aboutSection = document.querySelector('section#about');
    let aboutHeadingObserver: MutationObserver | null = null;
    if (aboutSection) {
      aboutHeadingObserver = new MutationObserver(() => {
        if (canvas && ctx) {
          drawCircuit();
        }
      });
      aboutHeadingObserver.observe(aboutSection, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['style', 'class']
      });
    }

    // Periodically check for height changes (less aggressive)
    const heightCheckInterval = setInterval(updateCanvasHeight, 1000);

    const startAnimation = () => {
      resizeCanvas();
      if (width > 0 && height > 0) {
        drawCircuit();
      } else {
        setTimeout(startAnimation, 50);
      }
    };

    setTimeout(startAnimation, 10);

    return () => {
      clearTimeout(resizeTimeout);
      clearInterval(heightCheckInterval);
      window.removeEventListener("resize", debouncedResizeCanvas);
      resizeObserver.disconnect();
      mutationObserver.disconnect();
      servicesHeadingObserver.disconnect();
      if (aboutHeadingObserver) {
        aboutHeadingObserver.disconnect();
      }
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div ref={containerRef} className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ display: 'block', pointerEvents: 'none' }}
      />
    </div>
  );
};

export default CircuitBackground16Improved;

