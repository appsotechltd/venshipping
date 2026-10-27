const app = require('./app');
const config = require('./config');
const migrate = require('./db/migrate');
const { seedAdmin } = require('./web/auth');

migrate()
  .then(() => seedAdmin())
  .then(() => {
    app.listen(config.port, () => console.log(`VEN Shipping API listening on :${config.port}`));
  })
  .catch((err) => {
    console.error('Failed to start:', err);
    process.exit(1);
  });
