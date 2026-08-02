# Auto Downloads Sorter

An automatic, background file-sorting application for Windows that organizes your `Downloads` folder in real-time. Featuring a C# System Tray app, Windows Toast notifications, Node.js sorting engine, and an Electron dashboard.

![Windows 10/11 Compatible](https://img.shields.io/badge/OS-Windows%2010%2F11-blue)
![Node.js](https://img.shields.io/badge/Node.js-18%2B-green)
![License](https://img.shields.io/badge/License-MIT-purple)

---

## 🌟 Features

- **Automated Real-Time Sorting:** Automatically monitors `C:\Users\faiza\Downloads` (or your user downloads directory) in the background.
- **Categorized Subfolders:** Automatically sorts files into clean categories:
  - **`documents`**: PDF, Word (`.doc`, `.docx`), Text (`.txt`, `.rtf`, `.md`), Spreadsheets (`.xls`, `.xlsx`, `.ods`, `.csv`), etc.
  - **`image`**: PNG, JPG, GIF, WebP, SVG, PSD, HEIC, etc.
  - **`apk`**: Android installer packages (`.apk`, `.xapk`, `.apks`, `.apkm`).
  - **`videos`**: MP4, MKV, AVI, MOV, WEBM, etc.
  - **`audio`**: MP3, WAV, FLAC, AAC, OGG, etc.
  - **`archives`**: ZIP, RAR, 7Z, TAR, GZ, ISO, etc.
  - **`executables`**: EXE, MSI, BAT, PS1, etc.
  - **`code`**: JS, TS, Python, HTML, CSS, C++, JSON, YAML, etc.
  - **Dynamic Extension Fallback**: Any unlisted file format gets its own folder named after its file extension (e.g., `.blend`, `.stl`, `.torrent`).
- **System Tray App:** Runs 24/7 in your Windows app tray next to the system clock with a right-click context menu.
- **Native Notifications:** Displays Windows toast balloon notifications when files are auto-sorted.
- **In-Progress Download Handling:** Ignores temporary browser downloads (`.crdownload`, `.part`, `.tmp`, `.download`).
- **Modern Dashboard:** Built with Electron, offering real-time stats, category metrics, and activity history log.

---

## 🛠️ Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Faizan-ahmad-prog/AutoDownloadsSorter.git
   cd AutoDownloadsSorter
   ```

2. **Install Node.js dependencies:**
   ```bash
   npm install
   ```

3. **Compile C# System Tray App (Windows):**
   ```cmd
   C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe /target:winexe /out:DownloadsSorterTray.exe /r:System.dll,System.Windows.Forms.dll,System.Drawing.dll DownloadsSorterTray.cs
   ```
   *(Note: `.NET Framework` comes pre-installed on Windows 10/11).*

4. **Launch Application Options:**
   - **System Tray Mode (24/7 Background with Toast Notifications):**
     Double-click `DownloadsSorterTray.exe` or run:
     ```cmd
     Start-AutoSorter.bat
     ```
   - **Control Dashboard GUI:**
     ```bash
     npm start
     ```

5. **(Optional) Add to Windows Startup:**
   To automatically launch the app when Windows boots:
   ```powershell
   powershell -ExecutionPolicy Bypass -File add-to-startup.ps1
   ```

---

## 📂 Project Structure

```
AutoDownloadsSorter/
├── assets/                  # Icons and visual assets
├── DownloadsSorterTray.cs   # C# System Tray application source
├── sorter.js                # Core sorting & file categorization engine
├── sorter-cli.js            # CLI interface for sorter engine
├── main.js                  # Electron main process
├── index.html               # Control dashboard UI
├── renderer.js              # Dashboard interaction logic
├── styles.css               # Modern glassmorphism dark mode styles
└── package.json             # Node.js project manifest
```

---

## 📜 License

MIT License. Free to use and modify!
