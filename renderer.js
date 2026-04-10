const { ipcRenderer } = require('electron');

const dropZone = document.getElementById('drop-zone');
const progressContainer = document.getElementById('progress-container');
const progressBar = document.getElementById('progress-bar');
const progressPercent = document.getElementById('progress-percent');
const statusMessage = document.getElementById('status-message');

function showMsg(msg, isError = false) {
    statusMessage.textContent = msg;
    statusMessage.className = `status-message ${isError ? 'error' : 'success'}`;
    setTimeout(() => {
        statusMessage.classList.add('hidden');
    }, 3000);
}

// Drag and Drop Events
dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('drag-active');
});

dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('drag-active');
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-active');

    const files = Array.from(e.dataTransfer.files);
    const validFile = files.find(f => f.name.endsWith('.7z') || f.name.endsWith('.rar'));

    if (!validFile) {
        showMsg('Please drop a valid .rar or .7z file.', true);
        return;
    }

    const electron = require('electron');
    const webUtils = electron.webUtils;

    let filePath = validFile.path;
    if (!filePath && webUtils) {
        filePath = webUtils.getPathForFile(validFile);
    }

    if (!filePath) {
        showMsg('Error: Cannot determine the local file path.', true);
        return;
    }

    // Reset UI
    progressContainer.classList.remove('hidden');
    statusMessage.classList.add('hidden');
    progressBar.style.width = '0%';
    progressPercent.textContent = '0%';

    // Send to main process
    ipcRenderer.send('extract-file', filePath);
});

// IPC listeners
ipcRenderer.on('extraction-started', () => {
    progressContainer.classList.remove('hidden');
    statusMessage.classList.add('hidden');
    progressBar.style.width = '0%';
    progressPercent.textContent = '0%';
});

ipcRenderer.on('extract-progress', (event, percent) => {
    if (percent !== undefined) {
        progressBar.style.width = `${percent}%`;
        progressPercent.textContent = `${Math.round(percent)}%`;
    }
});

ipcRenderer.on('extract-done', () => {
    progressContainer.classList.add('hidden');
    showMsg('Extraction completed successfully!');
});

ipcRenderer.on('extract-error', (event, errorMsg) => {
    progressContainer.classList.add('hidden');
    showMsg(`Extraction failed: ${errorMsg}`, true);
});
