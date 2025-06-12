"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  saveMediaToIDB,
  getMediaFromIDB,
  StoredMediaMeta
} from '@/lib/media-idb';
import styles from '@/components/ui/media-carousel.module.css';
import { cn } from '@/lib/utils';

// --- Type Definitions ---
interface MediaSource {
  url: string;
  title?: string;
}

interface ImageMedia {
  type: 'image';
  src: string;
  alt?: string;
  source?: MediaSource;
}

interface VideoMedia {
  type: 'video';
  src: string;
  poster?: string;
  title?: string;
  source?: MediaSource;
}

type MediaItem = ImageMedia | VideoMedia;

interface MediaCarouselProps {
  images?: Omit<ImageMedia, 'type'>[];
  videos?: Omit<VideoMedia, 'type'>[];
}

// --- Helper Hook & Components ---
function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkScreenSize = () => setIsMobile(window.innerWidth < breakpoint);
    checkScreenSize();
    window.addEventListener("resize", checkScreenSize);
    return () => window.removeEventListener("resize", checkScreenSize);
  }, [breakpoint]);
  return isMobile;
}

const PlayIcon = () => ( <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M8 5v14l11-7z" /></svg> );
const CloseIcon = () => ( <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M14.2548 4.75488C14.5282 4.48152 14.9717 4.48152 15.2451 4.75488C15.5184 5.02825 15.5184 5.47175 15.2451 5.74512L10.9902 10L15.2451 14.2549L15.3349 14.3652C15.514 14.6369 15.4841 15.006 15.2451 15.2451C15.006 15.4842 14.6368 15.5141 14.3652 15.335L14.2548 15.2451L9.99995 10.9902L5.74506 15.2451C5.4717 15.5185 5.0282 15.5185 4.75483 15.2451C4.48146 14.9718 4.48146 14.5282 4.75483 14.2549L9.00971 10L4.75483 5.74512L4.66499 5.63477C4.48589 5.3631 4.51575 4.99396 4.75483 4.75488C4.99391 4.51581 5.36305 4.48594 5.63471 4.66504L5.74506 4.75488L9.99995 9.00977L14.2548 4.75488Z" /></svg> );
const ChevronLeftIcon = () => ( <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M11.5292 3.7793C11.7889 3.5196 12.211 3.5196 12.4707 3.7793C12.7304 4.039 12.7304 4.461 12.4707 4.7207L7.19136 10L12.4707 15.2793L12.5556 15.3838C12.7261 15.6419 12.6979 15.9934 12.4707 16.2207C12.2434 16.448 11.8919 16.4762 11.6337 16.3057L11.5292 16.2207L5.77925 10.4707C5.51955 10.211 5.51955 9.789 5.77925 9.5293L11.5292 3.7793Z" /></svg> );
const ChevronRightIcon = () => ( <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M7.52925 3.7793C7.75652 3.55203 8.10803 3.52383 8.36616 3.69434L8.47065 3.7793L14.2207 9.5293C14.4804 9.789 14.4804 10.211 14.2207 10.4707L8.47065 16.2207C8.21095 16.4804 7.78895 16.4804 7.52925 16.2207C7.26955 15.961 7.26955 15.539 7.52925 15.2793L12.8085 10L7.52925 4.7207L7.44429 4.61621C7.27378 4.35808 7.30198 4.00657 7.52925 3.7793Z" /></svg> );


// SafeImage with IndexedDB fallback
const SafeImage = ({ src, alt, className }: { src: string; alt?: string; className?: string }) => {
  const [imgSrc, setImgSrc] = useState<string | undefined>(undefined);
  useEffect(() => {
    let revoked: string | undefined;
    let cancelled = false;
    async function tryIDB() {
      // Try IndexedDB first
      const idb = await getMediaFromIDB(src);
      if (idb && idb.blob) {
        const url = URL.createObjectURL(idb.blob);
        revoked = url;
        if (!cancelled) setImgSrc(url);
        return;
      }
      // Fallback to network
      setImgSrc(src);
    }
    tryIDB();
    return () => {
      cancelled = true;
      if (revoked) URL.revokeObjectURL(revoked);
    };
  }, [src]);
  return <img src={imgSrc} alt={alt || "Media thumbnail"} className={className} loading="lazy" onError={() => setImgSrc("/globe.svg")} />;
};

const SourceLink = ({ source }: { source?: MediaSource }) => {
  if (!source || !source.url) return null;
  const hostname = new URL(source.url).hostname.replace(/^www\./, '');
  return (
    <div className={styles.sourceLinkWrapper}>
      <a href={source.url} target="_blank" rel="noopener noreferrer" className={styles.sourceLink}>
        <div className={styles.sourceTextContainer}>
          <div className={styles.sourceDomain}>
            <img alt={`${hostname} favicon`} width="16" height="16" className={styles.sourceFavicon} src={`https://www.google.com/s2/favicons?domain=${hostname}&sz=32`} />
            {hostname}
          </div>
          {source.title && <div className={styles.sourceTitle}>{source.title}</div>}
        </div>
      </a>
    </div>
  );
};

// Move VideoWithIDBFallback outside the component so it is in scope
function VideoWithIDBFallback(props: { src: string; poster?: string; autoPlay?: boolean; muted?: boolean; className?: string }) {
  const [videoSrc, setVideoSrc] = useState<string | undefined>(undefined);
  const [fallback, setFallback] = useState(false);
  useEffect(() => {
    let revoked: string | undefined = undefined;
    let cancelled = false;
    async function tryIDB() {
      const idb = await getMediaFromIDB(props.src);
      if (idb && idb.blob) {
        const url = URL.createObjectURL(idb.blob);
        revoked = url;
        if (!cancelled) setVideoSrc(url);
        return;
      }
      setVideoSrc(props.src);
    }
    tryIDB();
    return () => {
      cancelled = true;
      if (revoked) URL.revokeObjectURL(revoked);
    };
  }, [props.src]);

  // If the blob fails to play, fallback to direct URL
  const handleError = useCallback(() => {
    if (!fallback && videoSrc && videoSrc.startsWith('blob:')) {
      setFallback(true);
      setVideoSrc(props.src);
    }
  }, [fallback, videoSrc, props.src]);

  return (
    <video
      className={props.className}
      src={fallback ? props.src : videoSrc}
      poster={props.poster}
      autoPlay={props.autoPlay}
      muted={props.muted}
      controls
      onError={handleError}
    >
      Your browser does not support videos.
    </video>
  );
}
// --- Main MediaCarousel Component ---

export const MediaCarousel: React.FC<MediaCarouselProps & { maxImages?: number; maxVideos?: number }> = ({ images = [], videos = [], maxImages, maxVideos }) => {
  // Determine how many images/videos to show based on props (user intent)
  const limitedImages = typeof maxImages === 'number' ? images.slice(0, maxImages) : images;
  const limitedVideos = typeof maxVideos === 'number' ? videos.slice(0, maxVideos) : videos;

  // State to hold generated posters for videos without poster
  const [generatedPosters, setGeneratedPosters] = useState<{ [src: string]: string }>({});

  // Save all images/videos to IndexedDB for offline use (if not already present)
  useEffect(() => {
    async function saveAllMedia() {
      // Save images
      for (const img of limitedImages) {
        const exists = await getMediaFromIDB(img.src);
        if (!exists) {
          try {
            const resp = await fetch(img.src);
            if (resp.ok) {
              const blob = await resp.blob();
              await saveMediaToIDB(img.src, blob, {
                key: img.src,
                type: 'image',
                mimeType: blob.type,
                size: blob.size,
                title: img.alt,
                sourceUrl: img.source?.url
              });
            }
          } catch {}
        }
      }
      // Save videos
      for (const vid of limitedVideos) {
        const exists = await getMediaFromIDB(vid.src);
        if (!exists) {
          try {
            const resp = await fetch(vid.src);
            if (resp.ok) {
              const blob = await resp.blob();
              await saveMediaToIDB(vid.src, blob, {
                key: vid.src,
                type: 'video',
                mimeType: blob.type,
                size: blob.size,
                title: vid.title,
                sourceUrl: vid.source?.url
              });
            }
          } catch {}
        }
      }
    }
    saveAllMedia();
  }, [limitedImages, limitedVideos]);

  // For each video without a poster, generate one

  const allMedia: MediaItem[] = [
    ...limitedImages.map(img => ({ ...img, type: 'image' as const })),
    ...limitedVideos.map(vid => ({
      ...vid,
      type: 'video' as const,
      poster: vid.poster || generatedPosters[vid.src] || undefined,
    })),
  ];

  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const progressRef = useRef<NodeJS.Timeout | null>(null);

  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const lightboxCarouselRef = useRef<HTMLDivElement | null>(null);
  const isMobile = useIsMobile();
  const SLIDE_DURATION = 5000;

  const resetTimers = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (progressRef.current) clearInterval(progressRef.current);
    setProgress(0);
  }, []);

  useEffect(() => {
    if (isMobile && allMedia.length > 1) {
      resetTimers();
      progressRef.current = setInterval(() => setProgress(p => (p >= 100 ? 100 : p + (100 / (SLIDE_DURATION / 50)))), 50);
      timerRef.current = setInterval(() => setCurrentIndex(p => (p + 1) % allMedia.length), SLIDE_DURATION);
    }
    return () => resetTimers();
  }, [currentIndex, allMedia.length, resetTimers, isMobile]);


  const openLightbox = (index: number) => {
    setSelectedIndex(index);
    setIsLightboxOpen(true);
  };

  const closeLightbox = () => setIsLightboxOpen(false);

  const handleNext = useCallback(() => setSelectedIndex(p => (p + 1) % allMedia.length), [allMedia.length]);
  const handlePrev = useCallback(() => setSelectedIndex(p => (p - 1 + allMedia.length) % allMedia.length), [allMedia.length]);

  useEffect(() => {
    const carousel = lightboxCarouselRef.current;
    if (isLightboxOpen && carousel) {
      const scrollTarget = carousel.children[selectedIndex] as HTMLElement;
      if (scrollTarget) {
        carousel.scrollTo({ left: scrollTarget.offsetLeft, behavior: 'smooth' });
      }
    }
  }, [selectedIndex, isLightboxOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === 'ArrowLeft') handlePrev();
    };
    if (isLightboxOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isLightboxOpen, handleNext, handlePrev]);
  
  useEffect(() => {
    const carousel = lightboxCarouselRef.current;
    if (!isLightboxOpen || !carousel) return;
    let scrollTimeout: NodeJS.Timeout;
    const handleScroll = () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        const itemWidth = carousel.offsetWidth;
        const newIndex = Math.round(carousel.scrollLeft / itemWidth);
        if (newIndex >= 0 && newIndex < allMedia.length && newIndex !== selectedIndex) {
          setSelectedIndex(newIndex);
        }
      }, 150);
    };
    carousel.addEventListener('scroll', handleScroll);
    return () => {
      carousel.removeEventListener('scroll', handleScroll);
      clearTimeout(scrollTimeout);
    };
  }, [isLightboxOpen, allMedia.length, selectedIndex]);

  if (allMedia.length === 0) return null;

  // For desktop grid, show only what is in allMedia (already limited)
  const desktopMedia = allMedia;

  return (
    <>
      <div className={styles.mediaContainer}>
        {/* Mobile Slideshow */}
        <div className={styles.mobileSliderWrapper} onClick={() => openLightbox(currentIndex)}>
          <div className={styles.mobileMediaContainer}>
            {allMedia.map((item, index) => (
              <div key={`slide-${index}`} className={cn(styles.mobileMediaSlide, index === currentIndex ? styles.visible : styles.hidden)}>
                <SafeImage 
                  src={item.type === 'image' ? item.src : (item as VideoMedia).poster || '/video-fallback.png'}
                  alt={item.type === 'image' ? (item as ImageMedia).alt : (item as VideoMedia).title}
                  className={styles.media}
                />
              </div>
            ))}
          </div>
          {allMedia.length > 1 && (
            <div className={styles.dotsContainer}>
              {allMedia.map((_, index) => (
                <button key={`dot-${index}`} className={cn(styles.dot, { [styles.active]: index === currentIndex })} onClick={(e) => { e.stopPropagation(); setCurrentIndex(index); }}>
                  {index === currentIndex && <div className={styles.progressBar} style={{ width: `${progress}%` }} />}
                </button>
              ))}
            </div>
          )}
        </div>
        
        {/* Desktop Grid */}
        <div className={styles.desktopGrid}>
          {desktopMedia.map((item, index) => (
            <button key={`grid-${index}`} className={styles.desktopGridItem} onClick={() => openLightbox(index)}>
              <SafeImage 
                src={item.type === 'image' ? item.src : (item as VideoMedia).poster || '/video-fallback.png'}
                alt={item.type === 'image' ? (item as ImageMedia).alt : (item as VideoMedia).title}
                className={styles.media}
              />
              {item.type === 'video' && <div className={styles.playIconOverlay}><PlayIcon /></div>}
            </button>
          ))}
        </div>
      </div>

      {isLightboxOpen && (
        <div className={styles.lightboxOverlay} role="dialog" aria-modal="true">
          <header className={styles.lightboxHeader}>
            <div className={styles.headerSpacer} />
            <div className={styles.lightboxCounter}>{selectedIndex + 1} / {allMedia.length}</div>
            <button onClick={closeLightbox} className={styles.closeButton} aria-label="Close viewer"><CloseIcon /></button>
          </header>
          <main className={styles.lightboxContent}>
            <div ref={lightboxCarouselRef} className={styles.lightboxCarousel}>
              {allMedia.map((item, index) => (
                <div key={`lightbox-${index}`} className={styles.lightboxItemWrapper}>
                  {item.type === 'image' ? (
                    <SafeImage src={item.src} alt={item.alt} className={styles.lightboxMedia} />
                  ) : (
                    <VideoWithIDBFallback
                      src={item.src}
                      poster={item.poster || generatedPosters[item.src]}
                      autoPlay={index === selectedIndex}
                      muted={index !== selectedIndex}
                      className={styles.lightboxMedia}
                    />
                  )}
                </div>
              ))}
            </div>
          </main>
          <footer className={styles.lightboxFooter}>
            <SourceLink source={allMedia[selectedIndex]?.source} />
          </footer>
          <button onClick={handlePrev} className={cn(styles.navArrow, styles.prev)} aria-label="Previous"><ChevronLeftIcon /></button>
          <button onClick={handleNext} className={cn(styles.navArrow, styles.next)} aria-label="Next"><ChevronRightIcon /></button>
        </div>
      )}
    </>
  );
};