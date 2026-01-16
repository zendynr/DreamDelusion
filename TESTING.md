# Testing Guide for Voice Notes and Screen Recording

## Quick Start

1. **Start the development server:**
   ```bash
   npm run dev
   ```

2. **Open your browser** to the URL shown (usually `http://localhost:5173`)

3. **Sign in** to your Firebase account (if not already signed in)

## Testing Voice Notes Recording

### Steps:
1. Navigate to the **Capture** view (if not already there)
2. Click the **"Voice Note"** button in the mode selector
3. Click the **microphone button** to start recording
4. **Speak** into your microphone for a few seconds
5. Click the **microphone button again** to stop recording
6. Wait for the upload to complete (you'll see toast notifications)
7. Go to the **Library** view
8. Click on the newly created thought
9. You should see an **audio player** in the thought detail view
10. **Play the audio** to verify it recorded correctly

### What to Check:
- ✅ Recording starts when you click the button
- ✅ Timer shows elapsed time
- ✅ Recording stops when you click again
- ✅ Toast notification shows "Uploading voice note..."
- ✅ Thought appears in library with a microphone icon
- ✅ Audio player appears in thought detail
- ✅ Audio plays back correctly

### Browser Requirements:
- **Chrome/Edge**: Full support ✅
- **Firefox**: Full support ✅
- **Safari**: Limited support (may need different codec)

## Testing Screen Recording

### Steps:
1. Navigate to the **Capture** view
2. Click the **"Screen Record"** button in the mode selector
3. Click the **screen recording button** to start
4. **Select what to share** in the browser popup:
   - Entire screen
   - Specific window
   - Browser tab
5. Optionally select **"Share audio"** if you want system audio
6. Click **"Share"** in the browser dialog
7. **Interact with your screen** (move windows, type, etc.)
8. Click the **stop button** in the app (or stop sharing from browser)
9. Wait for upload to complete
10. Go to the **Library** view
11. Click on the newly created thought
12. You should see a **video player** in the thought detail view
13. **Play the video** to verify it recorded correctly

### What to Check:
- ✅ Browser shows screen sharing dialog
- ✅ Recording starts after selecting screen/window
- ✅ Timer shows elapsed time
- ✅ Recording stops when you click stop
- ✅ Toast notification shows "Uploading screen recording..."
- ✅ Thought appears in library with a video icon
- ✅ Video player appears in thought detail
- ✅ Video plays back correctly with your screen content

### Browser Requirements:
- **Chrome/Edge**: Full support ✅
- **Firefox**: Full support ✅
- **Safari**: Limited support

## Testing Transcription Mode (Existing Feature)

### Steps:
1. Navigate to the **Capture** view
2. Click the **"Transcription"** button (should be selected by default)
3. Click the **microphone button** to start
4. **Speak** clearly into your microphone
5. Watch the **live transcription** appear word by word
6. Click the **microphone button** to stop
7. Verify the thought is saved with the transcribed text

## Testing All Three Modes Together

1. Create one thought with each mode:
   - One transcription thought
   - One voice note thought
   - One screen recording thought
2. Go to **Library** view
3. Verify each thought shows the correct icon:
   - 📝 Transcription: No special icon
   - 🎤 Voice Note: Microphone icon
   - 🎥 Screen Record: Video icon
4. Click each thought and verify:
   - Transcription: Shows text transcript
   - Voice Note: Shows audio player
   - Screen Record: Shows video player

## Troubleshooting

### Voice Recording Issues

**Problem**: "Microphone access denied"
- **Solution**: Check browser permissions, allow microphone access

**Problem**: Recording doesn't start
- **Solution**: 
  - Check browser console for errors
  - Verify MediaRecorder is supported: Open console and type `typeof MediaRecorder`
  - Try a different browser (Chrome/Edge recommended)

**Problem**: Audio doesn't play back
- **Solution**: 
  - Check if the file uploaded successfully (check Firebase Storage)
  - Verify the audio URL is present in the thought object
  - Check browser console for CORS or playback errors

### Screen Recording Issues

**Problem**: "Screen sharing permission denied"
- **Solution**: Allow screen sharing in the browser dialog

**Problem**: Screen sharing dialog doesn't appear
- **Solution**: 
  - Check if `navigator.mediaDevices.getDisplayMedia` is supported
  - Try Chrome or Edge (best support)
  - Check browser console for errors

**Problem**: Video doesn't play back
- **Solution**: 
  - Check if the file uploaded successfully
  - Verify the video URL is present in the thought object
  - Check browser console for errors
  - Large video files may take time to upload

### General Issues

**Problem**: Files not uploading to Firebase
- **Solution**: 
  - Check Firebase Storage is enabled in your Firebase project
  - Verify storage rules are deployed: `firebase deploy --only storage`
  - Check browser console for Firebase errors
  - Verify your Firebase config has `VITE_FIREBASE_STORAGE_BUCKET` set

**Problem**: "Storage rules not deployed"
- **Solution**: Run `firebase deploy --only storage` to deploy storage security rules

## Browser Console Testing

Open browser DevTools (F12) and check:

1. **No errors** in the console
2. **Network tab** shows:
   - Audio/video files uploading to Firebase Storage
   - Successful upload responses
3. **Application tab** → **Storage**:
   - Firebase Storage shows uploaded files
   - Files are in the correct path: `users/{userId}/thoughts/{thoughtId}/`

## Firebase Console Verification

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Go to **Storage**
4. Navigate to `users/{userId}/thoughts/{thoughtId}/`
5. Verify audio/video files are present
6. Check file sizes and metadata

## Performance Testing

- **Small recordings** (< 1 minute): Should upload quickly
- **Large recordings** (> 5 minutes): May take longer, check progress
- **Multiple recordings**: Test creating several in a row
- **Network conditions**: Test on slow network to verify error handling

## Security Testing

1. **Storage Rules**: Verify users can only access their own files
2. **Authentication**: Verify unauthenticated users can't upload
3. **File Access**: Try accessing another user's file URL (should fail)

## Next Steps After Testing

If everything works:
1. Deploy storage rules: `firebase deploy --only storage`
2. Test in production build: `npm run build && npm run preview`
3. Deploy to Firebase: `npm run firebase:deploy`
