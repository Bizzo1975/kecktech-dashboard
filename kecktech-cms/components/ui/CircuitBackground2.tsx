"use client";

import React, { useEffect, useRef } from "react";

interface CircuitNode {
  x: number;
  y: number;
  connections: number[];
  angle: number;
}

interface EnergyPulse {
  from: number;
  to: number;
  progress: number;
  speed: number;
  size: number;
}

const CircuitBackground2: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let nodes: CircuitNode[] = [];
    let pulses: EnergyPulse[] = [];
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
      pulses = [];
      
      // Create organic circuit nodes
      const nodeCount = Math.floor((width * height) / 15000);
      
      for (let i = 0; i < nodeCount; i++) {
        nodes.push({
          x: Math.random() * width,
          y: Math.random() * height,
          connections: [],
          angle: Math.random() * Math.PI * 2,
        });
      }

      // Create organic connections
      nodes.forEach((node, i) => {
        const nearbyNodes: { index: number; distance: number }[] = [];
        
        nodes.forEach((other, j) => {
          if (i !== j) {
            const dx = other.x - node.x;
            const dy = other.y - node.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < 200) {
              nearbyNodes.push({ index: j, distance });
            }
          }
        });

        // Connect to 2-4 nearest nodes
        nearbyNodes.sort((a, b) => a.distance - b.distance);
        const connectionCount = Math.min(2 + Math.floor(Math.random() * 3), nearbyNodes.length);
        
        for (let k = 0; k < connectionCount; k++) {
          const targetIndex = nearbyNodes[k].index;
          if (!node.connections.includes(targetIndex)) {
            node.connections.push(targetIndex);
            if (!nodes[targetIndex].connections.includes(i)) {
              nodes[targetIndex].connections.push(i);
            }
          }
        }
      });

      // Create initial energy pulses
      for (let i = 0; i < 20; i++) {
        const from = Math.floor(Math.random() * nodes.length);
        const connections = nodes[from].connections;
        if (connections.length > 0) {
          const to = connections[Math.floor(Math.random() * connections.length)];
          pulses.push({
            from,
            to,
            progress: Math.random(),
            speed: 0.003 + Math.random() * 0.008,
            size: 3 + Math.random() * 4,
          });
        }
      }
    };

    const drawCircuit = () => {
      if (width <= 0 || height <= 0 || nodes.length === 0) {
        animationFrameId = requestAnimationFrame(drawCircuit);
        return;
      }

      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = "rgba(0, 0, 0, 0.95)";
      ctx.fillRect(0, 0, width, height);

      // Draw organic circuit paths with gradient
      nodes.forEach((node) => {
        node.connections.forEach((connIndex) => {
          const target = nodes[connIndex];
          const dx = target.x - node.x;
          const dy = target.y - node.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          const gradient = ctx.createLinearGradient(node.x, node.y, target.x, target.y);
          gradient.addColorStop(0, "rgba(59, 130, 246, 0.15)");
          gradient.addColorStop(0.5, "rgba(147, 51, 234, 0.2)");
          gradient.addColorStop(1, "rgba(59, 130, 246, 0.15)");
          
          ctx.strokeStyle = gradient;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(node.x, node.y);
          ctx.lineTo(target.x, target.y);
          ctx.stroke();
        });
      });

      // Update and draw energy pulses
      pulses.forEach((pulse) => {
        pulse.progress += pulse.speed;
        
        if (pulse.progress >= 1) {
          const from = pulse.to;
          const connections = nodes[from].connections;
          if (connections.length > 0) {
            const to = connections[Math.floor(Math.random() * connections.length)];
            pulse.from = from;
            pulse.to = to;
            pulse.progress = 0;
            pulse.speed = 0.003 + Math.random() * 0.008;
            pulse.size = 3 + Math.random() * 4;
          } else {
            pulse.progress = 0;
          }
        }

        const fromNode = nodes[pulse.from];
        const toNode = nodes[pulse.to];
        const x = fromNode.x + (toNode.x - fromNode.x) * pulse.progress;
        const y = fromNode.y + (toNode.y - fromNode.y) * pulse.progress;

        // Draw energy pulse with glow
        const pulseSize = pulse.size * (1 + Math.sin(pulse.progress * Math.PI * 4) * 0.3);
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, pulseSize * 3);
        gradient.addColorStop(0, "rgba(59, 130, 246, 1)");
        gradient.addColorStop(0.3, "rgba(147, 51, 234, 0.8)");
        gradient.addColorStop(0.6, "rgba(59, 130, 246, 0.4)");
        gradient.addColorStop(1, "rgba(59, 130, 246, 0)");
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, pulseSize * 3, 0, Math.PI * 2);
        ctx.fill();

        // Draw core pulse
        ctx.fillStyle = "rgba(147, 51, 234, 0.9)";
        ctx.beginPath();
        ctx.arc(x, y, pulseSize, 0, Math.PI * 2);
        ctx.fill();
      });

      // Draw nodes with glow
      nodes.forEach((node) => {
        const gradient = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, 6);
        gradient.addColorStop(0, "rgba(59, 130, 246, 0.8)");
        gradient.addColorStop(0.5, "rgba(147, 51, 234, 0.4)");
        gradient.addColorStop(1, "rgba(59, 130, 246, 0)");
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(node.x, node.y, 6, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "rgba(59, 130, 246, 0.6)";
        ctx.beginPath();
        ctx.arc(node.x, node.y, 2, 0, Math.PI * 2);
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
    
    // Initial resize with a small delay to ensure container is sized
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

export default CircuitBackground2;

