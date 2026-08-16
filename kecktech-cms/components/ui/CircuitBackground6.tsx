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
  color: string;
}

const CircuitBackground6: React.FC = () => {
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
      
      // Create a single prominent central chip with extensive branching
      const centerX = width * 0.55;
      const centerY = height * 0.45;
      const chipSize = Math.min(width, height) * 0.18;
      const pinCount = 10;
      
      const centralNode: CircuitNode = {
        x: centerX,
        y: centerY,
        connections: [],
        isCentral: true,
      };
      const centralIndex = nodes.length;
      nodes.push(centralNode);

      // Create pins from all sides
      const pinPositions: { x: number; y: number; side: number }[] = [];
      
      for (let side = 0; side < 4; side++) {
        for (let i = 0; i < pinCount; i++) {
          let pinX, pinY;
          if (side === 0) { // top
            pinX = centerX - chipSize / 2 + (chipSize / (pinCount + 1)) * (i + 1);
            pinY = centerY - chipSize / 2;
          } else if (side === 1) { // right
            pinX = centerX + chipSize / 2;
            pinY = centerY - chipSize / 2 + (chipSize / (pinCount + 1)) * (i + 1);
          } else if (side === 2) { // bottom
            pinX = centerX + chipSize / 2 - (chipSize / (pinCount + 1)) * (i + 1);
            pinY = centerY + chipSize / 2;
          } else { // left
            pinX = centerX - chipSize / 2;
            pinY = centerY + chipSize / 2 - (chipSize / (pinCount + 1)) * (i + 1);
          }
          pinPositions.push({ x: pinX, y: pinY, side });
        }
      }

      // Create extensive branching network
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

        // Create multiple branches from each pin
        const branchCount = 3 + Math.floor(Math.random() * 4);
        
        for (let b = 0; b < branchCount; b++) {
          const baseAngle = (Math.PI * 2 * b) / branchCount;
          const angleVariation = (Math.random() - 0.5) * 1.2;
          const angle = baseAngle + angleVariation;
          const distance = 60 + Math.random() * 180;
          
          const endX = pin.x + Math.cos(angle) * distance;
          const endY = pin.y + Math.sin(angle) * distance;

          if (endX > 20 && endX < width - 20 && endY > 20 && endY < height - 20) {
            // Create path with multiple connection points
            const segments = 3 + Math.floor(Math.random() * 4);
            let prevIndex = pinNodeIndex;
            
            for (let s = 1; s <= segments; s++) {
              const t = s / segments;
              const segmentX = pin.x + (endX - pin.x) * t + (Math.random() - 0.5) * 20;
              const segmentY = pin.y + (endY - pin.y) * t + (Math.random() - 0.5) * 20;
              
              const segmentNode: CircuitNode = {
                x: segmentX,
                y: segmentY,
                connections: [prevIndex],
                isCentral: false,
              };
              const segmentIndex = nodes.length;
              nodes.push(segmentNode);
              nodes[prevIndex].connections.push(segmentIndex);
              prevIndex = segmentIndex;
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

            // Sometimes create secondary branches
            if (Math.random() > 0.7 && prevIndex < nodes.length - 1) {
              const branchNode = nodes[Math.floor(prevIndex * 0.7)];
              if (branchNode && !branchNode.isCentral) {
                const secondaryAngle = angle + (Math.random() - 0.5) * 1.5;
                const secondaryDist = 40 + Math.random() * 80;
                const secX = branchNode.x + Math.cos(secondaryAngle) * secondaryDist;
                const secY = branchNode.y + Math.sin(secondaryAngle) * secondaryDist;
                
                if (secX > 0 && secX < width && secY > 0 && secY < height) {
                  const secNode: CircuitNode = {
                    x: secX,
                    y: secY,
                    connections: [nodes.indexOf(branchNode)],
                    isCentral: false,
                  };
                  const secIndex = nodes.length;
                  nodes.push(secNode);
                  const branchIdx = nodes.indexOf(branchNode);
                  if (branchIdx >= 0) {
                    nodes[branchIdx].connections.push(secIndex);
                  }
                }
              }
            }
          }
        }
      });

      // Connect nearby nodes
      nodes.forEach((node, i) => {
        if (!node.isCentral && node.connections.length < 4) {
          nodes.forEach((other, j) => {
            if (i !== j && !other.isCentral && other.connections.length < 4) {
              const dx = other.x - node.x;
              const dy = other.y - node.y;
              const distance = Math.sqrt(dx * dx + dy * dy);
              
              if (distance < 80 && Math.random() > 0.92) {
                if (!node.connections.includes(j)) {
                  node.connections.push(j);
                  other.connections.push(i);
                }
              }
            }
          });
        }
      });

      // Create electricity balls with different colors
      const colors = [
        "rgba(100, 200, 255, 1)", // Blue
        "rgba(150, 255, 150, 1)", // Green
        "rgba(255, 200, 100, 1)", // Orange
      ];

      for (let i = 0; i < 15; i++) {
        const startNode = Math.floor(Math.random() * nodes.length);
        if (nodes[startNode].connections.length > 0) {
          const path = buildPath(startNode, nodes, 10 + Math.floor(Math.random() * 12));
          if (path.length > 1) {
            balls.push({
              path,
              progress: Math.random(),
              speed: 0.007 + Math.random() * 0.011,
              currentSegment: 0,
              color: colors[Math.floor(Math.random() * colors.length)],
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
        if (path.includes(next) && path.length > 4) break;
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
      ctx.fillStyle = "rgba(8, 8, 12, 0.98)";
      ctx.fillRect(0, 0, width, height);

      // Draw circuit traces
      ctx.strokeStyle = "rgba(180, 180, 200, 0.18)";
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
      ctx.fillStyle = "rgba(200, 200, 220, 0.35)";
      nodes.forEach((node) => {
        if (!node.isCentral) {
          ctx.beginPath();
          ctx.arc(node.x, node.y, 2, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      // Draw central chip
      const centerX = width * 0.55;
      const centerY = height * 0.45;
      const chipSize = Math.min(width, height) * 0.18;
      
      ctx.fillStyle = "rgba(150, 150, 180, 0.25)";
      ctx.fillRect(centerX - chipSize / 2, centerY - chipSize / 2, chipSize, chipSize);
      
      ctx.strokeStyle = "rgba(200, 200, 255, 0.5)";
      ctx.lineWidth = 2;
      ctx.strokeRect(centerX - chipSize / 2, centerY - chipSize / 2, chipSize, chipSize);

      // Update and draw electricity balls
      balls.forEach((ball) => {
        if (ball.path.length < 2) return;

        ball.progress += ball.speed;

        if (ball.progress >= 1) {
          ball.currentSegment++;
          ball.progress = 0;

          if (ball.currentSegment >= ball.path.length - 1) {
            const startNode = ball.path[ball.path.length - 1];
            const newPath = buildPath(startNode, nodes, 10 + Math.floor(Math.random() * 12));
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

            // Parse color for gradient
            const colorMatch = ball.color.match(/(\d+),\s*(\d+),\s*(\d+)/);
            const r = colorMatch ? parseInt(colorMatch[1]) : 100;
            const g = colorMatch ? parseInt(colorMatch[2]) : 200;
            const b = colorMatch ? parseInt(colorMatch[3]) : 255;

            // Draw electricity ball with vibrant glow
            const glowGradient = ctx.createRadialGradient(x, y, 0, x, y, 18);
            glowGradient.addColorStop(0, ball.color);
            glowGradient.addColorStop(0.3, `rgba(${r}, ${g}, ${b}, 0.7)`);
            glowGradient.addColorStop(0.6, `rgba(${r}, ${g}, ${b}, 0.4)`);
            glowGradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
            
            ctx.fillStyle = glowGradient;
            ctx.beginPath();
            ctx.arc(x, y, 18, 0, Math.PI * 2);
            ctx.fill();

            // Draw bright core
            ctx.fillStyle = ball.color;
            ctx.beginPath();
            ctx.arc(x, y, 5, 0, Math.PI * 2);
            ctx.fill();

            // Draw electric trail
            const trailLength = 50;
            const trailProgress = Math.max(0, ball.progress - 0.25);
            const trailX = fromNode.x + (toNode.x - fromNode.x) * trailProgress;
            const trailY = fromNode.y + (toNode.y - fromNode.y) * trailProgress;

            const trailGradient = ctx.createLinearGradient(trailX, trailY, x, y);
            trailGradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0)`);
            trailGradient.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, 0.4)`);
            trailGradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0.8)`);
            
            ctx.strokeStyle = trailGradient;
            ctx.lineWidth = 3;
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

export default CircuitBackground6;


