import { useState, useEffect, useCallback } from 'react';

/**
 * Hook to detect mobile vs desktop and trigger layout updates on resize
 * Returns responsive state and window width for layout calculations
 */
export function useResponsiveLayout() {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    // Use a more flexible mobile detection that matches the lib/utils.ts breakpoint
    return window.innerWidth < 768;
  });
  const [windowWidth, setWindowWidth] = useState(() => {
    if (typeof window === 'undefined') return 0;
    return window.innerWidth;
  });

  const handleResize = useCallback(() => {
    const newWidth = window.innerWidth;
    const newIsMobile = newWidth < 768;
    
    // Update both width and mobile state
    setWindowWidth(newWidth);
    setIsMobile(newIsMobile);
  }, []);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    const debouncedHandleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(handleResize, 150); // Debounce resize events
    };

    window.addEventListener('resize', debouncedHandleResize, { passive: true });
    
    // Run initial check
    handleResize();
    
    return () => {
      window.removeEventListener('resize', debouncedHandleResize);
      clearTimeout(timeoutId);
    };
  }, [handleResize]);

  return { isMobile, windowWidth };
}

/**
 * Hook to debounce a value
 * Useful for search inputs and other frequently changing values
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Hook to get window size
 * Returns current window dimensions with debounced updates
 */
export function useWindowSize() {
  const [windowSize, setWindowSize] = useState(() => {
    if (typeof window === 'undefined') {
      return { width: 0, height: 0 };
    }
    return {
      width: window.innerWidth,
      height: window.innerHeight,
    };
  });

  const handleResize = useCallback(() => {
    setWindowSize({
      width: window.innerWidth,
      height: window.innerHeight,
    });
  }, []);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    const debouncedHandleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(handleResize, 100);
    };

    window.addEventListener('resize', debouncedHandleResize, { passive: true });
    
    return () => {
      window.removeEventListener('resize', debouncedHandleResize);
      clearTimeout(timeoutId);
    };
  }, [handleResize]);

  return windowSize;
}
