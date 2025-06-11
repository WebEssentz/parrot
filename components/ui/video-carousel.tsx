"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import styles from './video-carousel.module.css';
import { cn } from '@/lib/utils';

// A simple hook to detect mobile screen sizes
function useMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < breakpoint);
    };
    checkScreenSize();
    window.addEventListener("resize", checkScreenSize);
    return () => window.removeEventListener("resize", checkScreenSize);
  }, [breakpoint]);
  return isMobile;
}

interface Video {
  src: string;
  poster?: string;
  title?: string;
}

interface VideoCarouselProps {
  videos: Video[];
}

const PlayIcon = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M8 5v14l11-7z" />
  </svg>
);

const CloseIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M14.2548 4.75488C14.5282 4.48152 14.9717 4.48152 15.2451 4.75488C15.5184 5.02825 15.5184 5.47175 15.2451 5.74512L10.9902 10L15.2451 14.2549L15.3349 14.3652C15.514 14.6369 15.4841 15.006 15.2451 15.2451C15.006 15.4842 14.6368 15.5141 14.3652 15.335L14.2548 15.2451L9.99995 10.9902L5.74506 15.2451C5.4717 15.5185 5.0282 15.5185 4.75483 15.2451C4.48146 14.9718 4.48146 14.5282 4.75483 14.2549L9.00971 10L4.75483 5.74512L4.66499 5.63477C4.48589 5.3631 4.51575 4.99396 4.75483 4.75488C4.99391 4.51581 5.36305 4.48594 5.63471 4.66504L5.74506 4.75488L9.99995 9.00977L14.2548 4.75488Z" />
  </svg>
);

const ChevronLeftIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M11.5292 3.7793C11.7889 3.5196 12.211 3.5196 12.4707 3.7793C12.7304 4.039 12.7304 4.461 12.4707 4.7207L7.19136 10L12.4707 15.2793L12.5556 15.3838C12.7261 15.6419 12.6979 15.9934 12.4707 16.2207C12.2434 16.448 11.8919 16.4762 11.6337 16.3057L11.5292 16.2207L5.77925 10.4707C5.51955 10.211 5.51955 9.789 5.77925 9.5293L11.5292 3.7793Z" />
  </svg>
);

const ChevronRightIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M7.52925 3.7793C7.75652 3.55203 8.10803 3.52383 8.36616 3.69434L8.47065 3.7793L14.2207 9.5293C14.4804 9.789 14.4804 10.211 14.2207 10.4707L8.47065 16.2207C8.21095 16.4804 7.78895 16.4804 7.52925 16.2207C7.26955 15.961 7.26955 15.539 7.52925 15.2793L12.8085 10L7.52925 4.7207L7.44429 4.61621C7.27378 4.35808 7.30198 4.00657 7.52925 3.7793Z" />
  </svg>
);

export const VideoCarousel: React.FC<VideoCarouselProps> = ({ videos }) => {
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [selectedVideoIndex, setSelectedVideoIndex] = useState(0);
  const lightboxCarouselRef = useRef<HTMLDivElement | null>(null);
  const isMobile = useMobile();

  const openLightbox = (index: number) => {
    setSelectedVideoIndex(index);
    setIsLightboxOpen(true);
  };

  const closeLightbox = () => setIsLightboxOpen(false);

  const handleNextVideo = useCallback(() => {
    setSelectedVideoIndex(p => (p + 1) % videos.length);
  }, [videos.length]);

  const handlePrevVideo = useCallback(() => {
    setSelectedVideoIndex(p => (p - 1 + videos.length) % videos.length);
  }, [videos.length]);

  useEffect(() => {
    const carousel = lightboxCarouselRef.current;
    if (isLightboxOpen && carousel) {
      const scrollTarget = carousel.children[selectedVideoIndex] as HTMLElement;
      if (scrollTarget) {
        carousel.scrollTo({ left: scrollTarget.offsetLeft, behavior: 'smooth' });
      }
    }
  }, [selectedVideoIndex, isLightboxOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowRight') handleNextVideo();
      if (e.key === 'ArrowLeft') handlePrevVideo();
    };
    if (isLightboxOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isLightboxOpen, handleNextVideo, handlePrevVideo]);

  if (!videos || videos.length === 0) return null;

  // FIX: On desktop, show only the first 3. On mobile, show all.
  const videosToDisplay = isMobile ? videos : videos.slice(0, 3);

  return (
    <>
      <div className={styles.carouselContainer}>
        <div className={styles.carouselTrack}>
          {videosToDisplay.map((video, index) => (
            <button key={index} className={styles.thumbnailCard} onClick={() => openLightbox(index)}>
              <div className={styles.thumbnailImageWrapper}>
                <img src={video.poster || '/video-fallback.png'} alt={video.title || `Video ${index + 1}`} className={styles.thumbnailImage} />
                <div className={styles.playIconOverlay}><PlayIcon /></div>
              </div>
              {video.title && <p className={styles.thumbnailTitle}>{video.title}</p>}
            </button>
          ))}
        </div>
      </div>

      {isLightboxOpen && (
        <div className={styles.lightboxOverlay} role="dialog" aria-modal="true">
          <header className={styles.lightboxHeader}>
            <div className={styles.headerSpacer} />
            <div className={styles.lightboxCounter}>{selectedVideoIndex + 1} / {videos.length}</div>
            <button onClick={closeLightbox} className={styles.closeButton} aria-label="Close video player"><CloseIcon /></button>
          </header>

          <main className={styles.lightboxContent}>
            <div ref={lightboxCarouselRef} className={styles.lightboxCarousel}>
              {videos.map((video, index) => (
                <div key={`lightbox-vid-${index}`} className={styles.lightboxVideoWrapper}>
                  <video
                    className={styles.lightboxVideo}
                    src={video.src}
                    poster={video.poster}
                    controls
                    autoPlay={index === selectedVideoIndex}
                    playsInline
                    muted={index !== selectedVideoIndex}
                  >
                    Your browser does not support the video tag.
                  </video>
                </div>
              ))}
            </div>
          </main>
          
          <button onClick={handlePrevVideo} className={cn(styles.navArrow, styles.prev)} aria-label="Previous video"><ChevronLeftIcon /></button>
          <button onClick={handleNextVideo} className={cn(styles.navArrow, styles.next)} aria-label="Next video"><ChevronRightIcon /></button>
        </div>
      )}
    </>
  );
};