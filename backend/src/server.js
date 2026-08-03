require('dotenv').config();
const app = require('./app');
const { startAutoCloseCron } = require('./services/cron.service');
const { runAutoSeed } = require('./services/seed.service');

const PORT = process.env.PORT || 3001;

app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
  startAutoCloseCron();
  await runAutoSeed();
});
