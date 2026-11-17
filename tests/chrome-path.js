'use strict';

const fs = require('fs');
const platform = process.platform;
const candidates = [
  process.env.CHROME_PATH,
  platform === 'win32' && 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  platform === 'win32' && 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  platform === 'win32' && process.env.LOCALAPPDATA && `${process.env.LOCALAPPDATA}/Google/Chrome/Application/chrome.exe`,
  platform === 'win32' && 'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  platform === 'win32' && 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  platform === 'darwin' && '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  platform === 'darwin' && '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser'
].filter(Boolean);

const chromePath = candidates.find((candidate) => {
  try { return fs.existsSync(candidate); } catch (error) { return false; }
});

if (!chromePath) {
  console.error('Chrome/Edge not found. Install Chrome or set CHROME_PATH to its executable.');
  process.exit(2);
}

module.exports = chromePath;
