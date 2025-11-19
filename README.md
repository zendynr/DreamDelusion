# DreamDelusion

A minimal React + Vite web app for capturing random thoughts using voice transcription, with Firebase backend for cloud storage and authentication.

## Features

- Timer that tracks session duration
- Voice transcription using Web Speech API
- Automatic thought capture with timestamps
- Cloud storage with Firebase Firestore
- User authentication with Firebase Auth
- Real-time data synchronization
- Export thoughts as plain text

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Firebase Setup

1. Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
2. Enable Authentication (Email/Password provider)
3. Create a Firestore database
4. Get your Firebase configuration:
   - Go to Project Settings > General
   - Scroll down to "Your apps" and click the web icon (`</>`)
   - Copy the Firebase configuration object

5. Create a `.env.local` file in the root directory:
```bash
cp .env.example .env.local
```

6. Fill in your Firebase configuration in `.env.local`:
```

```

7. Update `.firebaserc` with your Firebase project ID:
```json
{
  "projects": {
    "default": "your-project-id"
  }
}
```

8. Deploy Firestore security rules:
```bash
firebase deploy --only firestore:rules
```

### 3. Start Development Server

```bash
npm run dev
```

### 4. Build for Production

```bash
npm run build
```

### 5. Deploy to Firebase Hosting (Optional)

```bash
npm run firebase:deploy
```

Or deploy only hosting:
```bash
npm run firebase:deploy:hosting
```

## Requirements

- Modern browser with Web Speech API support (Chrome, Edge)
- Microphone access permission
- Firebase project with Authentication and Firestore enabled
- Firebase CLI (for deployment): `npm install -g firebase-tools`

## Usage

1. Sign up or sign in with your email and password
2. Click "Start Listening" to begin capturing thoughts
3. Speak your thoughts - they'll be automatically transcribed
4. Click "Stop" when done - your thought will be saved to the cloud
5. View and manage your thoughts in the Library view
6. Your data is automatically synced across devices

## Firebase Services Used

- **Firebase Authentication**: User sign up, sign in, and account management
- **Cloud Firestore**: Real-time database for storing thoughts
- **Firebase Hosting**: Production hosting (optional)

## Data Migration

On first login, any existing thoughts stored in localStorage will be automatically migrated to Firestore. The migration happens once per user account.
