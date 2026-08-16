"use client";

import React, { useEffect, useRef } from "react";

interface LinePath {
  points: { x: number; y: number }[];
  endCircle: { x: number; y: number };
}

interface ElectricityBall {
  lineIndex: number;
  progress: number;
  speed: number;
  direction: 1 | -1;
}

const CircuitBackground8: React.FC = () => {
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
    let processorSize = 0;
    const ballRadius = 5;
    const cornerRadius = 40;

    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      width = rect.width || canvas.offsetWidth || window.innerWidth;
      height = rect.height || canvas.offsetHeight || window.innerHeight;
      
      if (width > 0 && height > 0) {
        canvas.width = width;
        canvas.height = height;
        centerX = width / 2;
        centerY = height / 2;
        processorSize = Math.min(width, height) * 0.15;
        initCircuit();
      }
    };

    const createRoundedPath = (
      startX: number,
      startY: number,
      endX: number,
      endY: number,
      cornerRadius: number
    ): { x: number; y: number }[] => {
      const points: { x: number; y: number }[] = [];
      const dx = endX - startX;
      const dy = endY - startY;
      
      // Determine if we need horizontal or vertical first
      const isHorizontal = Math.abs(dx) > Math.abs(dy);
      
      if (isHorizontal) {
        // Go horizontal first, then vertical
        const midX = startX + (dx > 0 ? cornerRadius : -cornerRadius);
        points.push({ x: startX, y: startY });
        points.push({ x: midX, y: startY });
        points.push({ x: midX, y: endY });
        points.push({ x: endX, y: endY });
      } else {
        // Go vertical first, then horizontal
        const midY = startY + (dy > 0 ? cornerRadius : -cornerRadius);
        points.push({ x: startX, y: startY });
        points.push({ x: startX, y: midY });
        points.push({ x: endX, y: midY });
        points.push({ x: endX, y: endY });
      }
      
      return points;
    };

    const initCircuit = () => {
      lines = [];
      balls = [];
      
      const linesPerSide = 2;
      const sideLength = processorSize / 2;
      const lineLength = Math.min(width, height) * 0.25;
      
      // Top side - lines go up
      for (let i = 0; i < linesPerSide; i++) {
        const spacing = processorSize / (linesPerSide + 1);
        const startX = centerX - sideLength + spacing * (i + 1);
        const startY = centerY - sideLength;
        const endX = startX;
        const endY = startY - lineLength;
        
        const path = createRoundedPath(startX, startY, endX, endY, cornerRadius);
        lines.push({
          points: path,
          endCircle: { x: endX, y: endY },
        });
      }
      
      // Right side - lines go right
      for (let i = 0; i < linesPerSide; i++) {
        const spacing = processorSize / (linesPerSide + 1);
        const startX = centerX + sideLength;
        const startY = centerY - sideLength + spacing * (i + 1);
        const endX = startX + lineLength;
        const endY = startY;
        
        const path = createRoundedPath(startX, startY, endX, endY, cornerRadius);
        lines.push({
          points: path,
          endCircle: { x: endX, y: endY },
        });
      }
      
      // Bottom side - lines go down
      for (let i = 0; i < linesPerSide; i++) {
        const spacing = processorSize / (linesPerSide + 1);
        const startX = centerX + sideLength - spacing * (i + 1);
        const startY = centerY + sideLength;
        const endX = startX;
        const endY = startY + lineLength;
        
        const path = createRoundedPath(startX, startY, endX, endY, cornerRadius);
        lines.push({
          points: path,
          endCircle: { x: endX, y: endY },
        });
      }
      
      // Left side - lines go left
      for (let i = 0; i < linesPerSide; i++) {
        const spacing = processorSize / (linesPerSide + 1);
        const startX = centerX - sideLength;
        const startY = centerY + sideLength - spacing * (i + 1);
        const endX = startX - lineLength;
        const endY = startY;
        
        const path = createRoundedPath(startX, startY, endX, endY, cornerRadius);
        lines.push({
          points: path,
          endCircle: { x: endX, y: endY },
        });
      }

      // Initialize 3 balls
      for (let i = 0; i < 3; i++) {
        const lineIndex = Math.floor(Math.random() * lines.length);
        balls.push({
          lineIndex,
          progress: Math.random() * 0.5, // Start at random positions
          speed: 0.004 + Math.random() * 0.008,
          direction: Math.random() > 0.5 ? 1 : -1,
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

    const drawCircuit = () => {
      if (width <= 0 || height <= 0 || lines.length === 0) {
        animationFrameId = requestAnimationFrame(drawCircuit);
        return;
      }

      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = "rgba(8, 8, 12, 0.98)";
      ctx.fillRect(0, 0, width, height);

      // Draw circuit lines
      ctx.strokeStyle = "rgba(180, 200, 255, 0.25)";
      ctx.lineWidth = 2.5;
      
      lines.forEach((line) => {
        ctx.beginPath();
        ctx.moveTo(line.points[0].x, line.points[0].y);
        
        for (let i = 1; i < line.points.length; i++) {
          if (i === 1 && line.points.length > 2) {
            // Draw rounded corner
            const p0 = line.points[i - 1];
            const p1 = line.points[i];
            const p2 = line.points[i + 1];
            
            const angle1 = Math.atan2(p1.y - p0.y, p1.x - p0.x);
            const angle2 = Math.atan2(p2.y - p1.y, p2.x - p1.x);
            
            const cornerX = p1.x;
            const cornerY = p1.y;
            
            ctx.lineTo(cornerX - Math.cos(angle1) * cornerRadius, cornerY - Math.sin(angle1) * cornerRadius);
            ctx.arcTo(cornerX, cornerY, cornerX + Math.cos(angle2) * cornerRadius, cornerY + Math.sin(angle2) * cornerRadius, cornerRadius);
            i++;
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
      ctx.fillStyle = "rgba(180, 200, 255, 0.4)";
      ctx.strokeStyle = "rgba(180, 200, 255, 0.6)";
      ctx.lineWidth = 1.5;
      lines.forEach((line) => {
        ctx.beginPath();
        ctx.arc(line.endCircle.x, line.endCircle.y, ballRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      });

      // Draw central processor
      ctx.fillStyle = "rgba(120, 150, 200, 0.3)";
      ctx.fillRect(centerX - processorSize / 2, centerY - processorSize / 2, processorSize, processorSize);
      
      ctx.strokeStyle = "rgba(180, 200, 255, 0.6)";
      ctx.lineWidth = 2.5;
      ctx.strokeRect(centerX - processorSize / 2, centerY - processorSize / 2, processorSize, processorSize);

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
          const newLineIndex = Math.floor(Math.random() * lines.length);
          ball.lineIndex = newLineIndex;
          ball.progress = 0;
          ball.direction = 1;
          ball.speed = 0.004 + Math.random() * 0.008;
        }

        const position = getPointOnPath(line, ball.progress);

        // Draw electricity ball with glow
        const glowGradient = ctx.createRadialGradient(position.x, position.y, 0, position.x, position.y, ballRadius * 3.5);
        glowGradient.addColorStop(0, "rgba(100, 200, 255, 1)");
        glowGradient.addColorStop(0.3, "rgba(100, 200, 255, 0.7)");
        glowGradient.addColorStop(0.6, "rgba(150, 220, 255, 0.4)");
        glowGradient.addColorStop(1, "rgba(100, 200, 255, 0)");
        
        ctx.fillStyle = glowGradient;
        ctx.beginPath();
        ctx.arc(position.x, position.y, ballRadius * 3.5, 0, Math.PI * 2);
        ctx.fill();

        // Draw core ball
        ctx.fillStyle = "rgba(150, 220, 255, 1)";
        ctx.beginPath();
        ctx.arc(position.x, position.y, ballRadius, 0, Math.PI * 2);
        ctx.fill();
      });

      animationFrameId = requestAnimationFrame(drawCircuit);
    };

    const resizeObserver = new ResizeObserver(() => {
      resizeCanvas();
    });
    
    if (canvas.parentElement) {
      resizeObserver.observe(canvas.parentElement);
    }
    
    window.addEventListener("resize", resizeCanvas);
    
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
      window.removeEventListener("resize", resizeCanvas);
      resizeObserver.disconnect();
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div ref={containerRef} className="absolute inset-0 w-full h-full">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ display: 'block' }}
      />
    </div>
  );
};

export default CircuitBackground8;


