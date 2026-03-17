const path = require('path');
const fs = require('fs');

// 이 파일(ecosystem.config.js)이 있는 디렉터리 = web
const WEB_DIR = __dirname;
const CADDY_EXE = fs.existsSync(path.join(WEB_DIR, 'caddy.exe'))
  ? path.join(WEB_DIR, 'caddy.exe')
  : 'caddy';
const CLIENT_DIR = path.join(WEB_DIR, 'client');
const LOGS_DIR = path.join(WEB_DIR, '..', 'logs');

module.exports = {
  apps: [
    {
      name: "cve-backend",
      cwd: WEB_DIR,
      script: "node",
      args: "server.js",
      env: {
        NODE_ENV: "production",
      },
      out_file: path.join(LOGS_DIR, "backend-out.log"),
      error_file: path.join(LOGS_DIR, "backend-error.log"),
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      max_restarts: 10,
      restart_delay: 5000,
      instances: 1,
      exec_mode: "fork",
    },
    {
      name: "cve-frontend",
      cwd: CLIENT_DIR,
      interpreter: "node",
      script: "node_modules/vite/bin/vite.js",
      env: {
        NODE_ENV: "development",
      },
      out_file: path.join(LOGS_DIR, "frontend-out.log"),
      error_file: path.join(LOGS_DIR, "frontend-error.log"),
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      max_restarts: 10,
      restart_delay: 5000,
      instances: 1,
      exec_mode: "fork",
    },
    {
      name: "caddy",
      cwd: WEB_DIR,
      script: CADDY_EXE,
      args: "run --config Caddyfile",
      out_file: path.join(LOGS_DIR, "caddy-out.log"),
      error_file: path.join(LOGS_DIR, "caddy-error.log"),
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      max_restarts: 10,
      restart_delay: 5000,
      instances: 1,
      exec_mode: "fork",
    },
  ],
};
