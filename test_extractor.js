const { add, extractFull } = require('node-7z');
const sevenBin = require('7zip-bin');
const path = require('path');
const fs = require('fs');

const binPath = sevenBin.path7za;
console.log('7za binary path:', binPath);

// Ensure the binary is executable (macOS issue sometimes)
fs.chmodSync(binPath, '755');

const destDir = path.join(__dirname, 'test_extraction_dir');
if (!fs.existsSync(destDir)) fs.mkdirSync(destDir);

const dummyFile = path.join(__dirname, 'test_file.txt');
fs.writeFileSync(dummyFile, 'hello world');
const archivePath = path.join(__dirname, 'test_archive.7z');

console.log('Testing extraction of nonexistent or corrupted archive...');
const unpack2 = extractFull('fake_file.rar', destDir, { $bin: binPath });

unpack2.on('data', (d) => console.log('data:', d));

unpack2.on('end', () => {
    console.log('unpack2 ended');
});

unpack2.on('error', (err) => {
    console.error('unpack2 error:', err);
});

console.log('Compressing...');
const pack = add(archivePath, dummyFile, { $bin: binPath });

pack.on('end', () => {
    console.log('Created test archive.');
    console.log('Extracting to:', destDir);
    const unpack = extractFull(archivePath, destDir, { $bin: binPath });

    unpack.on('end', () => {
        console.log('Extraction finished successfully. Contents of destDir:');
        console.log(fs.readdirSync(destDir));
    });

    unpack.on('error', (err) => {
        console.error('Extract error:', err);
    });
});

pack.on('error', err => console.error('Compress error:', err));
