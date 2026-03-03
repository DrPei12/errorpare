#!/usr/bin/env node

// ErrorPare - Postinstall Script

import { spawn } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const CONFIG_DIR = join(homedir(), '.errorpare');
const CONFIG_FILE = join(CONFIG_DIR, 'config.json');

console.log('');
console.log('🦞 ErrorPare Postinstall');
console.log('════════════════════════════════════════');
console.log('');

if (existsSync(CONFIG_FILE)) {
  console.log('✅ Configuration already exists at:', CONFIG_FILE);
  console.log('');
  console.log('Skip setup wizard. Run manually anytime:');
  console.log('  errorpare init --analyze');
  console.log('');
  process.exit(0);
}

console.log('🎉 ErrorPare v2.0.0 installed successfully!');
console.log('');
console.log('Would you like to run the setup wizard now? (y/n) [default: y]');
console.log('');
console.log('This will:');
console.log('  • Create ~/.errorpare/config.json');
console.log('  • Optionally configure LLM for AI analysis');
console.log('  • Set up AI tool integration files');
console.log('');

process.stdin.setRawMode?.(true);
process.stdin.resume();
process.stdin.setEncoding('utf8');

let input = '';

process.stdin.on('data', (key) => {
  if (key === '\u0003') {
    console.log('\nSetup skipped. Run anytime: errorpare init --analyze\n');
    process.exit(0);
  }
  
  if (key === '\r' || key === '\n') {
    process.stdin.setRawMode?.(false);
    process.stdin.pause();
    
    const answer = input.trim().toLowerCase() || 'y';
    
    if (answer === 'y' || answer === 'yes') {
      console.log('\nStarting setup wizard...\n');
      const child = spawn('errorpare', ['init'], { stdio: 'inherit', shell: true });
      child.on('close', (code) => {
        if (code === 0) {
          console.log('\n✅ Setup complete!\n');
          console.log('Quick start:');
          console.log('  errorpare run "npm run build"           # Basic compression');
          console.log('  errorpare run "npm run build" --analyze # With AI analysis\n');
        }
        process.exit(code);
      });
    } else {
      console.log('\nSetup skipped. Run anytime: errorpare init --analyze\n');
      console.log('Quick start:');
      console.log('  errorpare run "npm run build"\n');
      process.exit(0);
    }
  } else {
    input += key;
  }
});

setTimeout(() => {
  console.log('\n⏱️  No input received. Setup skipped.\n');
  console.log('Run anytime: errorpare init --analyze\n');
  process.exit(0);
}, 10000);
