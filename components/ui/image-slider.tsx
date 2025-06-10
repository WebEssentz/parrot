// src/components/ui/image-slider.tsx
// THIS FILE IS CORRECT. NO CHANGES NEEDED.

import React, { useState, useEffect, useRef, useCallback } from "react";
import styles from "./image-slider.module.css";
import { cn } from "@/lib/utils";

export interface ImageSliderProps {
  images: { src: string; alt?: string }[];
}

const SLIDE_DURATION = 5000; // 5 seconds per slide

// Helper: unwrap Next.js image proxy URLs
function unwrapNextImageUrl(src: string): string {
  try {
    const url = new URL(src, window.location.origin);
    if (url.pathname === '/_next/image' && url.searchParams.has('url')) {
      return decodeURIComponent(url.searchParams.get('url')!);
    }
  } catch {}
  return src;
}

export const ImageSlider: React.FC<ImageSliderProps> = ({ images }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const progressRef = useRef<NodeJS.Timeout | null>(null);

  const resetTimers = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (progressRef.current) clearInterval(progressRef.current);
    setProgress(0);
  }, []);

  useEffect(() => {
    resetTimers();

    progressRef.current = setInterval(() => {
      setProgress(prev => (prev >= 100 ? 100 : prev + (100 / (SLIDE_DURATION / 50))));
    }, 50);

    timerRef.current = setInterval(() => {
      setCurrentIndex(prevIndex => (prevIndex + 1) % images.length);
    }, SLIDE_DURATION);

    return () => resetTimers();
  }, [currentIndex, images.length, resetTimers]);

  const handleDotClick = (index: number) => {
    setCurrentIndex(index);
  };

  if (!images || images.length === 0) return null;

  const visibleImages = images.slice(0, 4);

  return (
    <>
      <div className={styles.mobileSliderWrapper}>
        <div className={styles.mobileImageContainer}>
          {images.map((img, index) => (
            <img
              key={img.src + index}
              src={unwrapNextImageUrl(img.src)}
              alt={img.alt || `Image ${index + 1}`}
              className={cn(
                styles.mobileImage,
                index === currentIndex ? styles.visible : styles.hidden
              )}
              loading="lazy"
            />
          ))}
          {images.length > 1 && (
            <div className={styles.dotsContainer}>
              {images.map((_, index) => (
                <button
                  key={`dot-${index}`}
                  className={cn(styles.dot, { [styles.active]: index === currentIndex })}
                  onClick={() => handleDotClick(index)}
                  aria-label={`Go to image ${index + 1}`}
                >
                  {index === currentIndex && (
                    <div className={styles.progressBar} style={{ width: `${progress}%` }} />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      
      <div className={styles.imageRow}>
        {visibleImages.map((img, i) => (
          <button
            key={img.src + i}
            className={styles.imageContainer}
            type="button"
          >
            <img
              src={unwrapNextImageUrl(img.src)}
              alt={img.alt || `Image ${i + 1}`}
              className={styles.image}
              loading="lazy"
            />
          </button>
        ))}
      </div>
    </>
  );
};