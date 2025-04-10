import { useEffect, useState } from 'react';

function useColorSchemePreference() {
  // Initialize with the current preference
  const [colorScheme, setColorScheme] = useState(() => {
    // Check if we're in a browser environment
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
    }
    // Default for SSR
    return 'light';
  });

  useEffect(() => {
    // Skip if not in browser
    if (typeof window === 'undefined') {
      return;
    }

    // Create the media query
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    // Define the handler function
    const handleChange = (event: MediaQueryListEvent) => {
      setColorScheme(event.matches ? 'dark' : 'light');
    };

    // Add event listener
    mediaQuery.addEventListener('change', handleChange);

    // Clean up
    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  return colorScheme;
}

export default useColorSchemePreference;
