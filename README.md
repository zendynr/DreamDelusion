# Thought Timer

A minimal React + Vite web app for capturing random thoughts using voice transcription.

## Features

- Timer that tracks session duration
- Voice transcription using Web Speech API
- Automatic thought capture with timestamps
- Session persistence in localStorage
- Export thoughts as plain text

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Start development server:
```bash
npm run dev
```

3. Build for production:
```bash
npm run build
```

## Requirements

- Modern browser with Web Speech API support (Chrome, Edge)
- Microphone access permission

## Usage

1. Click "Start Listening" to begin a session
2. Speak your thoughts - they'll be automatically transcribed
3. Click "End Session" when done
4. Use "Copy All Thoughts" to export your session
