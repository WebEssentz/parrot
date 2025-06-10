"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import styles from "./image-slider.module.css";
import { cn } from "@/lib/utils";

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

export interface ImageSliderProps {
  images: { 
    src: string; 
    alt?: string;
    source?: {
      url: string;
      title?: string;
    }
  }[];
}

const SLIDE_DURATION = 5000;

function unwrapNextImageUrl(src: string): string {
  try {
    const url = new URL(src, window.location.origin);
    if (url.pathname === '/_next/image' && url.searchParams.has('url')) {
      return decodeURIComponent(url.searchParams.get('url')!);
    }
  } catch {}
  return src;
}

function getHostname(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

const FALLBACK_IMAGE = "/globe.svg";

const SafeImage = ({ src, alt, className }: { src: string; alt?: string; className?: string }) => {
  const [imgSrc, setImgSrc] = useState(unwrapNextImageUrl(src));
  
  useEffect(() => {
    setImgSrc(unwrapNextImageUrl(src));
  }, [src]);

  return <img src={imgSrc} alt={alt || "Image"} className={className} loading="lazy" onError={() => setImgSrc(FALLBACK_IMAGE)} />;
};

const SourceLink = ({ source }: { source?: { url: string; title?: string }}) => {
  if (!source || !source.url) return null;
  const hostname = getHostname(source.url);
  
  return (
    <div className={styles.sourceLinkWrapper}>
      <a href={source.url} target="_blank" rel="noopener noreferrer" className={styles.sourceLink}>
        <div className={styles.sourceTextContainer}>
          {hostname && (
            <div className={styles.sourceDomain}>
              <img
                alt={`${hostname} favicon`}
                width="16"
                height="16"
                className={styles.sourceFavicon}
                src={`https://www.google.com/s2/favicons?domain=${hostname}&sz=32`}
              />
              {hostname}
            </div>
          )}
          {source.title && (
            <div className={styles.sourceTitle}>{source.title}</div>
          )}
        </div>
      </a>
    </div>
  );
}

export const ImageSlider: React.FC<ImageSliderProps> = ({ images }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const progressRef = useRef<NodeJS.Timeout | null>(null);

  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const lightboxCarouselRef = useRef<HTMLDivElement | null>(null);
  const lightboxProgressBarRef = useRef<HTMLDivElement | null>(null);
  const isMobile = useMobile();

  const resetTimers = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (progressRef.current) clearInterval(progressRef.current);
    setProgress(0);
  }, []);

  useEffect(() => {
    if (isMobile && images.length > 1) {
      resetTimers();
      progressRef.current = setInterval(() => setProgress(p => (p >= 100 ? 100 : p + (100 / (SLIDE_DURATION / 50)))), 50);
      timerRef.current = setInterval(() => setCurrentIndex(p => (p + 1) % images.length), SLIDE_DURATION);
    }
    return () => resetTimers();
  }, [currentIndex, images.length, resetTimers, isMobile]);

  const handleDotClick = (index: number) => setCurrentIndex(index);
  
  const handleImageClick = (index: number) => {
    setSelectedImageIndex(index);
    setIsLightboxOpen(true);
  };

  const handleCloseLightbox = () => setIsLightboxOpen(false);

  const handleNextImage = useCallback(() => setSelectedImageIndex(p => (p + 1) % images.length), [images.length]);
  const handlePrevImage = useCallback(() => setSelectedImageIndex(p => (p - 1 + images.length) % images.length), [images.length]);

  useEffect(() => {
    const carousel = lightboxCarouselRef.current;
    if (isLightboxOpen && carousel) {
      const scrollTarget = carousel.children[selectedImageIndex] as HTMLElement;
      if (scrollTarget) {
        carousel.scrollTo({ left: scrollTarget.offsetLeft, behavior: 'smooth' });
      }
    }
  }, [selectedImageIndex, isLightboxOpen]);
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleCloseLightbox();
      if (!isMobile) {
        if (e.key === 'ArrowRight') handleNextImage();
        if (e.key === 'ArrowLeft') handlePrevImage();
      }
    };
    if (isLightboxOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isLightboxOpen, isMobile, handleNextImage, handlePrevImage]);

  useEffect(() => {
    if (isMobile) return;
    const progressBar = lightboxProgressBarRef.current;
    if (!progressBar || images.length <= 1) return;
    const progressPercentage = (selectedImageIndex / (images.length - 1)) * 100;
    progressBar.style.width = `${progressPercentage}%`;
  }, [selectedImageIndex, isLightboxOpen, images.length, isMobile]);
  
  // FIX: This new effect listens to scroll events to update the counter
  useEffect(() => {
    const carousel = lightboxCarouselRef.current;
    if (!isLightboxOpen || !carousel) return;

    let scrollTimeout: NodeJS.Timeout;
    
    const handleScroll = () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        const scrollLeft = carousel.scrollLeft;
        const itemWidth = carousel.scrollWidth / images.length;
        const newIndex = Math.round(scrollLeft / itemWidth);
        if (newIndex !== selectedImageIndex) {
          setSelectedImageIndex(newIndex);
        }
      }, 100); // Debounce to avoid excessive updates during scroll
    };

    carousel.addEventListener('scroll', handleScroll);
    return () => {
      carousel.removeEventListener('scroll', handleScroll);
      clearTimeout(scrollTimeout);
    };
  }, [isLightboxOpen, images.length, selectedImageIndex]);

  if (!images || images.length === 0) return null;
  const visibleImages = images.slice(0, 4);
  const currentLightboxImage = images[selectedImageIndex];

  return (
    <>
      <div className={styles.mobileSliderWrapper} onClick={() => handleImageClick(currentIndex)} role="button" tabIndex={0} aria-label="Open image viewer">
        <div className={styles.mobileImageContainer}>
          {images.map((img, index) => (
            <SafeImage key={`mobile-slide-${index}`} src={img.src} alt={img.alt} className={cn(styles.mobileImage, index === currentIndex ? styles.visible : styles.hidden)} />
          ))}
        </div>
        {images.length > 1 && (
          <div className={styles.dotsContainer}>
            {images.map((_, index) => (
              <button
                key={`dot-${index}`}
                className={cn(styles.dot, { [styles.active]: index === currentIndex })}
                onClick={(e) => { e.stopPropagation(); handleDotClick(index); }}
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
      
      <div className={styles.imageRow}>
        {visibleImages.map((img, i) => (
          <button key={`desktop-${i}`} className={styles.imageContainer} type="button" onClick={() => handleImageClick(i)} aria-label={`View image ${i + 1} in full screen`}>
            <SafeImage src={img.src} alt={img.alt} className={styles.image} />
          </button>
        ))}
      </div>

      {isLightboxOpen && (
        <div className={styles.lightboxOverlay} role="dialog" aria-modal="true">
          <header className={styles.lightboxHeader}>
            <div className={styles.headerSpacer} />
            <div className={styles.lightboxCounter}>{selectedImageIndex + 1} / {images.length}</div>
            <button onClick={handleCloseLightbox} className={styles.closeButton} aria-label="Close lightbox">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor"><path d="M14.2548 4.75488C14.5282 4.48152 14.9717 4.48152 15.2451 4.75488C15.5184 5.02825 15.5184 5.47175 15.2451 5.74512L10.9902 10L15.2451 14.2549L15.3349 14.3652C15.514 14.6369 15.4841 15.006 15.2451 15.2451C15.006 15.4842 14.6368 15.5141 14.3652 15.335L14.2548 15.2451L9.99995 10.9902L5.74506 15.2451C5.4717 15.5185 5.0282 15.5185 4.75483 15.2451C4.48146 14.9718 4.48146 14.5282 4.75483 14.2549L9.00971 10L4.75483 5.74512L4.66499 5.63477C4.48589 5.3631 4.51575 4.99396 4.75483 4.75488C4.99391 4.51581 5.36305 4.48594 5.63471 4.66504L5.74506 4.75488L9.99995 9.00977L14.2548 4.75488Z"></path></svg>
            </button>
          </header>

          <main className={styles.lightboxContent}>
            <div ref={lightboxCarouselRef} className={styles.lightboxCarousel}>
              {images.map((img, index) => (
                <div key={`lightbox-${index}`} className={cn(styles.lightboxImageWrapper, !isMobile && selectedImageIndex !== index && styles.inactive)} onClick={() => !isMobile && setSelectedImageIndex(index)}>
                  <SafeImage src={img.src} alt={img.alt} className={styles.lightboxImage} />
                  {isMobile && <SourceLink source={img.source} />}
                </div>
              ))}
            </div>
          </main>
          
          {!isMobile && (
            <footer className={styles.lightboxFooter}>
              <SourceLink source={currentLightboxImage?.source} />
              <div className={styles.scrollbarContainer}>
                <div className={styles.scrollbarTrack}>
                  <div ref={lightboxProgressBarRef} className={styles.scrollbarThumb}></div>
                </div>
              </div>
            </footer>
          )}
          
          {!isMobile && (
            <>
              <button onClick={handlePrevImage} className={cn(styles.navArrow, styles.prev)} aria-label="Previous image">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor"><path d="M11.5292 3.7793C11.7889 3.5196 12.211 3.5196 12.4707 3.7793C12.7304 4.039 12.7304 4.461 12.4707 4.7207L7.19136 10L12.4707 15.2793L12.5556 15.3838C12.7261 15.6419 12.6979 15.9934 12.4707 16.2207C12.2434 16.448 11.8919 16.4762 11.6337 16.3057L11.5292 16.2207L5.77925 10.4707C5.51955 10.211 5.51955 9.789 5.77925 9.5293L11.5292 3.7793Z"></path></svg>
              </button>
              <button onClick={handleNextImage} className={cn(styles.navArrow, styles.next)} aria-label="Next image">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor"><path d="M7.52925 3.7793C7.75652 3.55203 8.10803 3.52383 8.36616 3.69434L8.47065 3.7793L14.2207 9.5293C14.4804 9.789 14.4804 10.211 14.2207 10.4707L8.47065 16.2207C8.21095 16.4804 7.78895 16.4804 7.52925 16.2207C7.26955 15.961 7.26955 15.539 7.52925 15.2793L12.8085 10L7.52925 4.7207L7.44429 4.61621C7.27378 4.35808 7.30198 4.00657 7.52925 3.7793Z"></path></svg>
              </button>
            </>
          )}
        </div>
      )}
    </>
  );
};