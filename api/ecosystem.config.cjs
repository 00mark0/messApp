// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'mess-api',
      script: 'server.js',
      instances: 1,
      autorestart: true,
      watch: true,
      ignore_watch: ['node_modules', 'logs', '*.log'],
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};