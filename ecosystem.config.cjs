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
      script: 'serve',
      args: '-s build -l 3000',
      interpreter: 'none',
      autorestart: true,
      watch: false,
      max_restarts: 10,
      env: {
        PORT: '3000'
      }
    }
  ]
};
