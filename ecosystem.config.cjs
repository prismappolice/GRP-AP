module.exports = {
  apps: [
    {
      name: 'grp-backend',
      cwd: '/home/prismappolice/GRP-AP',
      script: '/home/prismappolice/GRP-AP/.venv/bin/python',
      args: '-m uvicorn backend.server:app --host 127.0.0.1 --port 8000',
      interpreter: 'none',
      autorestart: true,
      watch: false,
      max_restarts: 10,
      env: {
        PYTHONUNBUFFERED: '1'
      }
    },
    {
      name: 'grp-frontend',
      cwd: '/home/prismappolice/GRP-AP/frontend',
      script: 'npm',
      args: 'start',
      interpreter: 'none',
      autorestart: true,
      watch: false,
      max_restarts: 10,
      env: {
        HOST: '0.0.0.0',
        PORT: '3000',
        BROWSER: 'none'
      }
    }
  ]
};
