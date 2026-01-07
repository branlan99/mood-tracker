const express = require('express');
const db = require('../config/database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get user profile
router.get('/profile', (req, res) => {
  db.get(
    `SELECT u.*, s.* 
     FROM users u 
     LEFT JOIN subscriptions s ON u.id = s.user_id 
     WHERE u.id = ?`,
    [req.user.id],
    (err, user) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      delete user.password_hash;
      res.json({ user });
    }
  );
});

// Update user profile
router.put('/profile', (req, res) => {
  const { name } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }

  db.run(
    'UPDATE users SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [name, req.user.id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to update profile' });
      }

      db.get('SELECT * FROM users WHERE id = ?', [req.user.id], (err, user) => {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }

        delete user.password_hash;
        res.json({ user });
      });
    }
  );
});

module.exports = router;


