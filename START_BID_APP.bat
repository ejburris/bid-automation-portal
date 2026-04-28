@echo off
cd /d %~dp0
set NODE_ENV=development
set LOCAL_DEV_AUTH=true
pnpm exec tsx watch server/_core/index.ts
pause
