"use client";

import React, { useEffect, useRef } from "react";

interface Node {
  x: number;
  y: number;
  connections: number[];
}

interface Signal {
  from: number;
  to: number;
  progress: number;
  speed: number;
}

const CircuitBackground1: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let nodes: Node[] = [];
    let signals: Signal[] = [];
    let animationFrameId: number;
    let width = canvas.offsetWidth || window.innerWidth;
    let height = canvas.offsetHeight || window.innerHeight;
    const gridSize = 80;

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
      signals = [];
      
      // Create grid-based nodes
      const cols = Math.ceil(width / gridSize);
      const rows = Math.ceil(height / gridSize);
      
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const x = col * gridSize + (row % 2 === 0 ? 0 : gridSize / 2);
          const y = row * gridSize;
          
          if (x < width && y < height) {
            const nodeIndex = nodes.length;
            nodes.push({
              x,
              y,
              connections: [],
            });

            // Connect to nearby nodes
            if (col > 0) {
              const leftNode = nodes.findIndex(n => 
                Math.abs(n.x - (x - gridSize)) < 5 && Math.abs(n.y - y) < 5
              );
              if (leftNode >= 0) {
                nodes[nodeIndex].connections.push(leftNode);
                nodes[leftNode].connections.push(nodeIndex);
              }
            }
            if (row > 0) {
              const topNode = nodes.findIndex(n => 
                Math.abs(n.x - x) < 5 && Math.abs(n.y - (y - gridSize)) < 5
              );
              if (topNode >= 0) {
                nodes[nodeIndex].connections.push(topNode);
                nodes[topNode].connections.push(nodeIndex);
              }
            }
          }
        }
      }

      // Create initial signals
      for (let i = 0; i < 15; i++) {
        const from = Math.floor(Math.random() * nodes.length);
        const connections = nodes[from].connections;
        if (connections.length > 0) {
          const to = connections[Math.floor(Math.random() * connections.length)];
          signals.push({
            from,
            to,
            progress: 0,
            speed: 0.005 + Math.random() * 0.01,
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

      // Draw circuit paths
      ctx.strokeStyle = "rgba(34, 197, 94, 0.2)";
      ctx.lineWidth = 1;
      nodes.forEach((node, i) => {
        node.connections.forEach((connIndex) => {
          if (connIndex > i && connIndex < nodes.length) {
            const target = nodes[connIndex];
            ctx.beginPath();
            ctx.moveTo(node.x, node.y);
            ctx.lineTo(target.x, target.y);
            ctx.stroke();
          }
        });
      });

      // Update and draw signals
      signals.forEach((signal, index) => {
        if (signal.from >= nodes.length || signal.to >= nodes.length) return;
        
        signal.progress += signal.speed;
        
        if (signal.progress >= 1) {
          // Signal reached destination, create new signal
          const from = signal.to;
          if (from < nodes.length) {
            const connections = nodes[from].connections;
            if (connections.length > 0) {
              const to = connections[Math.floor(Math.random() * connections.length)];
              if (to < nodes.length) {
                signal.from = from;
                signal.to = to;
                signal.progress = 0;
                signal.speed = 0.005 + Math.random() * 0.01;
              } else {
                signal.progress = 0;
              }
            } else {
              signal.progress = 0;
            }
          }
        }

        if (signal.from < nodes.length && signal.to < nodes.length) {
          const fromNode = nodes[signal.from];
          const toNode = nodes[signal.to];
          const x = fromNode.x + (toNode.x - fromNode.x) * signal.progress;
          const y = fromNode.y + (toNode.y - fromNode.y) * signal.progress;

          // Draw signal pulse
          const gradient = ctx.createRadialGradient(x, y, 0, x, y, 8);
          gradient.addColorStop(0, "rgba(34, 197, 94, 1)");
          gradient.addColorStop(0.5, "rgba(34, 197, 94, 0.5)");
          gradient.addColorStop(1, "rgba(34, 197, 94, 0)");
          
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(x, y, 8, 0, Math.PI * 2);
          ctx.fill();

          // Draw signal trail
          ctx.strokeStyle = `rgba(34, 197, 94, ${0.3 * (1 - signal.progress)})`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(fromNode.x, fromNode.y);
          ctx.lineTo(x, y);
          ctx.stroke();
        }
      });

      // Draw nodes
      ctx.fillStyle = "rgba(34, 197, 94, 0.4)";
      nodes.forEach((node) => {
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

export default CircuitBackground1;

