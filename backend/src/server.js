require('dotenv').config();
const http = require('http');
const app = require('./app');
const { startAutoCloseCron } = require('./services/cron.service');
const { runAutoSeed } = require('./services/seed.service');
const { initSocket } = require('./services/socket.service');

const PORT = process.env.PORT || 3001;
const server = http.createServer(app);

// Initialize WebSockets
const frontendUrl = process.env.FRONTEND_URL;
const corsOrigin = (!frontendUrl || frontendUrl === '*')
  ? true
  : (frontendUrl.includes(',') ? frontendUrl.split(',').map(u => u.trim()) : frontendUrl);

initSocket(server, corsOrigin);

server.listen(PORT, async () => {
  console.log(`Server running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
  startAutoCloseCron();
  await runAutoSeed();
});
