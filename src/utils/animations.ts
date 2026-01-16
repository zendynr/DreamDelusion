import { gsap } from 'gsap';

// Animation presets for consistent, minimal animations
export const animations = {
  // Fade in with slight scale
  fadeInScale: (element: HTMLElement | string, delay = 0) => {
    return gsap.fromTo(
      element,
      { opacity: 0, scale: 0.95 },
      { 
        opacity: 1, 
        scale: 1, 
        duration: 0.4, 
        delay,
        ease: 'power2.out' 
      }
    );
  },

  // Fade in from bottom
  fadeInUp: (element: HTMLElement | string, delay = 0, y = 20) => {
    return gsap.fromTo(
      element,
      { opacity: 0, y },
      { 
        opacity: 1, 
        y: 0, 
        duration: 0.5, 
        delay,
        ease: 'power2.out' 
      }
    );
  },

  // Fade in from top
  fadeInDown: (element: HTMLElement | string, delay = 0, y = -20) => {
    return gsap.fromTo(
      element,
      { opacity: 0, y },
      { 
        opacity: 1, 
        y: 0, 
        duration: 0.5, 
        delay,
        ease: 'power2.out' 
      }
    );
  },

  // Slide in from side
  slideIn: (element: HTMLElement | string, from: 'left' | 'right' = 'left', delay = 0) => {
    const x = from === 'left' ? -30 : 30;
    return gsap.fromTo(
      element,
      { opacity: 0, x },
      { 
        opacity: 1, 
        x: 0, 
        duration: 0.5, 
        delay,
        ease: 'power2.out' 
      }
    );
  },

  // Button hover animation
  buttonHover: (element: HTMLElement | string) => {
    return gsap.to(element, {
      scale: 1.05,
      duration: 0.2,
      ease: 'power2.out'
    });
  },

  buttonHoverOut: (element: HTMLElement | string) => {
    return gsap.to(element, {
      scale: 1,
      duration: 0.2,
      ease: 'power2.out'
    });
  },

  // Pulse animation
  pulse: (element: HTMLElement | string, scale = 1.1) => {
    return gsap.to(element, {
      scale,
      duration: 0.3,
      yoyo: true,
      repeat: 1,
      ease: 'power2.inOut'
    });
  },

  // Stagger animation for lists
  staggerFadeIn: (elements: HTMLElement[] | string, delay = 0.05) => {
    return gsap.fromTo(
      elements,
      { opacity: 0, y: 20 },
      { 
        opacity: 1, 
        y: 0, 
        duration: 0.4, 
        stagger: delay,
        ease: 'power2.out' 
      }
    );
  },

  // Smooth scale animation
  scaleIn: (element: HTMLElement | string, delay = 0) => {
    return gsap.fromTo(
      element,
      { scale: 0, opacity: 0 },
      { 
        scale: 1, 
        opacity: 1, 
        duration: 0.3, 
        delay,
        ease: 'back.out(1.7)' 
      }
    );
  },

  // Fade out
  fadeOut: (element: HTMLElement | string, duration = 0.3) => {
    return gsap.to(element, {
      opacity: 0,
      duration,
      ease: 'power2.in'
    });
  },

  // Modal entrance
  modalIn: (element: HTMLElement | string) => {
    return gsap.fromTo(
      element,
      { opacity: 0, scale: 0.9, y: 20 },
      { 
        opacity: 1, 
        scale: 1, 
        y: 0, 
        duration: 0.4, 
        ease: 'power3.out' 
      }
    );
  },

  // Toast notification
  toastIn: (element: HTMLElement | string) => {
    return gsap.fromTo(
      element,
      { opacity: 0, y: -20, scale: 0.95 },
      { 
        opacity: 1, 
        y: 0, 
        scale: 1, 
        duration: 0.3, 
        ease: 'back.out(1.2)' 
      }
    );
  },

  toastOut: (element: HTMLElement | string) => {
    return gsap.to(element, {
      opacity: 0,
      y: -10,
      scale: 0.95,
      duration: 0.2,
      ease: 'power2.in'
    });
  },

  // Word animation for transcription
  wordIn: (element: HTMLElement | string) => {
    return gsap.fromTo(
      element,
      { opacity: 0, scale: 0.8, y: 10 },
      { 
        opacity: 1, 
        scale: 1, 
        y: 0, 
        duration: 0.3, 
        ease: 'back.out(1.5)' 
      }
    );
  },

  // Recording pulse
  recordingPulse: (element: HTMLElement | string) => {
    return gsap.to(element, {
      scale: 1.1,
      opacity: 0.8,
      duration: 1,
      yoyo: true,
      repeat: -1,
      ease: 'power2.inOut'
    });
  },

  // Smooth rotation
  rotate: (element: HTMLElement | string, rotation: number, duration = 0.3) => {
    return gsap.to(element, {
      rotation,
      duration,
      ease: 'power2.out'
    });
  }
};

// Utility to create timeline for complex animations
export const createTimeline = () => {
  return gsap.timeline();
};

// Utility to kill animations on cleanup
export const killAnimation = (element: HTMLElement | string) => {
  gsap.killTweensOf(element);
};
