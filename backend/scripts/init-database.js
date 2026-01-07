// Initialize database script
const db = require('../config/database');

console.log('Database initialized successfully!');
console.log('You can now start the server with: npm start');

// Close database connection
db.close((err) => {
  if (err) {
    console.error(err.message);
  }
  process.exit(0);
});


