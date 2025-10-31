# Spotify Integration - Quick Start

## 🚀 Get Started in 3 Steps

### Step 1: Install Axios
```bash
cd apps/backend
npm install axios
```

### Step 2: Add Credentials to `.env`
```env
SPOTIFY_CLIENT_ID=059f6984e6464abd9144e1eb7556b73c
SPOTIFY_CLIENT_SECRET=your_secret_here_from_spotify_dashboard
```

### Step 3: Restart Backend
```bash
npm run dev
```

Done! ✅

---

## 📝 API Endpoints Ready to Use

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/tools/spotify/search` | POST | Search tracks by title, artist, album |
| `/api/tools/spotify/isrc` | POST | Lookup track by ISRC code |
| `/api/tools/spotify/track/:trackId` | GET | Get track details by Spotify ID |

---

## 💻 Test in Frontend

### Option 1: Use the pre-built component
```typescript
import { SpotifyTrackLookup } from '@/components/SpotifyTrackLookup';

<SpotifyTrackLookup 
  onTrackSelect={(track) => console.log(track)} 
/>
```

### Option 2: Use the API directly
```typescript
import { toolsApi } from '@/lib/api';

// Search
const results = await toolsApi.spotifySearch('Rolling Stones Satisfaction', 10);

// ISRC lookup
const track = await toolsApi.spotifyLookupISRC('GBUM71001039');

// Get by ID
const track = await toolsApi.spotifyGetTrack('dQw4w9WgXcQ');
```

---

## 📂 What Was Added

### Backend Files
- `src/services/spotify.service.ts` - Spotify API service
- Updated `.env.example` with Spotify credentials
- Updated `src/routes/tools.routes.ts` with 3 endpoints

### Frontend Files
- Updated `src/lib/api.ts` with 3 API functions

### Documentation
- `SPOTIFY_SETUP.md` - Detailed setup guide
- `SPOTIFY_COMPONENT_EXAMPLE.tsx` - Ready-to-use React component
- `SPOTIFY_QUICKSTART.md` - This file

---

## 🔑 Authentication

The integration uses **Client Credentials Flow** (no user login required):
- Backend exchanges Client ID + Secret for token
- Token is cached and refreshed automatically
- Works with public Spotify data only

---

## ⚠️ Important Security Notes

1. **Never commit your Client Secret to version control**
2. **Never expose credentials in client-side code**
3. If your Client Secret is exposed, regenerate it immediately
4. Use `.env` files (git-ignored) for credentials
5. In production, use environment variables from your hosting provider

---

## 🆘 Troubleshooting

| Issue | Solution |
|-------|----------|
| "Failed to authenticate" | Check Client ID & Secret in `.env` |
| "Track not found" | Try searching by title instead of ISRC |
| Module not found errors | Run `npm install axios` in backend |
| CORS errors | Backend needs to be running (`npm run dev`) |

---

## 📚 Example Response Format

```json
{
  "id": "dQw4w9WgXcQ",
  "title": "Never Gonna Give You Up",
  "artist": "Rick Astley",
  "album": "Whenever You Need Somebody",
  "releaseDate": "1987-10-16",
  "isrc": "GBUM71001039",
  "preview": "https://p.scdn.co/...",
  "explicit": false,
  "duration": 213973,
  "popularity": 88,
  "image": "https://i.scdn.co/image/...",
  "spotifyUrl": "https://open.spotify.com/track/dQw4w9WgXcQ"
}
```

---

## 🎯 Next Steps

1. ✅ Install axios
2. ✅ Add credentials to `.env`
3. ✅ Restart backend
4. 📝 Copy example component to your project
5. 🧪 Test in your browser
6. 🎨 Customize UI to match your design

---

**Questions?** See `SPOTIFY_SETUP.md` for detailed documentation.