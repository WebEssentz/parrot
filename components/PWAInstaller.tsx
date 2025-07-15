// components/PWAInstaller.tsx
"use client";

import { useEffect } from 'react';

export function PWAInstaller() {
  useEffect(() => {
    // This effect will run only on the client side, after the component has mounted.
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js').catch((registrationError) => {
          console.error('SW registration failed: ', registrationError);
        });
      });
    }
  }, []);

  return null; // This component doesn't render anything.
}