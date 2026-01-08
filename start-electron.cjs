const { spawn } = require('child_process');
const electron = require('electron');

console.log('Starting Electron with sanitized environment...');

// Ensure 'electron' is the path string. If running via node, it should be.
// If running inside electron, this might be an object, so we handle that.
const electronPath = typeof electron === 'string' ? electron : require('electron/index.js');

const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;

const child = spawn(electronPath, ['.'], {
    stdio: 'inherit',
    env
});

child.on('close', (code) => {
    console.log(`Electron process exited with code ${code}`);
    process.exit(code);
});
