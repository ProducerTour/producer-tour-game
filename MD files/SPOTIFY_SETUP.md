# Spotify Web API Integration Setup

## Overview
This guide walks you through setting up Spotify Web API integration for the Publishing Tracker to enable song lookup functionality.

## Step 1: Install Required Dependencies

First, install `axios` in the backend (it's needed to make HTTP requests to Spotify):

```bash
cd /Users/nolangriffis/Documents/Producer\ Tour\ Wordperss/Producer-Tour-WP-Directory/producer-tour-react/apps/backend
npm install axios
```

## Step 2: Get Spotify Credentials

> ⚠️ **SECURITY WARNING**: Never share your Client Secret publicly. The Client ID provided (059f6984e6464abd9144e1eb7556b73c) should only be used in development/testing. If this has been exposed publicly, regenerate it immediately in your Spotify Developer Dashboard.

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Log in or create a Spotify Developer account
3. Create a new app
4. Accept the terms and create the app
5. You'll get:
   - **Client ID**: `059f6984e6464abd9144e1eb7556b73c` (provided by you)
   - **Client Secret**: You need to generate/copy this from the dashboard

## Step 3: Configure Environment Variables

### Backend (.env)
Update your `.env` file in `/apps/backend/` with your Spotify credentials:

```env
# Spotify Web API
SPOTIFY_CLIENT_ID=059f6984e6464abd9144e1eb7556b73c
SPOTIFY_CLIENT_SECRET=your_actual_client_secret_here
```

**IMPORTANT**: 
- Never commit `.env` files to version control
- Use `.env.local` or `.env.local.development` for local overrides
- In production, set these as environment variables through your hosting provider

## Step 4: Restart the Backend Server

```bash
npm run dev
```

The server will use the Spotify credentials to authenticate with the Spotify Web API using the Client Credentials flow.

## API Endpoints

### 1. Search for Tracks
**POST** `/api/tools/spotify/search`

```javascript
// Request
{
  "query": "Never Gonna Give You Up",
  "limit": 10  // optional, default 10
}

// Response
{
  "success": true,
  "count": 5,
  "tracks": [
    {
      "id": "dQw4w9WgXcQ",
      "title": "Never Gonna Give You Up",
      "artist": "Rick Astley",
      "album": "Whenever You Need Somebody",
      "releaseDate": "1987-10-16",
      "isrc": "GBUM71001039",
      "preview": "https://...",
      "explicit": false,
      "duration": 213973,
      "popularity": 88,
      "image": "https://...",
      "spotifyUrl": "https://open.spotify.com/track/dQw4w9WgXcQ"
    },
    ...
  ]
}
```

### 2. Lookup by ISRC Code
**POST** `/api/tools/spotify/isrc`

```javascript
// Request
{
  "isrc": "GBUM71001039"
}

// Response
{
  "success": true,
  "track": {
    "id": "dQw4w9WgXcQ",
    "title": "Never Gonna Give You Up",
    "artist": "Rick Astley",
    "album": "Whenever You Need Somebody",
    "releaseDate": "1987-10-16",
    "isrc": "GBUM71001039",
    "preview": "https://...",
    "explicit": false,
    "duration": 213973,
    "popularity": 88,
    "image": "https://...",
    "spotifyUrl": "https://open.spotify.com/track/dQw4w9WgXcQ"
  }
}
```

### 3. Get Track by ID
**GET** `/api/tools/spotify/track/:trackId`

```javascript
// Request
GET /api/tools/spotify/track/dQw4w9WgXcQ

// Response
{
  "success": true,
  "track": {
    "id": "dQw4w9WgXcQ",
    "title": "Never Gonna Give You Up",
    ...
  }
}
```

## Frontend Usage

The frontend API client is already set up. Use it in your React components:

```typescript
import { toolsApi } from '@/lib/api';

// Search for tracks
const results = await toolsApi.spotifySearch('song name', 10);

// Lookup by ISRC
const track = await toolsApi.spotifyLookupISRC('GBUM71001039');

// Get track by ID
const track = await toolsApi.spotifyGetTrack('dQw4w9WgXcQ');
```

### Example React Component

```typescript
import { useState } from 'react';
import { toolsApi } from '@/lib/api';

export function TrackLookup() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!query.trim()) return;
    
    try {
      setLoading(true);
      setError('');
      const response = await toolsApi.spotifySearch(query, 10);
      setResults(response.data.tracks);
    } catch (err) {
      setError('Failed to search tracks');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <form onSubmit={handleSearch}>
        <input
          type="text"
          placeholder="Search for tracks..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Searching...' : 'Search'}
        </button>
      </form>

      {error && <div className="error">{error}</div>}

      <div className="results">
        {results.map((track) => (
          <div key={track.id} className="track-card">
            <img src={track.image} alt={track.title} />
            <h3>{track.title}</h3>
            <p>{track.artist}</p>
            <p>{track.album}</p>
            {track.isrc && <p>ISRC: {track.isrc}</p>}
            <a href={track.spotifyUrl} target="_blank" rel="noopener noreferrer">
              Open in Spotify
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}
```

## Files Modified/Created

### New Files
- `/apps/backend/src/services/spotify.service.ts` - Spotify API service layer
- `/SPOTIFY_SETUP.md` - This setup guide

### Modified Files
- `/apps/backend/.env.example` - Added Spotify credentials
- `/apps/backend/src/routes/tools.routes.ts` - Added 3 new endpoints
- `/apps/frontend/src/lib/api.ts` - Added Spotify API functions

## Authentication Flow

The integration uses Spotify's **Client Credentials OAuth 2.0 Flow**:

1. Backend exchanges Client ID + Secret for access token
2. Token is cached and refreshed automatically before expiration
3. All track requests use the cached token
4. No user authentication required (works with public Spotify data)

## Troubleshooting

### "Failed to authenticate with Spotify API"
- Verify Client ID and Secret are correct in `.env`
- Check Spotify Developer Dashboard to confirm app is active

### "Track not found"
- ISRC code might be incorrect
- Try searching by title/artist instead
- Spotify might not have the track in their database

### "Calculation timeout"
- Increase timeout in axios config if needed
- Check network connection
- Verify Spotify API is accessible from your network

## Next Steps

1. Install axios: `npm install axios`
2. Update `.env` with your Spotify credentials
3. Restart backend server
4. Test endpoints using Postman or curl
5. Integrate with Publishing Tracker UI

## Support Resources

- [Spotify Web API Docs](https://developer.spotify.com/documentation/web-api)
- [Client Credentials Flow](https://developer.spotify.com/documentation/general/guides/authorization/client-credentials)
- [Search Endpoint](https://developer.spotify.com/documentation/web-api/reference/search)

---

**Last Updated**: November 2024