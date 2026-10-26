const { Pool, types } = require('pg');
const config = require('../config');

// Keep DATE columns as '2026-11-30' strings instead of local-midnight Date objects.
types.setTypeParser(1082, (value) => value);

const pool = new Pool({ connectionString: config.databaseUrl });

module.exports = {
  pool,
  query: (text, params) => pool.query(text, params),
};
