const electron = require('electron');
console.log('Running with execPath:', process.execPath);
console.log('process.versions:', process.versions);
console.log('ELECTRON_RUN_AS_NODE:', process.env.ELECTRON_RUN_AS_NODE);
console.log('electron export type:', typeof electron);
console.log('electron export value:', electron);
console.log('require.resolve("electron"):', require.resolve('electron'));
console.log('Electron module keys:', Object.keys(electron));
try {
    console.log('app is:', electron.app);
} catch (e) {
    console.log('Error accessing app:', e.message);
}
