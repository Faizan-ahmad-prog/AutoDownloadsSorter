const fs = require('fs-extra');
const path = require('path');
const os = require('os');
const chokidar = require('chokidar');
const mime = require('mime-types');

// Default target folder is user's Downloads folder
const DOWNLOADS_DIR = path.join(os.homedir(), 'Downloads');

// Temporary download extensions to ignore while browser download is in progress
const TEMP_EXTENSIONS = [
  '.crdownload',
  '.part',
  '.download',
  '.opdownload',
  '.tmp',
  '.idm',
  '.filepart',
  '.utorrent',
  '.qtorrent'
];

// Predefined file extension to folder name mappings
// Standard requested folders: image, apk, videos, documents
const DEFAULT_CATEGORY_MAPPINGS = {
  image: [
    '.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.ico', 
    '.tiff', '.tif', '.psd', '.ai', '.heic', '.avif', '.eps', '.raw', '.dng'
  ],
  apk: [
    '.apk', '.xapk', '.apks', '.apkm'
  ],
  videos: [
    '.mp4', '.mkv', '.avi', '.mov', '.wmv', '.flv', '.webm', '.m4v', 
    '.3gp', '.mpeg', '.mpg', '.ts', '.vob'
  ],
  documents: [
    '.txt', '.doc', '.docx', '.pdf', '.rtf', '.md', '.odt', '.log', 
    '.csv', '.tex', '.epub', '.mobi', '.wpd', '.wps',
    '.xls', '.xlsx', '.ods', '.tsv', '.numbers', '.xlsm'
  ],
  audio: [
    '.mp3', '.wav', '.aac', '.flac', '.ogg', '.m4a', '.wma', '.mid', 
    '.midi', '.opus', '.alac'
  ],
  archives: [
    '.zip', '.rar', '.7z', '.tar', '.gz', '.bz2', '.iso', '.xz', '.tgz', '.cab'
  ],
  executables: [
    '.exe', '.msi', '.bat', '.cmd', '.ps1', '.vbs', '.reg', '.appimage'
  ],
  presentations: [
    '.ppt', '.pptx', '.odp', '.key'
  ],
  code: [
    '.js', '.jsx', '.ts', '.tsx', '.html', '.css', '.py', '.json', 
    '.cpp', '.c', '.h', '.java', '.cs', '.php', '.rb', '.go', '.rs', 
    '.sql', '.sh', '.xml', '.yaml', '.yml'
  ],
  fonts: [
    '.ttf', '.otf', '.woff', '.woff2', '.eot'
  ],
  '3d_models': [
    '.stl', '.obj', '.fbx', '.blend', '.3ds', '.dae', '.gltf', '.glb'
  ]
};

class DownloadsSorter {
  constructor(options = {}) {
    this.downloadsDir = options.downloadsDir || DOWNLOADS_DIR;
    this.customMappings = options.customMappings || DEFAULT_CATEGORY_MAPPINGS;
    this.enabled = true;
    this.watcher = null;
    this.onFileMovedCallback = options.onFileMovedCallback || (() => {});
    this.history = [];
    this.stats = {
      totalMoved: 0,
      categoryCounts: {}
    };
    
    this.processingFiles = new Set();

    // Automatically migrate any existing 'text' or 'spreadsheets' folders to 'documents'
    this.migrateLegacyFoldersToDocuments();
  }

  async migrateLegacyFoldersToDocuments() {
    const legacyFolders = ['text', 'spreadsheets'];
    for (const legacyFolder of legacyFolders) {
      try {
        const oldFolder = path.join(this.downloadsDir, legacyFolder);
        const newDocsFolder = path.join(this.downloadsDir, 'documents');

        if (await fs.pathExists(oldFolder)) {
          await fs.ensureDir(newDocsFolder);
          const files = await fs.readdir(oldFolder);
          for (const file of files) {
            const src = path.join(oldFolder, file);
            const dest = await this.getUniqueFilePath(newDocsFolder, file);
            await fs.move(src, dest, { overwrite: false });
          }
          // Remove empty old folder if possible
          const remaining = await fs.readdir(oldFolder);
          if (remaining.length === 0) {
            await fs.remove(oldFolder);
          }
        }
      } catch (e) {
        console.error(`Error migrating ${legacyFolder} folder to documents:`, e);
      }
    }
  }

  /**
   * Determine the target subfolder name for a given file name
   */
  getCategoryFolder(filename) {
    const ext = path.extname(filename).toLowerCase();
    if (!ext) return 'other';

    // 1. Check mapped extensions
    for (const [folderName, extList] of Object.entries(this.customMappings)) {
      if (extList.includes(ext)) {
        return folderName;
      }
    }

    // 2. Check MIME type fallback
    const mimeType = mime.lookup(filename);
    if (mimeType) {
      if (mimeType.startsWith('image/')) return 'image';
      if (mimeType.startsWith('video/')) return 'videos';
      if (mimeType.startsWith('audio/')) return 'audio';
      if (mimeType.startsWith('text/')) return 'documents';
      if (mimeType.includes('pdf')) return 'documents';
      if (mimeType.includes('zip') || mimeType.includes('compressed')) return 'archives';
    }

    // 3. Dynamic folder creation for any unlisted/other extension!
    const cleanExt = ext.replace('.', '').toLowerCase();
    return cleanExt || 'other';
  }

