const { app, BrowserWindow, ipcMain, Tray, nativeImage, Menu } = require('electron');
const path = require('path');
const { extractFull } = require('node-7z');
const sevenBin = require('7zip-bin-full');
const { exec } = require('child_process');
const fs = require('fs');
const Jimp = require('jimp');

let mainWindow;
let tray = null;
let fileToExtract = null;
let progressFrames = [];
let defaultIcon = null;
let activeExtractions = 0;

app.dock.hide();

app.on('open-file', (event, filePath) => {
  event.preventDefault();
  if (app.isReady() && tray) {
    performExtraction(filePath);
  } else {
    fileToExtract = filePath;
  }
});

function getWindowPosition() {
  if (!tray) return { x: 0, y: 0 };
  const windowBounds = mainWindow.getBounds();
  const trayBounds = tray.getBounds();
  const x = Math.round(trayBounds.x + (trayBounds.width / 2) - (windowBounds.width / 2));
  const y = Math.round(trayBounds.y + trayBounds.height + 4);
  return { x, y };
}

function showWindow() {
  if (!mainWindow) return;
  const position = getWindowPosition();
  mainWindow.setPosition(position.x, position.y, false);
  mainWindow.show();
  mainWindow.focus();
}

function toggleWindow() {
  if (!mainWindow) return;
  if (mainWindow.isVisible()) mainWindow.hide();
  else showWindow();
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 320,
    height: 350,
    show: false,
    frame: false,
    resizable: false,
    transparent: true,
    vibrancy: 'popover',
    visualEffectState: 'active',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  mainWindow.loadFile('index.html');
  mainWindow.on('blur', () => mainWindow.hide());
}

async function initTrayIcons() {
  const iconBuffer = fs.readFileSync(path.join(__dirname, 'iconTemplate.png'));
  defaultIcon = nativeImage.createFromBuffer(iconBuffer);
  defaultIcon.setTemplateImage(true);

  for (let p = 0; p <= 100; p += 2) {
    const img = new Jimp(16, 16, 0x00000000);
    const c = 0x000000FF;
    const xc = 7.5;
    const yc = 7.5;
    const targetAngle = (p / 100) * Math.PI * 2;

    for (let x = 0; x < 16; x++) {
      for (let y = 0; y < 16; y++) {
        const dx = x - xc;
        const dy = y - yc;
        const dist = Math.sqrt(dx * dx + dy * dy);
        let angle = Math.atan2(dx, -dy);
        if (angle < 0) angle += Math.PI * 2;

        if (dist >= 5.5 && dist <= 7) {
          img.setPixelColor(c, x, y);
        } else if (dist < 4.5 && angle <= targetAngle) {
          img.setPixelColor(c, x, y);
        }
      }
    }
    const buffer = await img.getBufferAsync(Jimp.MIME_PNG);
    const nImg = nativeImage.createFromBuffer(buffer);
    nImg.setTemplateImage(true);
    progressFrames.push(nImg);
  }
}

app.whenReady().then(async () => {
  await initTrayIcons();

  tray = new Tray(defaultIcon);
  tray.setToolTip('ZipExtractor');

  tray.on('right-click', () => {
    const contextMenu = Menu.buildFromTemplate([
      { label: 'Quit ZipExtractor', click: () => app.quit() }
    ]);
    tray.popUpContextMenu(contextMenu);
  });

  tray.on('click', () => {
    toggleWindow();
  });

  createWindow();

  if (fileToExtract) {
    performExtraction(fileToExtract);
    fileToExtract = null;
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

function performExtraction(filePath) {
  activeExtractions++;
  const dirPath = path.dirname(filePath);
  const ext = path.extname(filePath);
  const baseName = path.basename(filePath, ext);
  const targetDir = path.join(dirPath, baseName);

  if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir);
  let hasError = false;

  let binPath = sevenBin.path7z;
  if (binPath.includes('app.asar')) {
    binPath = binPath.replace('app.asar', 'app.asar.unpacked');
  }

  const stream = extractFull(filePath, targetDir, {
    $bin: binPath,
    $progress: true
  });

  stream.on('progress', (progress) => {
    const percent = Math.min(100, Math.max(0, Math.round(progress.percent)));
    const frameIndex = Math.floor(percent / 2);
    if (progressFrames[frameIndex] && tray) {
      tray.setImage(progressFrames[frameIndex]);
      tray.setTitle(` ${percent}%`);
    }
    if (mainWindow && mainWindow.webContents) {
      mainWindow.webContents.send('extract-progress', progress.percent);
    }
  });

  stream.on('error', (err) => {
    hasError = true;
    if (tray) {
      tray.setImage(defaultIcon);
      tray.setTitle(' Error');
      setTimeout(() => tray.setTitle(''), 3000);
    }
    try { fs.rmSync(targetDir, { recursive: true, force: true }); } catch (e) { }

    activeExtractions--;
    if (activeExtractions === 0) setTimeout(() => app.quit(), 3000);
  });

  stream.on('end', () => {
    if (!hasError) {
      if (tray) {
        tray.setImage(defaultIcon);
        tray.setTitle('');
      }
      if (mainWindow && mainWindow.isVisible()) mainWindow.hide();

      activeExtractions--;
      if (activeExtractions === 0) setTimeout(() => app.quit(), 1000);
    }
  });
}

ipcMain.on('extract-file', (event, filePath) => {
  performExtraction(filePath);
});
