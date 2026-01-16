# GSAP Animations Implementation

GSAP (GreenSock Animation Platform) has been integrated throughout the app to provide smooth, minimal, and clean animations.

## Installation

Run the following command to install GSAP:

```bash
npm install
```

This will install `gsap@^3.12.5` as specified in `package.json`.

## What's Animated

### 1. **Toast Notifications** (`src/components/Toast.tsx`)
- Smooth fade-in with scale animation when appearing
- Fade-out animation when disappearing
- Uses `toastIn` and `toastOut` animations

### 2. **Thought Cards** (`src/ThoughtCard.tsx`)
- Fade-in from bottom when cards appear
- Subtle hover scale effect (1.02x)
- Pulse animation when selected
- Smooth transitions on all interactions

### 3. **Capture View** (`src/CaptureView.tsx`)
- Mic button: Scale-in animation on mount
- Screen recording button: Scale-in when appearing
- Mic toggle button: Fade-in from bottom
- Timer: Fade-in from bottom when recording starts
- Transcription: Fade-in animation when text appears
- All buttons have hover animations

### 4. **Modals** (`src/components/AnimatedModal.tsx`)
- New reusable `AnimatedModal` component
- Smooth fade-in with scale for overlay
- Modal content slides up with scale
- Used for delete confirmations

### 5. **Account Dropdown** (`src/App.tsx`)
- Fade-in from top when opening
- Smooth transitions

### 6. **Library View** (`src/LibraryView.tsx`)
- Staggered fade-in for thought cards
- Cards appear one after another with slight delay
- Creates a smooth cascading effect

## Animation Utilities

### `src/utils/animations.ts`
Contains reusable animation presets:
- `fadeInScale` - Fade in with slight scale
- `fadeInUp` - Fade in from bottom
- `fadeInDown` - Fade in from top
- `slideIn` - Slide in from left/right
- `buttonHover` / `buttonHoverOut` - Button hover effects
- `pulse` - Pulse animation
- `staggerFadeIn` - Staggered animations for lists
- `scaleIn` - Scale in with bounce
- `fadeOut` - Fade out
- `modalIn` - Modal entrance
- `toastIn` / `toastOut` - Toast animations
- `wordIn` - Word animation for transcription
- `recordingPulse` - Continuous pulse for recording

### `src/hooks/useGSAP.ts`
Custom React hooks for animations:
- `useGSAPAnimation` - Animate on mount/unmount
- `useHoverAnimation` - Hover scale effects
- `useClickAnimation` - Click feedback

## Animation Philosophy

All animations follow these principles:
1. **Minimal** - Subtle, not distracting
2. **Fast** - Quick transitions (0.2-0.5s)
3. **Smooth** - Using easing functions (power2.out, back.out)
4. **Purposeful** - Every animation serves a UX purpose
5. **Consistent** - Same animation patterns throughout

## Customization

To adjust animation timing or effects, modify:
- `src/utils/animations.ts` - Change duration, easing, or values
- Individual components - Override with custom animations

## Performance

GSAP is highly optimized and uses:
- Hardware acceleration (transform, opacity)
- RequestAnimationFrame
- Efficient DOM updates
- Minimal repaints/reflows

All animations are GPU-accelerated for smooth 60fps performance.

## Browser Support

GSAP works in all modern browsers:
- Chrome/Edge
- Firefox
- Safari
- Mobile browsers

## Next Steps

After installing GSAP (`npm install`), all animations will be active. The app will feel more polished and responsive with these smooth transitions.