  /**
   * Check if file is temporary download file or system file to ignore
   */
  isIgnoredFile(filename) {
    const ext = path.extname(filename).toLowerCase();
    
    if (TEMP_EXTENSIONS.includes(ext)) return true;
    if (filename.startsWith('Unconfirmed ') && filename.endsWith('.download')) return true;
    if (filename.startsWith('~$') || filename === 'desktop.ini' || filename === 'Thumbs.db' || filename.startsWith('.')) return true;

    return false;
  }

  /**
   * Wait until file is fully written and unlocked by browser
   */
  async waitForFileReady(filePath, maxRetries = 20, delayMs = 1000) {
    for (let i = 0; i < maxRetries; i++) {
      try {
        if (!await fs.pathExists(filePath)) {
          return false;
        }

        const fd = await fs.open(filePath, 'r+');
        await fs.close(fd);
        
        await new Promise(r => setTimeout(r, 500));
        
        const size1 = (await fs.stat(filePath)).size;
        await new Promise(r => setTimeout(r, 800));
        const size2 = (await fs.stat(filePath)).size;

        if (size1 === size2 && size1 > 0) {
          return true;
        }
      } catch (err) {
        // Retry
      }
      await new Promise(r => setTimeout(r, delayMs));
    }
    return false;
  }

  /**
   * Get unique destination path to prevent overwriting existing files
   */
  async getUniqueFilePath(destFolder, originalName) {
    let targetPath = path.join(destFolder, originalName);
    if (!await fs.pathExists(targetPath)) {
      return targetPath;
    }

    const ext = path.extname(originalName);
    const baseName = path.basename(originalName, ext);
    let counter = 1;

    while (await fs.pathExists(targetPath)) {
      targetPath = path.join(destFolder, `${baseName} (${counter})${ext}`);
      counter++;
    }

    return targetPath;
  }

  /**
   * Main method to sort a single file
   */
  async processFile(filePath) {
    const filename = path.basename(filePath);

    if (this.processingFiles.has(filePath)) return null;
    if (this.isIgnoredFile(filename)) return null;

    try {
      const stat = await fs.stat(filePath);
      if (!stat.isFile()) return null;

      if (path.dirname(filePath) !== this.downloadsDir) return null;

      this.processingFiles.add(filePath);

      const isReady = await this.waitForFileReady(filePath);
      if (!isReady) {
        this.processingFiles.delete(filePath);
        return null;
      }

      // Target folder name (image, apk, videos, documents, or dynamic extension)
      const folderName = this.getCategoryFolder(filename);
      const destFolder = path.join(this.downloadsDir, folderName);

      await fs.ensureDir(destFolder);

      const destFilePath = await this.getUniqueFilePath(destFolder, filename);
      const finalFileName = path.basename(destFilePath);

      await fs.move(filePath, destFilePath, { overwrite: false });

      this.stats.totalMoved++;
      this.stats.categoryCounts[folderName] = (this.stats.categoryCounts[folderName] || 0) + 1;

      const record = {
        id: Date.now() + Math.random().toString(36).substr(2, 4),
        fileName: finalFileName,
        originalName: filename,
        folderName: folderName,
        sourcePath: filePath,
        destPath: destFilePath,
        timestamp: new Date().toISOString()
      };

      this.history.unshift(record);
      if (this.history.length > 200) this.history.pop();

      if (this.onFileMovedCallback) {
        this.onFileMovedCallback(record);
      }

      this.processingFiles.delete(filePath);
      return record;
    } catch (err) {
      console.error(`Error processing file ${filename}:`, err);
      this.processingFiles.delete(filePath);
      return null;
    }
  }

  /**
   * Organizes all loose files currently sitting in Downloads folder
   */
  async sortExistingDownloads() {
    try {
      await this.migrateLegacyFoldersToDocuments();
      const files = await fs.readdir(this.downloadsDir);
      const results = [];

      for (const item of files) {
        const fullPath = path.join(this.downloadsDir, item);
        const stat = await fs.stat(fullPath);
        if (stat.isFile()) {
          const result = await this.processFile(fullPath);
          if (result) results.push(result);
        }
      }

      return results;
    } catch (err) {
      console.error('Error sorting existing downloads:', err);
      return [];
    }
  }

  /**
   * Start live watching Downloads directory
   */
  startWatching() {
    if (this.watcher) return;
    this.enabled = true;

    this.watcher = chokidar.watch(this.downloadsDir, {
      depth: 0,
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: 1500,
        pollInterval: 500
      }
    });

    this.watcher.on('add', async (filePath) => {
      if (!this.enabled) return;
      await this.processFile(filePath);
    });

    console.log(`[AutoDownloadsSorter] Started watching ${this.downloadsDir}`);
  }

  /**
   * Stop live watching
   */
  stopWatching() {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }
    this.enabled = false;
    console.log('[AutoDownloadsSorter] Stopped watching Downloads folder');
  }
}

module.exports = DownloadsSorter;
