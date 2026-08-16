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

const CircuitBackground13: React.FC = () => {
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
        processorSize = Math.min(width, height) * 0.13;
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
    ): { x: number; y: number; endCircle: { x: number; y: number } } => {
      const points: { x: number; y: number }[] = [];
      let endX: number, endY: number;
      
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

    const initCircuit = () => {
      lines = [];
      balls = [];
      
      const linesPerSide = 3;
      const sideLength = processorSize / 2;
      const straightLength = Math.min(width, height) * 0.15;
      const turnLength = Math.min(width, height) * 0.12;
      
      // Top side - lines go straight up, then turn left or right
      for (let i = 0; i < linesPerSide; i++) {
        const spacing = processorSize / (linesPerSide + 1);
        const startX = centerX - sideLength + spacing * (i + 1);
        const startY = centerY - sideLength;
        const turnDir = i === 0 ? 'left' : i === 1 ? 'right' : 'left';
        
        const path = createCleanBendPath(startX, startY, 'up', turnDir, straightLength, turnLength, cornerRadius);
        lines.push(path);
      }
      
      // Right side - lines go straight right, then turn up or down
      for (let i = 0; i < linesPerSide; i++) {
        const spacing = processorSize / (linesPerSide + 1);
        const startX = centerX + sideLength;
        const startY = centerY - sideLength + spacing * (i + 1);
        const turnDir = i === 0 ? 'up' : i === 1 ? 'down' : 'up';
        
        const path = createCleanBendPath(startX, startY, 'right', turnDir, straightLength, turnLength, cornerRadius);
        lines.push(path);
      }
      
      // Bottom side - lines go straight down, then turn left or right
      for (let i = 0; i < linesPerSide; i++) {
        const spacing = processorSize / (linesPerSide + 1);
        const startX = centerX + sideLength - spacing * (i + 1);
        const startY = centerY + sideLength;
        const turnDir = i === 0 ? 'right' : i === 1 ? 'left' : 'right';
        
        const path = createCleanBendPath(startX, startY, 'down', turnDir, straightLength, turnLength, cornerRadius);
        lines.push(path);
      }
      
      // Left side - lines go straight left, then turn up or down
      for (let i = 0; i < linesPerSide; i++) {
        const spacing = processorSize / (linesPerSide + 1);
        const startX = centerX - sideLength;
        const startY = centerY + sideLength - spacing * (i + 1);
        const turnDir = i === 0 ? 'down' : i === 1 ? 'up' : 'down';
        
        const path = createCleanBendPath(startX, startY, 'left', turnDir, straightLength, turnLength, cornerRadius);
        lines.push(path);
      }

      // Initialize 4 balls
      for (let i = 0; i < 4; i++) {
        const lineIndex = Math.floor(Math.random() * lines.length);
        balls.push({
          lineIndex,
          progress: Math.random() * 0.3,
          speed: 0.003 + Math.random() * 0.009,
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
      ctx.fillStyle = "rgba(5, 5, 10, 0.98)";
      ctx.fillRect(0, 0, width, height);

      // Draw circuit lines
      ctx.strokeStyle = "rgba(150, 180, 255, 0.22)";
      ctx.lineWidth = 2;
      
      lines.forEach((line) => {
        ctx.beginPath();
        ctx.moveTo(line.points[0].x, line.points[0].y);
        
        for (let i = 1; i < line.points.length; i++) {
          if (i === 1 && line.points.length > 2) {
            // Draw rounded corner (90° bend)
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
      ctx.fillStyle = "rgba(150, 180, 255, 0.35)";
      ctx.strokeStyle = "rgba(150, 180, 255, 0.5)";
      ctx.lineWidth = 1.5;
      lines.forEach((line) => {
        ctx.beginPath();
        ctx.arc(line.endCircle.x, line.endCircle.y, ballRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      });

      // Draw central processor
      ctx.fillStyle = "rgba(100, 130, 180, 0.28)";
      ctx.fillRect(centerX - processorSize / 2, centerY - processorSize / 2, processorSize, processorSize);
      
      ctx.strokeStyle = "rgba(150, 180, 255, 0.55)";
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
          ball.speed = 0.003 + Math.random() * 0.009;
        }

        const position = getPointOnPath(line, ball.progress);

        // Draw electricity ball with glow
        const glowGradient = ctx.createRadialGradient(position.x, position.y, 0, position.x, position.y, ballRadius * 3);
        glowGradient.addColorStop(0, "rgba(100, 200, 255, 1)");
        glowGradient.addColorStop(0.4, "rgba(100, 200, 255, 0.6)");
        glowGradient.addColorStop(0.7, "rgba(150, 220, 255, 0.3)");
        glowGradient.addColorStop(1, "rgba(100, 200, 255, 0)");
        
        ctx.fillStyle = glowGradient;
        ctx.beginPath();
        ctx.arc(position.x, position.y, ballRadius * 3, 0, Math.PI * 2);
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

export default CircuitBackground13;

