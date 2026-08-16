// Fix Prisma 7 client for Next.js/Turbopack compatibility
// This script creates the necessary structure for Prisma client to work with Turbopack

const fs = require('fs');
const path = require('path');

const prismaClientPath = path.join(__dirname, '../node_modules/@prisma/client');
const prismaOutputPath = path.join(__dirname, '../node_modules/.prisma/client');
const generatedClientPath = path.join(__dirname, '../node_modules/.prisma/client');

// Ensure .prisma/client directory exists
if (!fs.existsSync(prismaOutputPath)) {
  fs.mkdirSync(prismaOutputPath, { recursive: true });
}

// The issue: @prisma/client/index.js requires .prisma/client/default
// But .prisma/client/index.js also requires .prisma/client/default (circular!)
// Solution: Create default.js that exports from the generated index.js
// But we need to break the cycle by not requiring .prisma/client/default

// Simple direct export - let Node.js handle the circular dependency
// Prisma 7 has known issues with Turbopack. This is a workaround.
const defaultJsContent = `// Direct export from @prisma/client
// Note: This creates a circular dependency, but Node.js should handle it
// If this doesn't work, consider downgrading to Prisma 6
try {
  module.exports = require('@prisma/client');
} catch (e) {
  // Fallback: export empty object and let it be populated later
  console.warn('Prisma client circular dependency detected, using fallback');
  module.exports = {};
  // Try to populate it
  try {
    const Module = require('module');
    const originalRequire = Module.prototype.require;
    Module.prototype.require = function(id) {
      if (id === '@prisma/client' && Object.keys(module.exports).length === 0) {
        const result = originalRequire.apply(this, arguments);
        Object.assign(module.exports, result);
        return result;
      }
      return originalRequire.apply(this, arguments);
    };
  } catch (e2) {
    // Ignore
  }
}
`;

const defaultJsDest = path.join(prismaOutputPath, 'default.js');
fs.writeFileSync(defaultJsDest, defaultJsContent);
console.log('✓ Created default.js with direct PrismaClient export');

// Also ensure index.js exists and re-exports properly
const indexJsContent = `// Re-export from generated Prisma client
module.exports = require('../@prisma/client');
module.exports.PrismaClient = require('../@prisma/client').PrismaClient;
`;

const indexJsDest = path.join(prismaOutputPath, 'index.js');
if (!fs.existsSync(indexJsDest)) {
  fs.writeFileSync(indexJsDest, indexJsContent);
  console.log('✓ Created index.js re-export');
}

console.log('Prisma client fix completed');

