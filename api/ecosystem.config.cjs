// ecosystem.config.cjs
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
      log_type: 'json', // Use JSON format for logs
      error_file: 'logs/error.log', // Specify error log file
      out_file: 'logs/out.log', // Specify output log file
      merge_logs: true, // Merge logs from different instances
      // Custom log handling to ignore specific patterns
      log_date_format: 'YYYY-MM-DD HH:mm Z',
      watch_options: {
        followSymlinks: false,
        usePolling: true,
        interval: 1000,
        binaryInterval: 3000,
        ignoreInitial: true,
        ignored: /node_modules|logs|\.log/,
      },
    },
  ],
};;