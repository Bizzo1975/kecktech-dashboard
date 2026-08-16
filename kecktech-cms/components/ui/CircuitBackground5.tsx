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
  size: number;
}

const CircuitBackground5: React.FC = () => {
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
      
      // Create multiple central components for more complex network
      const centers = [
        { x: width * 0.5, y: height * 0.3, size: 0.12 },
        { x: width * 0.7, y: height * 0.6, size: 0.1 },
        { x: width * 0.3, y: height * 0.7, size: 0.1 },
      ];

      centers.forEach((center, centerIdx) => {
        const chipSize = Math.min(width, height) * center.size;
        const pinCount = 6;
        
        const centralNode: CircuitNode = {
          x: center.x,
          y: center.y,
          connections: [],
          isCentral: true,
        };
        const centralIndex = nodes.length;
        nodes.push(centralNode);

        // Create pins and traces from each chip
        const pinPositions: { x: number; y: number }[] = [];
        
        for (let side = 0; side < 4; side++) {
          for (let i = 0; i < pinCount; i++) {
            let pinX, pinY;
            if (side === 0) { // top
              pinX = center.x - chipSize / 2 + (chipSize / (pinCount + 1)) * (i + 1);
              pinY = center.y - chipSize / 2;
            } else if (side === 1) { // right
              pinX = center.x + chipSize / 2;
              pinY = center.y - chipSize / 2 + (chipSize / (pinCount + 1)) * (i + 1);
            } else if (side === 2) { // bottom
              pinX = center.x + chipSize / 2 - (chipSize / (pinCount + 1)) * (i + 1);
              pinY = center.y + chipSize / 2;
            } else { // left
              pinX = center.x - chipSize / 2;
              pinY = center.y + chipSize / 2 - (chipSize / (pinCount + 1)) * (i + 1);
            }
            pinPositions.push({ x: pinX, y: pinY });
          }
        }

        // Create nodes from pins
        pinPositions.forEach((pin) => {
          const pinNode: CircuitNode = {
            x: pin.x,
            y: pin.y,
            connections: [centralIndex],
            isCentral: false,
          };
          const pinNodeIndex = nodes.length;
          nodes.push(pinNode);
          nodes[centralIndex].connections.push(pinNodeIndex);

          // Create curved traces extending from pins
          const traceCount = 1 + Math.floor(Math.random() * 2);
          for (let t = 0; t < traceCount; t++) {
            const angle = (Math.PI * 2 * t) / traceCount + (Math.random() - 0.5) * 0.8;
            const distance = 80 + Math.random() * 120;
            
            // Create curved path
            const controlX = pin.x + Math.cos(angle) * distance * 0.5;
            const controlY = pin.y + Math.sin(angle) * distance * 0.5;
            const endX = pin.x + Math.cos(angle) * distance;
            const endY = pin.y + Math.sin(angle) * distance;

            if (endX > 0 && endX < width && endY > 0 && endY < height) {
              // Create intermediate nodes for smooth curve
              const segments = 4;
              let prevIndex = pinNodeIndex;
              
              for (let s = 1; s <= segments; s++) {
                const t = s / segments;
                const curveX = (1 - t) * (1 - t) * pin.x + 2 * (1 - t) * t * controlX + t * t * endX;
                const curveY = (1 - t) * (1 - t) * pin.y + 2 * (1 - t) * t * controlY + t * t * endY;
                
                const curveNode: CircuitNode = {
                  x: curveX,
                  y: curveY,
                  connections: [prevIndex],
                  isCentral: false,
                };
                const curveIndex = nodes.length;
                nodes.push(curveNode);
                nodes[prevIndex].connections.push(curveIndex);
                prevIndex = curveIndex;
              }

              // End node
              const endNode: CircuitNode = {
                x: endX,
                y: endY,
                connections: [prevIndex],
                isCentral: false,
              };
              const endIndex = nodes.length;
              nodes.push(endNode);
              nodes[prevIndex].connections.push(endIndex);
            }
          }
        });
      });

      // Connect nearby nodes from different chips
      nodes.forEach((node, i) => {
        if (!node.isCentral) {
          nodes.forEach((other, j) => {
            if (i !== j && !other.isCentral) {
              const dx = other.x - node.x;
              const dy = other.y - node.y;
              const distance = Math.sqrt(dx * dx + dy * dy);
              
              if (distance < 100 && Math.random() > 0.95) {
                if (!node.connections.includes(j)) {
                  node.connections.push(j);
                  other.connections.push(i);
                }
              }
            }
          });
        }
      });

      // Create electricity balls
      for (let i = 0; i < 12; i++) {
        const startNode = Math.floor(Math.random() * nodes.length);
        if (nodes[startNode].connections.length > 0) {
          const path = buildPath(startNode, nodes, 8 + Math.floor(Math.random() * 10));
          if (path.length > 1) {
            balls.push({
              path,
              progress: Math.random(),
              speed: 0.006 + Math.random() * 0.01,
              currentSegment: 0,
              size: 3 + Math.random() * 3,
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
        if (path.includes(next) && path.length > 3) break;
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
      ctx.fillStyle = "rgba(5, 5, 10, 0.98)";
      ctx.fillRect(0, 0, width, height);

      // Draw circuit traces with subtle glow
      ctx.strokeStyle = "rgba(200, 200, 255, 0.12)";
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

      // Draw connection nodes
      ctx.fillStyle = "rgba(200, 200, 255, 0.25)";
      nodes.forEach((node) => {
        if (!node.isCentral) {
          ctx.beginPath();
          ctx.arc(node.x, node.y, 1.5, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      // Draw central chips
      const centers = [
        { x: width * 0.5, y: height * 0.3, size: 0.12 },
        { x: width * 0.7, y: height * 0.6, size: 0.1 },
        { x: width * 0.3, y: height * 0.7, size: 0.1 },
      ];

      centers.forEach((center) => {
        const chipSize = Math.min(width, height) * center.size;
        
        ctx.fillStyle = "rgba(150, 150, 255, 0.15)";
        ctx.fillRect(center.x - chipSize / 2, center.y - chipSize / 2, chipSize, chipSize);
        
        ctx.strokeStyle = "rgba(200, 200, 255, 0.3)";
        ctx.lineWidth = 1.5;
        ctx.strokeRect(center.x - chipSize / 2, center.y - chipSize / 2, chipSize, chipSize);
      });

      // Update and draw electricity balls
      balls.forEach((ball) => {
        if (ball.path.length < 2) return;

        ball.progress += ball.speed;

        if (ball.progress >= 1) {
          ball.currentSegment++;
          ball.progress = 0;

          if (ball.currentSegment >= ball.path.length - 1) {
            const startNode = ball.path[ball.path.length - 1];
            const newPath = buildPath(startNode, nodes, 8 + Math.floor(Math.random() * 10));
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

            // Pulsing size
            const pulseSize = ball.size * (1 + Math.sin(Date.now() * 0.01 + ball.progress * 10) * 0.3);

            // Draw electricity ball with electric glow
            const glowGradient = ctx.createRadialGradient(x, y, 0, x, y, pulseSize * 4);
            glowGradient.addColorStop(0, "rgba(100, 150, 255, 1)");
            glowGradient.addColorStop(0.3, "rgba(150, 200, 255, 0.7)");
            glowGradient.addColorStop(0.6, "rgba(200, 220, 255, 0.4)");
            glowGradient.addColorStop(1, "rgba(100, 150, 255, 0)");
            
            ctx.fillStyle = glowGradient;
            ctx.beginPath();
            ctx.arc(x, y, pulseSize * 4, 0, Math.PI * 2);
            ctx.fill();

            // Draw core ball
            ctx.fillStyle = "rgba(200, 240, 255, 1)";
            ctx.beginPath();
            ctx.arc(x, y, pulseSize, 0, Math.PI * 2);
            ctx.fill();

            // Draw electric trail
            const trailLength = 40;
            const trailProgress = Math.max(0, ball.progress - 0.2);
            const trailX = fromNode.x + (toNode.x - fromNode.x) * trailProgress;
            const trailY = fromNode.y + (toNode.y - fromNode.y) * trailProgress;

            const trailGradient = ctx.createLinearGradient(trailX, trailY, x, y);
            trailGradient.addColorStop(0, "rgba(100, 150, 255, 0)");
            trailGradient.addColorStop(0.5, "rgba(150, 200, 255, 0.3)");
            trailGradient.addColorStop(1, "rgba(200, 240, 255, 0.6)");
            
            ctx.strokeStyle = trailGradient;
            ctx.lineWidth = 2.5;
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

export default CircuitBackground5;


