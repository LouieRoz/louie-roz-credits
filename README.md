# Louie Roz credits

Static site. Open `index.html` through any web host.

## Add a credit
Add one entry to `credits.json`:

    { "url": "https://open.spotify.com/track/ID", "roles": ["Producer", "Mixing Engineer"] }

Push it. The "Update credits" action runs `node build.mjs`, downloads the cover into `covers/`, and rewrites `data.js`.
Without Spotify keys, also include `"title"`, `"artist"` and `"year"`. With keys, they are filled in automatically.

Roles in use: Producer, Beatmaker, Co-Producer, Recording Engineer, Mixing Engineer, Vocal Engineer, Bassist.

## One-time setup
1. Put this folder in a GitHub repo and enable Pages (Settings > Pages > main branch, root).
2. Optional: create a free app at developer.spotify.com and add `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET` as repo secrets.
3. Run the action once (Actions > Update credits > Run workflow) to fetch all covers.

Run locally: `node build.mjs`
