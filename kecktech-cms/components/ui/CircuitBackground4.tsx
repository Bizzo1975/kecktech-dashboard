"use client";

import React, { useEffect, useRef } from "react";

interface CircuitNode {
  x: number;
  y: number;
  connections: number[];
  isCentral: boolean;
}

interface ElectricityBall {
  path: number[];
  progress: number;
  speed: number;
  currentSegment: number;
}

const CircuitBackground4: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let nodes: CircuitNode[] = [];
    let balls: ElectricityBall[] = [];
    let animationFrameId: number;
    let width = canvas.offsetWidth || window.innerWidth;
    let height = canvas.offsetHeight || window.innerHeight;

    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      width = rect.width || canvas.offsetWidth || window.innerWidth;
      height = rect.height || canvas.offsetHeight || window.innerHeight;
      
      if (width > 0 && height > 0) {
        canvas.width = width;
        canvas.height = height;
        initCircuit();
      }
    };

    const initCircuit = () => {
      nodes = [];
      balls = [];
      
      // Create central square component (microchip)
      const centerX = width * 0.6;
      const centerY = height * 0.4;
      const chipSize = Math.min(width, height) * 0.15;
      const pinCount = 8;
      
      // Central chip node
      const centralNode: CircuitNode = {
        x: centerX,
        y: centerY,
        connections: [],
        isCentral: true,
      };
      const centralIndex = nodes.length;
      nodes.push(centralNode);

      // Create pins extending from the chip
      const pinPositions: { x: number; y: number; side: string }[] = [];
      
      // Top side pins
      for (let i = 0; i < pinCount; i++) {
        const pinX = centerX - chipSize / 2 + (chipSize / (pinCount + 1)) * (i + 1);
        const pinY = centerY - chipSize / 2;
        pinPositions.push({ x: pinX, y: pinY, side: 'top' });
      }
      
      // Right side pins
      for (let i = 0; i < pinCount; i++) {
        const pinX = centerX + chipSize / 2;
        const pinY = centerY - chipSize / 2 + (chipSize / (pinCount + 1)) * (i + 1);
        pinPositions.push({ x: pinX, y: pinY, side: 'right' });
      }
      
      // Bottom side pins
      for (let i = 0; i < pinCount; i++) {
        const pinX = centerX + chipSize / 2 - (chipSize / (pinCount + 1)) * (i + 1);
        const pinY = centerY + chipSize / 2;
        pinPositions.push({ x: pinX, y: pinY, side: 'bottom' });
      }
      
      // Left side pins
      for (let i = 0; i < pinCount; i++) {
        const pinX = centerX - chipSize / 2;
        const pinY = centerY + chipSize / 2 - (chipSize / (pinCount + 1)) * (i + 1);
        pinPositions.push({ x: pinX, y: pinY, side: 'left' });
      }

      // Create nodes from pins and extend traces
      pinPositions.forEach((pin, pinIdx) => {
        const pinNode: CircuitNode = {
          x: pin.x,
          y: pin.y,
          connections: [centralIndex],
          isCentral: false,
        };
        const pinNodeIndex = nodes.length;
        nodes.push(pinNode);
        nodes[centralIndex].connections.push(pinNodeIndex);

        // Create branching traces from pins
        const branchCount = 2 + Math.floor(Math.random() * 3);
        let lastNodeIndex = pinNodeIndex;

        for (let b = 0; b < branchCount; b++) {
          const angle = (Math.PI * 2 * b) / branchCount + Math.random() * 0.5;
          const distance = 50 + Math.random() * 150;
          const endX = pin.x + Math.cos(angle) * distance;
          const endY = pin.y + Math.sin(angle) * distance;

          if (endX > 0 && endX < width && endY > 0 && endY < height) {
            const branchNode: CircuitNode = {
              x: endX,
              y: endY,
              connections: [lastNodeIndex],
              isCentral: false,
            };
            const branchIndex = nodes.length;
            nodes.push(branchNode);
            nodes[lastNodeIndex].connections.push(branchIndex);

            // Add connection points along the path
            const midPoints = 2 + Math.floor(Math.random() * 3);
            let prevIndex = lastNodeIndex;
            for (let m = 1; m <= midPoints; m++) {
              const midX = pin.x + (endX - pin.x) * (m / (midPoints + 1));
              const midY = pin.y + (endY - pin.y) * (m / (midPoints + 1));
              const midNode: CircuitNode = {
                x: midX,
                y: midY,
                connections: [prevIndex],
                isCentral: false,
              };
              const midIndex = nodes.length;
              nodes.push(midNode);
              nodes[prevIndex].connections.push(midIndex);
              prevIndex = midIndex;
            }
            nodes[prevIndex].connections.push(branchIndex);
            nodes[branchIndex].connections.push(prevIndex);
            lastNodeIndex = branchIndex;
          }
        }
      });

      // Create electricity balls
      for (let i = 0; i < 8; i++) {
        const startNode = Math.floor(Math.random() * nodes.length);
        if (nodes[startNode].connections.length > 0) {
          const path = buildPath(startNode, nodes, 5 + Math.floor(Math.random() * 8));
          if (path.length > 1) {
            balls.push({
              path,
              progress: Math.random(),
              speed: 0.008 + Math.random() * 0.012,
              currentSegment: 0,
            });
          }
        }
      }
    };

    const buildPath = (start: number, nodeList: CircuitNode[], length: number): number[] => {
      const path = [start];
      let current = start;
      
      for (let i = 0; i < length; i++) {
        const connections = nodeList[current].connections;
        if (connections.length === 0) break;
        
        const next = connections[Math.floor(Math.random() * connections.length)];
        if (path.includes(next) && path.length > 2) break;
        path.push(next);
        current = next;
      }
      
      return path;
    };

    const drawCircuit = () => {
      if (width <= 0 || height <= 0 || nodes.length === 0) {
        animationFrameId = requestAnimationFrame(drawCircuit);
        return;
      }

      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = "rgba(10, 10, 15, 0.98)";
      ctx.fillRect(0, 0, width, height);

      // Draw circuit traces
      ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
      ctx.lineWidth = 1.5;
      nodes.forEach((node) => {
        node.connections.forEach((connIndex) => {
          if (connIndex < nodes.length) {
            const target = nodes[connIndex];
            ctx.beginPath();
            ctx.moveTo(node.x, node.y);
            ctx.lineTo(target.x, target.y);
            ctx.stroke();
          }
        });
      });

      // Draw connection nodes (dots)
      ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
      nodes.forEach((node) => {
        if (!node.isCentral) {
          ctx.beginPath();
          ctx.arc(node.x, node.y, 2, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      // Draw central chip
      const centerX = width * 0.6;
      const centerY = height * 0.4;
      const chipSize = Math.min(width, height) * 0.15;
      
      ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
      ctx.fillRect(centerX - chipSize / 2, centerY - chipSize / 2, chipSize, chipSize);
      
      ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
      ctx.lineWidth = 2;
      ctx.strokeRect(centerX - chipSize / 2, centerY - chipSize / 2, chipSize, chipSize);

      // Update and draw electricity balls
      balls.forEach((ball) => {
        if (ball.path.length < 2) return;

        ball.progress += ball.speed;

        // Move to next segment
        if (ball.progress >= 1) {
          ball.currentSegment++;
          ball.progress = 0;

          if (ball.currentSegment >= ball.path.length - 1) {
            // Create new path
            const startNode = ball.path[ball.path.length - 1];
            const newPath = buildPath(startNode, nodes, 5 + Math.floor(Math.random() * 8));
            if (newPath.length > 1) {
              ball.path = newPath;
              ball.currentSegment = 0;
            } else {
              ball.currentSegment = 0;
              ball.progress = 0;
            }
          }
        }

        if (ball.currentSegment < ball.path.length - 1) {
          const fromIndex = ball.path[ball.currentSegment];
          const toIndex = ball.path[ball.currentSegment + 1];
          
          if (fromIndex < nodes.length && toIndex < nodes.length) {
            const fromNode = nodes[fromIndex];
            const toNode = nodes[toIndex];
            const x = fromNode.x + (toNode.x - fromNode.x) * ball.progress;
            const y = fromNode.y + (toNode.y - fromNode.y) * ball.progress;

            // Draw electricity ball with glow
            const glowGradient = ctx.createRadialGradient(x, y, 0, x, y, 15);
            glowGradient.addColorStop(0, "rgba(100, 200, 255, 1)");
            glowGradient.addColorStop(0.4, "rgba(100, 200, 255, 0.6)");
            glowGradient.addColorStop(0.7, "rgba(150, 220, 255, 0.3)");
            glowGradient.addColorStop(1, "rgba(100, 200, 255, 0)");
            
            ctx.fillStyle = glowGradient;
            ctx.beginPath();
            ctx.arc(x, y, 15, 0, Math.PI * 2);
            ctx.fill();

            // Draw core ball
            ctx.fillStyle = "rgba(150, 220, 255, 1)";
            ctx.beginPath();
            ctx.arc(x, y, 4, 0, Math.PI * 2);
            ctx.fill();

            // Draw trail
            const trailLength = 30;
            const trailProgress = Math.max(0, ball.progress - 0.15);
            const trailX = fromNode.x + (toNode.x - fromNode.x) * trailProgress;
            const trailY = fromNode.y + (toNode.y - fromNode.y) * trailProgress;

            const trailGradient = ctx.createLinearGradient(trailX, trailY, x, y);
            trailGradient.addColorStop(0, "rgba(100, 200, 255, 0)");
            trailGradient.addColorStop(1, "rgba(100, 200, 255, 0.5)");
            
            ctx.strokeStyle = trailGradient;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(trailX, trailY);
            ctx.lineTo(x, y);
            ctx.stroke();
          }
        }
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

export default CircuitBackground4;


