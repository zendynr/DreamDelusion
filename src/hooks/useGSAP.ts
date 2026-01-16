import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';

/**
 * Hook to animate elements on mount/unmount
 */
export function useGSAPAnimation(
  animationFn: (element: HTMLElement) => gsap.core.Tween | gsap.core.Timeline,
  deps: any[] = []
) {
  const elementRef = useRef<HTMLElement | null>(null);
  const animationRef = useRef<gsap.core.Tween | gsap.core.Timeline | null>(null);

  useEffect(() => {
    if (elementRef.current) {
      animationRef.current = animationFn(elementRef.current);
    }

    return () => {
      if (animationRef.current) {
        animationRef.current.kill();
      }
    };
  }, deps);

  return elementRef;
}

/**
 * Hook for hover animations
 */
export function useHoverAnimation(
  hoverScale = 1.05,
  duration = 0.2
) {
  const elementRef = useRef<HTMLElement | null>(null);

  const handleMouseEnter = () => {
    if (elementRef.current) {
      gsap.to(elementRef.current, {
        scale: hoverScale,
        duration,
        ease: 'power2.out'
      });
    }
  };

  const handleMouseLeave = () => {
    if (elementRef.current) {
      gsap.to(elementRef.current, {
        scale: 1,
        duration,
        ease: 'power2.out'
      });
    }
  };

  return {
    ref: elementRef,
    onMouseEnter: handleMouseEnter,
    onMouseLeave: handleMouseLeave
  };
}

/**
 * Hook for click animations
 */
export function useClickAnimation(scale = 0.95) {
  const elementRef = useRef<HTMLElement | null>(null);

  const handleClick = () => {
    if (elementRef.current) {
      gsap.to(elementRef.current, {
        scale,
        duration: 0.1,
        yoyo: true,
        repeat: 1,
        ease: 'power2.out'
      });
    }
  };

  return {
    ref: elementRef,
    onClick: handleClick
  };
}
