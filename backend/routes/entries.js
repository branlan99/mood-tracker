const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get all entries
router.get('/', (req, res) => {
  db.all(
    'SELECT * FROM entries WHERE user_id = ? ORDER BY date DESC',
    [req.user.id],
    (err, entries) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      res.json({ entries });
    }
  );
});

// Get entry by date
router.get('/:date', (req, res) => {
  const { date } = req.params;

  db.get(
    'SELECT * FROM entries WHERE user_id = ? AND date = ?',
    [req.user.id, date],
    (err, entry) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      if (!entry) {
        return res.status(404).json({ error: 'Entry not found' });
      }

      res.json({ entry });
    }
  );
});

// Create or update entry
router.post('/', (req, res) => {
  const { date, mood, moods, text, aiResponse } = req.body;

  if (!date) {
    return res.status(400).json({ error: 'Date is required' });
  }

  const entryId = uuidv4();
  const moodsJson = Array.isArray(moods) ? JSON.stringify(moods) : moods;

  db.run(
    `INSERT INTO entries (id, user_id, date, mood, moods, text, ai_response)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(user_id, date) DO UPDATE SET
       mood = excluded.mood,
       moods = excluded.moods,
       text = excluded.text,
       ai_response = excluded.ai_response,
       updated_at = CURRENT_TIMESTAMP`,
    [entryId, req.user.id, date, mood, moodsJson, text, aiResponse],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to save entry' });
      }

      db.get('SELECT * FROM entries WHERE id = ?', [entryId], (err, entry) => {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }

        res.status(201).json({ entry });
      });
    }
  );
});

// Update entry
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { mood, moods, text, aiResponse } = req.body;

  const moodsJson = Array.isArray(moods) ? JSON.stringify(moods) : moods;

  db.run(
    `UPDATE entries 
     SET mood = ?, moods = ?, text = ?, ai_response = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ? AND user_id = ?`,
    [mood, moodsJson, text, aiResponse, id, req.user.id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to update entry' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: 'Entry not found' });
      }

      db.get('SELECT * FROM entries WHERE id = ?', [id], (err, entry) => {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }

        res.json({ entry });
      });
    }
  );
});

// Delete entry
router.delete('/:id', (req, res) => {
  const { id } = req.params;

  db.run(
    'DELETE FROM entries WHERE id = ? AND user_id = ?',
    [id, req.user.id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to delete entry' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: 'Entry not found' });
      }

      res.json({ message: 'Entry deleted successfully' });
    }
  );
});

module.exports = router;

