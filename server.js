const { spawn, exec } = require('child_process');
const path = require('path');

console.log('🚀 DrowsyGuard AI is starting...');
console.log('👉 Dashboard: http://localhost:3000');
console.log('👉 System is running in background mode.');

// 1. Start FastAPI Backend (Silenced)
const fastapi = spawn('python', ['-m', 'uvicorn', 'src.api_server:app', '--host', '127.0.0.1', '--port', '8001', '--log-level', 'warning'], {
  stdio: 'inherit', // Completely silence output
  shell: true
});

// 2. Start Next.js Frontend (Silenced)
const nextjs = spawn('npm', ['run', 'dev'], {
  cwd: path.join(__dirname, 'ui'),
  stdio: 'inherit', // Completely silence output
  shell: true
});

const cleanup = () => {
  // Silent cleanup
  if (process.platform === 'win32') {
    // Kill the processes silently
    exec(`taskkill /F /T /PID ${fastapi.pid}`, () => {});
    exec(`taskkill /F /T /PID ${nextjs.pid}`, () => {});
  } else {
    fastapi.kill();
    nextjs.kill();
  }
  
  setTimeout(() => process.exit(), 500);
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

// Prevent the script from exiting immediately
setInterval(() => {}, 1000);
