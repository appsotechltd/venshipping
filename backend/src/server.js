const app = require('./app');
const config = require('./config');
const migrate = require('./db/migrate');

migrate()
  .then(() => {
    app.listen(config.port, () => console.log(`VEN Shipping API listening on :${config.port}`));
  })
  .catch((err) => {
    console.error('Failed to start:', err);
    process.exit(1);
  });
