"use client";

import React, { useEffect, useRef } from "react";

interface PCBNode {
  x: number;
  y: number;
  type: "horizontal" | "vertical" | "junction";
  connections: number[];
}

interface DataPacket {
  from: number;
  to: number;
  progress: number;
  speed: number;
  segments: number[];
}

const CircuitBackground3: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let nodes: PCBNode[] = [];
    let packets: DataPacket[] = [];
    let animationFrameId: number;
    let width = canvas.offsetWidth || window.innerWidth;
    let height = canvas.offsetHeight || window.innerHeight;
    const traceSpacing = 60;

    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      width = rect.width || canvas.offsetWidth || window.innerWidth;
      height = rect.height || canvas.offsetHeight || window.innerHeight;
      
      if (width > 0 && height > 0) {
        canvas.width = width;
        canvas.height = height;
        initPCB();
      }
    };

    const initPCB = () => {
      nodes = [];
      packets = [];
      
      // Create PCB-style grid of traces
      const horizontalTraces = Math.floor(height / traceSpacing);
      const verticalTraces = Math.floor(width / traceSpacing);
      
      // Create horizontal traces
      for (let i = 0; i < horizontalTraces; i++) {
        const y = i * traceSpacing + traceSpacing;
        const startX = Math.random() * 100;
        const endX = width - Math.random() * 100;
        
        const startNode: PCBNode = {
          x: startX,
          y,
          type: "junction",
          connections: [],
        };
        const startIndex = nodes.length;
        nodes.push(startNode);

        const endNode: PCBNode = {
          x: endX,
          y,
          type: "junction",
          connections: [],
        };
        const endIndex = nodes.length;
        nodes.push(endNode);

        // Connect start to end
        nodes[startIndex].connections.push(endIndex);
        nodes[endIndex].connections.push(startIndex);

        // Add intermediate nodes
        const intermediateCount = Math.floor((endX - startX) / traceSpacing);
        let lastIndex = startIndex;
        
        for (let j = 1; j < intermediateCount; j++) {
          const x = startX + ((endX - startX) / intermediateCount) * j;
          const node: PCBNode = {
            x,
            y,
            type: "horizontal",
            connections: [],
          };
          const nodeIndex = nodes.length;
          nodes.push(node);
          
          nodes[lastIndex].connections.push(nodeIndex);
          nodes[nodeIndex].connections.push(lastIndex);
          lastIndex = nodeIndex;
        }
        
        nodes[lastIndex].connections.push(endIndex);
        nodes[endIndex].connections.push(lastIndex);
      }

      // Create vertical traces and connect to horizontal
      for (let i = 0; i < verticalTraces; i++) {
        const x = i * traceSpacing + traceSpacing;
        const startY = Math.random() * 100;
        const endY = height - Math.random() * 100;
        
        const startNode: PCBNode = {
          x,
          y: startY,
          type: "junction",
          connections: [],
        };
        const startIndex = nodes.length;
        nodes.push(startNode);

        const endNode: PCBNode = {
          x,
          y: endY,
          type: "junction",
          connections: [],
        };
        const endIndex = nodes.length;
        nodes.push(endNode);

        nodes[startIndex].connections.push(endIndex);
        nodes[endIndex].connections.push(startIndex);

        // Connect to nearby horizontal traces
        nodes.forEach((node, idx) => {
          if (node.type === "horizontal" || node.type === "junction") {
            const dx = Math.abs(node.x - x);
            const dy = Math.abs(node.y - (startY + (endY - startY) / 2));
            
            if (dx < traceSpacing / 2 && dy < traceSpacing / 2) {
              if (!node.connections.includes(startIndex)) {
                node.connections.push(startIndex);
                nodes[startIndex].connections.push(idx);
              }
            }
          }
        });

        // Add intermediate vertical nodes
        const intermediateCount = Math.floor((endY - startY) / traceSpacing);
        let lastIndex = startIndex;
        
        for (let j = 1; j < intermediateCount; j++) {
          const y = startY + ((endY - startY) / intermediateCount) * j;
          const node: PCBNode = {
            x,
            y,
            type: "vertical",
            connections: [],
          };
          const nodeIndex = nodes.length;
          nodes.push(node);
          
          nodes[lastIndex].connections.push(nodeIndex);
          nodes[nodeIndex].connections.push(lastIndex);
          lastIndex = nodeIndex;
        }
        
        nodes[lastIndex].connections.push(endIndex);
        nodes[endIndex].connections.push(lastIndex);
      }

      // Create initial data packets
      for (let i = 0; i < 12; i++) {
        const from = Math.floor(Math.random() * nodes.length);
        const connections = nodes[from].connections;
        if (connections.length > 0) {
          const to = connections[Math.floor(Math.random() * connections.length)];
          packets.push({
            from,
            to,
            progress: Math.random() * 0.5,
            speed: 0.008 + Math.random() * 0.012,
            segments: [],
          });
        }
      }
    };

    const drawPCB = () => {
      if (width <= 0 || height <= 0 || nodes.length === 0) {
        animationFrameId = requestAnimationFrame(drawPCB);
        return;
      }

      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = "rgba(15, 15, 20, 0.98)";
      ctx.fillRect(0, 0, width, height);

      // Draw PCB traces
      ctx.strokeStyle = "rgba(34, 197, 94, 0.25)";
      ctx.lineWidth = 2;
      nodes.forEach((node) => {
        node.connections.forEach((connIndex) => {
          const target = nodes[connIndex];
          ctx.beginPath();
          ctx.moveTo(node.x, node.y);
          ctx.lineTo(target.x, target.y);
          ctx.stroke();
        });
      });

      // Update and draw data packets
      packets.forEach((packet) => {
        packet.progress += packet.speed;
        
        if (packet.progress >= 1) {
          const from = packet.to;
          const connections = nodes[from].connections;
          if (connections.length > 0) {
            const to = connections[Math.floor(Math.random() * connections.length)];
            packet.from = from;
            packet.to = to;
            packet.progress = 0;
            packet.speed = 0.008 + Math.random() * 0.012;
          } else {
            packet.progress = 0;
          }
        }

        const fromNode = nodes[packet.from];
        const toNode = nodes[packet.to];
        const x = fromNode.x + (toNode.x - fromNode.x) * packet.progress;
        const y = fromNode.y + (toNode.y - fromNode.y) * packet.progress;

        // Draw packet with trail
        const trailLength = 20;
        const trailProgress = Math.max(0, packet.progress - 0.1);
        const trailX = fromNode.x + (toNode.x - fromNode.x) * trailProgress;
        const trailY = fromNode.y + (toNode.y - fromNode.y) * trailProgress;

        // Draw trail
        const gradient = ctx.createLinearGradient(trailX, trailY, x, y);
        gradient.addColorStop(0, "rgba(34, 197, 94, 0)");
        gradient.addColorStop(1, "rgba(34, 197, 94, 0.6)");
        
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(trailX, trailY);
        ctx.lineTo(x, y);
        ctx.stroke();

        // Draw packet
        ctx.fillStyle = "rgba(34, 197, 94, 1)";
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();

        // Draw packet glow
        const glowGradient = ctx.createRadialGradient(x, y, 0, x, y, 12);
        glowGradient.addColorStop(0, "rgba(34, 197, 94, 0.4)");
        glowGradient.addColorStop(1, "rgba(34, 197, 94, 0)");
        
        ctx.fillStyle = glowGradient;
        ctx.beginPath();
        ctx.arc(x, y, 12, 0, Math.PI * 2);
        ctx.fill();
      });

      // Draw junction nodes
      ctx.fillStyle = "rgba(34, 197, 94, 0.3)";
      nodes.forEach((node) => {
        if (node.type === "junction") {
          ctx.beginPath();
          ctx.arc(node.x, node.y, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      animationFrameId = requestAnimationFrame(drawPCB);
    };

    const resizeObserver = new ResizeObserver(() => {
      resizeCanvas();
    });
    
    if (canvas.parentElement) {
      resizeObserver.observe(canvas.parentElement);
    }
    
    window.addEventListener("resize", resizeCanvas);
    
    // Initial resize with a small delay to ensure container is sized
    const startAnimation = () => {
      resizeCanvas();
      if (width > 0 && height > 0) {
        drawPCB();
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

export default CircuitBackground3;

