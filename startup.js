// Startup script to initialize database and start the application
const { spawn } = require('child_process');
const http = require('http');

async function initializeDatabase() {
  console.log('Initializing database...');
  
  try {
    // Start the Next.js server in the background
    const serverProcess = spawn('npm', ['start'], {
      detached: false,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    // Wait for server to be ready
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Server startup timeout'));
      }, 30000);

      const checkServer = () => {
        const req = http.request({
          hostname: 'localhost',
          port: 3000,
          path: '/',
          method: 'GET',
          timeout: 1000
        }, (res) => {
          clearTimeout(timeout);
          console.log('Server is ready');
          resolve();
        });

        req.on('error', () => {
          setTimeout(checkServer, 1000);
        });

        req.on('timeout', () => {
          req.destroy();
          setTimeout(checkServer, 1000);
        });

        req.end();
      };

      // Start checking after a brief delay
      setTimeout(checkServer, 3000);
    });

    // Try to seed the database
    try {
      console.log('Seeding database...');
      const seedReq = http.request({
        hostname: 'localhost',
        port: 3000,
        path: '/api/seed',
        method: 'POST',
        timeout: 10000
      }, (res) => {
        console.log(`Database seeding completed with status: ${res.statusCode}`);
      });

      seedReq.on('error', (err) => {
        console.log('Database seeding failed, but continuing:', err.message);
      });

      seedReq.end();
    } catch (seedError) {
      console.log('Seeding failed, but continuing:', seedError.message);
    }

    // Keep the process alive
    process.on('SIGTERM', () => {
      console.log('Received SIGTERM, shutting down gracefully');
      serverProcess.kill('SIGTERM');
      process.exit(0);
    });

    process.on('SIGINT', () => {
      console.log('Received SIGINT, shutting down gracefully');
      serverProcess.kill('SIGINT');
      process.exit(0);
    });

    // Forward server output
    serverProcess.stdout.on('data', (data) => {
      process.stdout.write(data);
    });

    serverProcess.stderr.on('data', (data) => {
      process.stderr.write(data);
    });

    serverProcess.on('exit', (code) => {
      console.log(`Server process exited with code ${code}`);
      process.exit(code);
    });

  } catch (error) {
    console.error('Failed to initialize:', error);
    process.exit(1);
  }
}

initializeDatabase();