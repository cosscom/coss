#!/usr/bin/env node

/**
 * Setup script for COSS project environment files
 * Cross-platform compatible (Windows/macOS/Linux)
 * 
 * Usage: node setup-env.js
 * Or: pnpm setup
 */

const fs = require('fs');
const path = require('path');

const envConfigs = [
  {
    path: 'apps/www/.env.local',
    content: `# apps/www/.env.local
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_COSS_UI_URL=http://localhost:4000/ui
`,
    port: 3000
  },
  {
    path: 'apps/ui/.env.local',
    content: `# apps/ui/.env.local
NEXT_PUBLIC_APP_URL=http://localhost:4000/ui
NEXT_PUBLIC_COSS_URL=http://localhost:3000
NEXT_PUBLIC_ORIGIN_URL=http://localhost:4001
`,
    port: 4000
  },
  {
    path: 'apps/origin/.env.local',
    content: `# apps/origin/.env.local
NEXT_PUBLIC_APP_URL=http://localhost:4001/origin
NEXT_PUBLIC_COSS_URL=http://localhost:3000
NEXT_PUBLIC_COSS_UI_URL=http://localhost:4000/ui
`,
    port: 4001
  }
];

console.log('Setting up coss project environment files...\n');

let success = 0;
let failed = 0;

envConfigs.forEach(({ path: filePath, content, port }) => {
  try {
    const fullPath = path.join(process.cwd(), filePath);
    const dir = path.dirname(fullPath);
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    // Write the file
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`✓ Created ${filePath} (Port ${port})`);
    success++;
  } catch (error) {
    console.error(`✗ Failed to create ${filePath}:`, error.message);
    failed++;
  }
});

console.log('\n' + '='.repeat(50));
if (failed === 0) {
  console.log('All environment files created successfully!\n');
  console.log('Summary:');
  console.log('  - apps/www/.env.local (Port 3000)');
  console.log('  - apps/ui/.env.local (Port 4000)');
  console.log('  - apps/origin/.env.local (Port 4001)\n');
  console.log('You can now start your project with: pnpm dev');
  process.exit(0);
} else {
  console.log(`Setup completed with ${failed} error(s)`);
  console.log(`Success: ${success} | Failed: ${failed}`);
  process.exit(1);
}
