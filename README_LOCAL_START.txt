CWM Bid Automation Portal - Local Start

1. Open PowerShell in this folder.
2. Run: pnpm install
3. Run: .\start-dev-windows.ps1
   OR double-click START_BID_APP.bat
4. Open: http://localhost:3000

This patched version removes the broken analytics script, prevents OAuth login URL errors, and creates a local development user so the dashboard and bid screens can run without setting up OAuth first.
