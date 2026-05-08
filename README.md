# Co-Op Queue

A mobile-friendly React + Vite dashboard for two people to manage shared games, TV shows, and movies with Firebase Google login and Firestore live data.

## Features

- Google authentication with Firebase Auth
- Shared Firestore collection with live updates
- Add, edit, delete, and update queue items
- Categories for Current Games, Want to Play Next, Currently Watching, TV Shows, and Movies
- Search, type/status filters, sorting by rank order or recently updated, and drag-to-reorder cards
- Cozy dark mobile-first dashboard with card-based items
- GitHub Pages deployment script

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Create a Firebase project at [Firebase Console](https://console.firebase.google.com/).

3. In Firebase, enable:

- Authentication > Sign-in method > Google
- Firestore Database

4. Copy `.env.example` to `.env` and fill in your Firebase web app values:

```bash
cp .env.example .env
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

5. Start the app:

```bash
npm run dev
```

## Firestore Rules

For a private two-person queue, start with authenticated-user access:

```js
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    match /queueItems/{itemId} {
      allow read, create, update, delete: if request.auth != null;
    }
  }
}
```

For stricter access, add both Google account UIDs to a rule allowlist.

### Two-Person Private Rules

After both people have signed in once, go to Firebase Console > Authentication > Users and copy both user IDs. Then replace the Firestore rules with:

```js
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    function isCoOpMember() {
      return request.auth != null
        && request.auth.uid in [
          "YOUR_UID_HERE",
          "FRIEND_UID_HERE"
        ];
    }

    match /queueItems/{itemId} {
      allow read, create, update, delete: if isCoOpMember();
    }
  }
}
```

Publish the rules after replacing both placeholder IDs.

## GitHub Pages Deployment

1. Create a GitHub repository named `co-op-queue`.

2. Update these two places if your repository name is different:

- `package.json` `homepage`
- `vite.config.js` `base`

3. Set the homepage in `package.json`:

```json
"homepage": "https://KizzyMoon.github.io/co-op-queue/"
```

4. Add your Firebase authorized domain:

Firebase Console > Authentication > Settings > Authorized domains, add:

```text
KizzyMoon.github.io
```

5. Deploy:

```bash
npm run deploy
```

The `gh-pages` package builds the app and publishes `dist` to the `gh-pages` branch.

## Item Shape

Each Firestore document in `queueItems` contains:

- `title`
- `type`: `game`, `tv`, or `movie`
- `status`: `playing`, `watching`, `planned`, `finished`, or `dropped`
- `rank`: number, where `1` is the top pick
- `platform`
- `addedBy`
- `notes`
- `createdAt`
- `lastUpdated`
