# Frontend Integration Guide

This guide shows how to update your frontend to use the backend API.

## Quick Setup

1. Update API base URL in your frontend
2. Replace localStorage calls with API calls
3. Add authentication token handling

## API Base URL

Create a config file or update your `app.js`:

```javascript
const API_BASE_URL = process.env.API_URL || 'http://localhost:3000/api';
// For production: 'https://your-backend.railway.app/api'
```

## Authentication

### Login/Register

Instead of localStorage, use the API:

```javascript
// Register
const response = await fetch(`${API_BASE_URL}/auth/register`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password, name, hasSubscription })
});

const data = await response.json();
localStorage.setItem('token', data.token);
localStorage.setItem('currentUser', JSON.stringify(data.user));
```

### Add Token to Requests

Create a helper function:

```javascript
async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem('token');
  
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers
    }
  });

  if (response.status === 401) {
    // Token expired, redirect to login
    localStorage.removeItem('token');
    window.location.href = '/';
    return;
  }

  return response.json();
}
```

## Updated Functions

### Save Entry

```javascript
async saveEntry() {
  const entry = {
    date: this.getTodayKey(),
    mood: this.selectedMoods[0]?.mood,
    moods: this.selectedMoods,
    text: document.getElementById('journalText').value,
    aiResponse: this.currentAIResponse
  };

  const data = await apiRequest('/entries', {
    method: 'POST',
    body: JSON.stringify(entry)
  });

  // Handle response
}
```

### Load Entries

```javascript
async loadEntries() {
  const data = await apiRequest('/entries');
  this.entries = {};
  
  data.entries.forEach(entry => {
    this.entries[entry.date] = entry;
  });
}
```

### Password Reset

```javascript
async handleForgotPassword() {
  const email = document.getElementById('resetEmail').value;
  
  await fetch(`${API_BASE_URL}/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  });

  alert('Password reset link sent to your email!');
}
```

## Environment Variables

Create a `.env` file (for build tools) or update your deployment:

```
API_URL=https://your-backend.railway.app/api
```

## Complete Integration

See the updated `app.js` in the `frontend-updated/` directory for a complete example.

## Testing

1. Start backend: `cd backend && npm start`
2. Update frontend API_URL to `http://localhost:3000/api`
3. Test all features
4. Deploy both frontend and backend
5. Update frontend API_URL to production backend URL


