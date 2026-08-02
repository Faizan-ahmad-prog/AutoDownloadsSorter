using System;
using System.Drawing;
using System.Windows.Forms;
using System.IO;
using System.Diagnostics;
using System.Threading;
using System.Text.RegularExpressions;

namespace AutoDownloadsSorter
{
    static class Program
    {
        private static NotifyIcon trayIcon;
        private static FileSystemWatcher watcher;
        private static ContextMenu trayMenu;
        private static MenuItem statusItem;
        private static MenuItem toggleItem;
        private static bool isEnabled = true;
        private static string downloadsDir;
        private static string appDir;

        [STAThread]
        static void Main()
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);

            appDir = AppDomain.CurrentDomain.BaseDirectory;
            downloadsDir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.UserProfile), "Downloads");

            // Setup Tray Context Menu
            trayMenu = new ContextMenu();
            
            MenuItem titleItem = new MenuItem("Auto Downloads Sorter");
            titleItem.Enabled = false;
            trayMenu.MenuItems.Add(titleItem);
            trayMenu.MenuItems.Add("-");

            statusItem = new MenuItem("🟢 Status: Active");
            statusItem.Enabled = false;
            trayMenu.MenuItems.Add(statusItem);

            trayMenu.MenuItems.Add("⚡ Sort Existing Downloads Now", OnSortNow);
            trayMenu.MenuItems.Add("📂 Open Downloads Folder", OnOpenDownloads);
            trayMenu.MenuItems.Add("🖥️ Open Control Dashboard", OnOpenDashboard);
            trayMenu.MenuItems.Add("🔔 Send Test Notification", OnTestNotification);
            trayMenu.MenuItems.Add("-");

            toggleItem = new MenuItem("⏸️ Pause Auto-Sorter", OnToggleWatcher);
            trayMenu.MenuItems.Add(toggleItem);
            trayMenu.MenuItems.Add("❌ Exit Application", OnExit);

            // Initialize NotifyIcon
            trayIcon = new NotifyIcon();
            trayIcon.Text = "Auto Downloads Sorter (Active)";
            
            string icoPath = Path.Combine(appDir, "assets", "tray-icon.ico");
            if (File.Exists(icoPath))
            {
                try
                {
                    trayIcon.Icon = new Icon(icoPath);
                }
                catch
                {
                    trayIcon.Icon = SystemIcons.Application;
                }
            }
            else
            {
                trayIcon.Icon = SystemIcons.Application;
            }

            trayIcon.ContextMenu = trayMenu;
            trayIcon.Visible = true;

            trayIcon.DoubleClick += (s, e) => OnOpenDashboard(s, e);
            trayIcon.BalloonTipClicked += OnBalloonClicked;

            // Start FileSystemWatcher
            StartWatcher();

            // Run initial sort of existing downloads silently on launch
            ThreadPool.QueueUserWorkItem(state => RunSortCli("--all"));

            // Show startup notification
            trayIcon.ShowBalloonTip(3000, "Auto Downloads Sorter", "Running in your Windows System App Tray!", ToolTipIcon.Info);

            Application.Run();
        }

        private static string lastClickedPath = null;

        private static void OnBalloonClicked(object sender, EventArgs e)
        {
            if (!string.IsNullOrEmpty(lastClickedPath) && File.Exists(lastClickedPath))
            {
                Process.Start("explorer.exe", "/select,\"" + lastClickedPath + "\"");
            }
            else
            {
                Process.Start("explorer.exe", downloadsDir);
            }
        }

        private static void StartWatcher()
        {
            if (watcher != null) return;

            try
            {
                watcher = new FileSystemWatcher(downloadsDir);
                watcher.NotifyFilter = NotifyFilters.FileName | NotifyFilters.LastWrite;
                watcher.Filter = "*.*";
                watcher.IncludeSubdirectories = false;

                watcher.Created += OnFileCreated;
                watcher.Renamed += OnFileRenamed;
                watcher.EnableRaisingEvents = true;
            }
            catch (Exception ex)
            {
                Console.WriteLine("Watcher error: " + ex.Message);
            }
        }

        private static void OnFileCreated(object sender, FileSystemEventArgs e)
        {
            if (!isEnabled) return;
            ProcessIncomingFile(e.FullPath);
        }

        private static void OnFileRenamed(object sender, RenamedEventArgs e)
        {
            if (!isEnabled) return;
            ProcessIncomingFile(e.FullPath);
        }

        private static void ProcessIncomingFile(string filePath)
        {
            string fileName = Path.GetFileName(filePath);
            string ext = Path.GetExtension(filePath).ToLower();

            // Ignore temporary download extensions
            if (ext == ".crdownload" || ext == ".part" || ext == ".download" || ext == ".tmp" || ext == ".opdownload" || ext == ".idm")
                return;

            if (fileName.StartsWith("Unconfirmed ") && fileName.EndsWith(".download"))
                return;

            if (fileName.StartsWith("~$") || fileName == "desktop.ini" || fileName == "Thumbs.db")
                return;

            ThreadPool.QueueUserWorkItem(state =>
            {
                Thread.Sleep(1500); // Allow download completion lock release
                RunSortCli("\"" + filePath + "\"");
            });
        }

        private static void RunSortCli(string arg)
        {
            try
            {
                ProcessStartInfo psi = new ProcessStartInfo();
                psi.FileName = "node";
                psi.Arguments = "sorter-cli.js " + arg;
                psi.WorkingDirectory = appDir;
                psi.UseShellExecute = false;
                psi.CreateNoWindow = true;
                psi.RedirectStandardOutput = true;

                using (Process p = Process.Start(psi))
                {
                    string output = p.StandardOutput.ReadToEnd();
                    p.WaitForExit();

                    if (!string.IsNullOrEmpty(output))
                    {
                        if (output.Contains("\"status\":\"success\""))
                        {
                            Match mFile = Regex.Match(output, "\"fileName\":\"([^\"]+)\"");
                            Match mFolder = Regex.Match(output, "\"folderName\":\"([^\"]+)\"");
                            Match mDest = Regex.Match(output, "\"destPath\":\"([^\"]+)\"");
                            Match mCount = Regex.Match(output, "\"count\":(\\d+)");

                            if (mFile.Success && mFolder.Success)
                            {
                                string fileName = mFile.Groups[1].Value;
                                string folderName = mFolder.Groups[1].Value;
                                if (mDest.Success) lastClickedPath = mDest.Groups[1].Value.Replace("\\\\", "\\");

                                trayIcon.ShowBalloonTip(4000, "File Auto-Sorted 🚀", "Moved \"" + fileName + "\" to \"" + folderName + "\" folder", ToolTipIcon.Info);
                            }
                            else if (mCount.Success)
                            {
                                int count = int.Parse(mCount.Groups[1].Value);
                                if (count > 0)
                                {
                                    trayIcon.ShowBalloonTip(4000, "Downloads Organized 🚀", "Sorted " + count + " existing files in your Downloads folder!", ToolTipIcon.Info);
                                }
                            }
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine("CLI Run Error: " + ex.Message);
            }
        }

        private static void OnSortNow(object sender, EventArgs e)
        {
            ThreadPool.QueueUserWorkItem(state => RunSortCli("--all"));
        }

        private static void OnOpenDownloads(object sender, EventArgs e)
        {
            Process.Start("explorer.exe", downloadsDir);
        }

        private static void OnOpenDashboard(object sender, EventArgs e)
        {
            try
            {
                ProcessStartInfo psi = new ProcessStartInfo();
                psi.FileName = "cmd.exe";
                psi.Arguments = "/c npx electron .";
                psi.WorkingDirectory = appDir;
                psi.UseShellExecute = false;
                psi.CreateNoWindow = true;
                Process.Start(psi);
            }
            catch { }
        }

        private static void OnTestNotification(object sender, EventArgs e)
        {
            trayIcon.ShowBalloonTip(4000, "Auto Downloads Sorter 🔔", "System tray notifications are active & working!", ToolTipIcon.Info);
        }

        private static void OnToggleWatcher(object sender, EventArgs e)
        {
            isEnabled = !isEnabled;
            if (isEnabled)
            {
                statusItem.Text = "🟢 Status: Active";
                toggleItem.Text = "⏸️ Pause Auto-Sorter";
                trayIcon.Text = "Auto Downloads Sorter (Active)";
                if (watcher != null) watcher.EnableRaisingEvents = true;
                trayIcon.ShowBalloonTip(3000, "Auto Downloads Sorter", "Background monitoring resumed.", ToolTipIcon.Info);
            }
            else
            {
                statusItem.Text = "🟡 Status: Paused";
                toggleItem.Text = "▶️ Resume Auto-Sorter";
                trayIcon.Text = "Auto Downloads Sorter (Paused)";
                if (watcher != null) watcher.EnableRaisingEvents = false;
                trayIcon.ShowBalloonTip(3000, "Auto Downloads Sorter", "Background monitoring paused.", ToolTipIcon.Warning);
            }
        }

        private static void OnExit(object sender, EventArgs e)
        {
            if (trayIcon != null)
            {
                trayIcon.Visible = false;
                trayIcon.Dispose();
            }
            if (watcher != null)
            {
                watcher.Dispose();
            }
            Application.Exit();
        }
    }
}
