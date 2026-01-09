# Project 2 — Game (Lobby + Character builder + Text DnD)

Static site (GitHub Pages friendly) using:
- Firebase Auth (Google)
- Firestore (no Storage)

Includes:
- Lobby list + Create lobby + Join lobby (optional password, MVP plain string)
- Room: chat + players + ready + host GM turn button
- Character builder (race/class/background chips + custom input)
- Save transcript into `users/{uid}/savedGames`

## What’s NOT inside (yet)
Real AI GM needs a server endpoint (you can use Cloudflare Worker). This project includes:
- `gm.js` local GM stub (free)
- `server/cloudflare-worker.js` template

## Setup
1) Enable Google Auth in Firebase
2) Add authorized domain (your github.io)
3) Create Firestore DB
4) Paste your firebaseConfig into `firebase-config.js`
5) Paste `firestore.rules` into Firestore Rules
6) Put `Vasek Italic_0.ttf` into `./media/` (exact filename)
7) Deploy to GitHub Pages

## Use
- Login
- Create lobby
- Start (host)
- Players type actions → press Ready
- Host presses “GM Turn”
- Save transcript
