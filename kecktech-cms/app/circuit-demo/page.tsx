"use client";

import React from "react";
import CircuitBackground16 from "@/components/ui/CircuitBackground16";

export default function CircuitDemoPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-2 text-center">
          Circuit Background
        </h1>
        <p className="text-center text-gray-400 mb-8">
          Animated circuit background with electricity balls
        </p>

        <div className="relative border-2 border-gray-700 rounded-lg overflow-hidden" style={{ height: "600px" }}>
          <div className="absolute inset-0">
            <CircuitBackground16 />
          </div>
        </div>

        <div className="mt-8 p-6 bg-gray-900 rounded-lg border border-gray-800">
          <h2 className="text-2xl font-bold mb-4">Circuit Background 16</h2>
          <p className="text-gray-300 mb-4">
            3 lines per side, different straight lengths, mixed turn directions, 40px radius, 4 balls
          </p>
          <div className="bg-gray-800 p-4 rounded font-mono text-sm">
            <div className="text-green-400">// To use this background:</div>
            <div className="text-gray-300 mt-2">
              <div>1. Import: import CircuitBackground16 from "@/components/ui/CircuitBackground16";</div>
              <div>2. Replace AnimatedBackground in app/layout.tsx</div>
              <div>3. Component name: CircuitBackground16</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

