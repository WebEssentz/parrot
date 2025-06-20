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

interface VisionFilteringInfo {
  filtered: any[];
  all: any[];
  filteringApplied: boolean;
  warning?: string;
}


interface MediaCarouselProps {
  images?: Omit<ImageMedia, 'type'>[];
  videos?: Omit<VideoMedia, 'type'>[];
  maxImages?: number;
  maxVideos?: number;
  searchResults?: Array<{ imageUrl?: string; image?: string; title?: string; url?: string; sourceUrl?: string }>;
  visionFiltering?: VisionFilteringInfo; // for images
  visionFilteringVideos?: VisionFilteringInfo; // for videos
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

const SafeImage = ({ src, alt, className }: { src: string; alt?: string; className?: string }) => {
  const [imgSrc, setImgSrc] = useState<string | undefined>(undefined);
  useEffect(() => {
    let revoked: string | undefined;
    let cancelled = false;
    async function tryIDB() {
      const idb = await getMediaFromIDB(src);
      if (idb && idb.blob) {
        const url = URL.createObjectURL(idb.blob);
        revoked = url;
        if (!cancelled) setImgSrc(url);
        return;
      }
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

// --- YouTube URL Transformation Utility ---
function transformToEmbedUrl(url: string): string {
  try {
    // Extract YouTube video ID
    const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
    const match = url.match(youtubeRegex);
    
    if (match && match[1]) {
      // Return proper embed URL
      return `https://www.youtube.com/embed/${match[1]}`;
    }
    
    // If it's already an embed URL, return as is
    if (url.includes('youtube.com/embed/')) {
      return url;
    }
  } catch (error) {
    console.error('Error transforming YouTube URL:', error);
  }
  
  // Return original URL if transformation failed
  return url;
}

// --- UPGRADED: Intelligent Media Renderer ---
// --- UPGRADED: Intelligent Media Renderer ---
function MediaRenderer(props: { media: VideoMedia; isPlaying: boolean; className?: string }) {
  const { media, isPlaying, className } = props;

  // Check if this is a YouTube URL
  if (media.src.includes('youtube.com') || media.src.includes('youtu.be')) {
    // For YouTube videos, use an iframe with the transformed URL
    const embedUrl = transformToEmbedUrl(media.src);
    
    // In lightbox view (when className contains lightboxMedia)
    // MODIFICATION: Apply the passed 'className' (styles.lightboxMedia) to the container div
    if (className?.includes('lightboxMedia')) {
      return (
        <div className={cn(styles.youtubeContainer, className)}> {/* Ensure 'className' is applied here */}
          <iframe
            className={styles.youtubeEmbed}
            src={`${embedUrl}?autoplay=${isPlaying ? 1 : 0}&mute=1&controls=1&rel=0`} // Kept mute=1 for autoplay reliability
            title={media.title || 'YouTube video player'}
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          ></iframe>
        </div>
      );
    }
    
    // In grid view (or other contexts if MediaRenderer is used differently)
    // This part of your original code seems to be for a different rendering context (e.g., grid direct iframe).
    // If MediaRenderer is ONLY used for lightbox videos, this path might not be hit
    // or might need its own wrapper if consistent styling is desired.
    // For now, focusing on the lightbox fix.
    return (
      <iframe
        className={className} // This would apply directly to the iframe
        src={`${embedUrl}?autoplay=${isPlaying ? 1 : 0}&mute=1&controls=1&rel=0`}
        title={media.title || 'YouTube video player'}
        frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
      ></iframe>
    );
  }

  // For direct video files, use the video tag
  return (
    <video
      className={className}
      src={media.src}
      poster={media.poster}
      autoPlay={isPlaying}
      muted={!isPlaying} // Consider if direct videos in lightbox should also be muted initially if autoplaying
      controls
    >
      Your browser does not support videos.
    </video>
  );
}

// --- Main MediaCarousel Component ---

export const MediaCarousel: React.FC<MediaCarouselProps> = (props) => {
  const {
    images = [],
    videos = [],
    maxImages,
    maxVideos,
    searchResults,
    visionFiltering,
    visionFilteringVideos
  } = props;

  // If searchResults is provided, map them to images (overrides images prop)
  let mappedImages: Omit<ImageMedia, 'type'>[] = images;
  if (Array.isArray(searchResults)) {
    mappedImages = searchResults
      .filter((r: any) => (typeof r.image === 'string' && r.image) || (typeof r.imageUrl === 'string' && r.imageUrl))
      .map((r: any) => ({
        src: r.image || r.imageUrl,
        alt: r.title || 'Search result image',
        source: { url: r.url || r.sourceUrl || '', title: r.title || '' },
      }));
  }


  // --- Image filtering state ---
  const [showFilteredImages, setShowFilteredImages] = React.useState(() => {
    if (visionFiltering && visionFiltering.filteringApplied) return true;
    return false;
  });
  let filteredImages = mappedImages;
  let filteringAppliedImages = false;
  let filteringWarningImages = '';
  let canToggleImages = false;
  let isSubjectiveImages = false;
  if (visionFiltering) {
    filteringAppliedImages = visionFiltering.filteringApplied;
    filteringWarningImages = visionFiltering.warning || '';
    isSubjectiveImages = !!(visionFiltering.warning && visionFiltering.warning.toLowerCase().includes('subjective'));
    if (filteringAppliedImages) {
      filteredImages = showFilteredImages ? visionFiltering.filtered : visionFiltering.all;
      canToggleImages = visionFiltering.all && visionFiltering.filtered && visionFiltering.all.length !== visionFiltering.filtered.length && !isSubjectiveImages;
    }
  }

  // --- Video filtering state ---
  const [showFilteredVideos, setShowFilteredVideos] = React.useState(() => {
    if (visionFilteringVideos && visionFilteringVideos.filteringApplied) return true;
    return false;
  });
  let filteredVideos = videos;
  let filteringAppliedVideos = false;
  let filteringWarningVideos = '';
  let canToggleVideos = false;
  let isSubjectiveVideos = false;
  if (visionFilteringVideos) {
    filteringAppliedVideos = visionFilteringVideos.filteringApplied;
    filteringWarningVideos = visionFilteringVideos.warning || '';
    isSubjectiveVideos = !!(visionFilteringVideos.warning && visionFilteringVideos.warning.toLowerCase().includes('subjective'));
    if (filteringAppliedVideos) {
      filteredVideos = showFilteredVideos ? visionFilteringVideos.filtered : visionFilteringVideos.all;
      canToggleVideos = visionFilteringVideos.all && visionFilteringVideos.filtered && visionFilteringVideos.all.length !== visionFilteringVideos.filtered.length && !isSubjectiveVideos;
    }
  }

  const limitedImages = typeof maxImages === 'number' ? filteredImages.slice(0, maxImages) : filteredImages;
  const limitedVideos = typeof maxVideos === 'number' ? filteredVideos.slice(0, maxVideos) : filteredVideos;


  // Helper: Get YouTube video ID
  function getYouTubeId(url: string): string | null {
    const match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/]{{11}})/i);
    if (match && match[1]) return match[1];
    return null;
  }

  // Patch videos: if poster is missing and it's a YouTube link, generate a thumbnail
  const patchedVideos = limitedVideos.map((vid) => {
    if (!vid.poster && (vid.src.includes('youtube.com') || vid.src.includes('youtu.be'))) {
      const id = getYouTubeId(vid.src);
      if (id) {
        return {
          ...vid,
          poster: `https://img.youtube.com/vi/${id}/hqdefault.jpg`,
        };
      }
    }
    return vid;
  });

  const allMedia: MediaItem[] = [
    ...limitedImages.map((img: Omit<ImageMedia, 'type'>) => ({ ...img, type: 'image' as const })),
    ...patchedVideos.map((vid: Omit<VideoMedia, 'type'>) => ({
      ...vid,
      type: 'video' as const,
    })),
  ];

  // DEBUG: Log allMedia to verify what is being passed to the carousel
  // console.log('[MediaCarousel] allMedia:', allMedia);

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


  return (
    <>
      {/* Filtered by AI badge and toggle for images */}
      {filteringAppliedImages && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <span style={{
            background: 'linear-gradient(90deg, #6366f1 0%, #06b6d4 100%)',
            color: 'white',
            borderRadius: 16,
            fontWeight: 600,
            fontSize: 13,
            padding: '2px 12px',
            letterSpacing: 0.2,
            boxShadow: '0 1px 6px rgba(80,80,180,0.10)',
            display: 'inline-block',
            userSelect: 'none',
          }}>Filtered by AI (Images)</span>
          {canToggleImages && (
            <>
              <button
                style={{
                  background: showFilteredImages ? '#f3f4f6' : '#e0e7ef',
                  color: '#374151',
                  border: '1px solid #c7d2fe',
                  borderRadius: 14,
                  fontSize: 12,
                  padding: '2px 10px',
                  marginLeft: 4,
                  cursor: 'pointer',
                  fontWeight: 500,
                  transition: 'background 0.2s',
                }}
                onClick={e => {
                  e.stopPropagation();
                  setShowFilteredImages(f => !f);
                }}
                title={showFilteredImages ? 'Show all images' : 'Show only relevant images'}
              >
                {showFilteredImages ? 'Show all' : 'Show only relevant'}
              </button>
              <span style={{ color: '#64748b', fontSize: 12, marginLeft: 6 }}>
                {showFilteredImages
                  ? 'Some images may have been filtered out as less relevant.'
                  : 'Some images may be less relevant.'}
              </span>
            </>
          )}
          {isSubjectiveImages && (
            <span style={{ color: '#f59e42', fontSize: 12, marginLeft: 8 }}>
              Filtering disabled for subjective or sensitive queries.
            </span>
          )}
          {filteringWarningImages && !isSubjectiveImages && (
            <span style={{ color: '#f59e42', fontSize: 12, marginLeft: 8 }}>{filteringWarningImages}</span>
          )}
        </div>
      )}

      {/* Filtered by AI badge and toggle for videos */}
      {filteringAppliedVideos && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <span style={{
            background: 'linear-gradient(90deg, #6366f1 0%, #06b6d4 100%)',
            color: 'white',
            borderRadius: 16,
            fontWeight: 600,
            fontSize: 13,
            padding: '2px 12px',
            letterSpacing: 0.2,
            boxShadow: '0 1px 6px rgba(80,80,180,0.10)',
            display: 'inline-block',
            userSelect: 'none',
          }}>Filtered by AI (Videos)</span>
          {canToggleVideos && (
            <>
              <button
                style={{
                  background: showFilteredVideos ? '#f3f4f6' : '#e0e7ef',
                  color: '#374151',
                  border: '1px solid #c7d2fe',
                  borderRadius: 14,
                  fontSize: 12,
                  padding: '2px 10px',
                  marginLeft: 4,
                  cursor: 'pointer',
                  fontWeight: 500,
                  transition: 'background 0.2s',
                }}
                onClick={e => {
                  e.stopPropagation();
                  setShowFilteredVideos(f => !f);
                }}
                title={showFilteredVideos ? 'Show all videos' : 'Show only relevant videos'}
              >
                {showFilteredVideos ? 'Show all' : 'Show only relevant'}
              </button>
              <span style={{ color: '#64748b', fontSize: 12, marginLeft: 6 }}>
                {showFilteredVideos
                  ? 'Some videos may have been filtered out as less relevant.'
                  : 'Some videos may be less relevant.'}
              </span>
            </>
          )}
          {isSubjectiveVideos && (
            <span style={{ color: '#f59e42', fontSize: 12, marginLeft: 8 }}>
              Filtering disabled for subjective or sensitive queries.
            </span>
          )}
          {filteringWarningVideos && !isSubjectiveVideos && (
            <span style={{ color: '#f59e42', fontSize: 12, marginLeft: 8 }}>{filteringWarningVideos}</span>
          )}
        </div>
      )}

      <div className={styles.mediaContainer}>
        <div className={styles.mobileSliderWrapper} onClick={() => openLightbox(currentIndex)}>
          <div className={styles.mobileMediaContainer}>
            {allMedia.map((item, index) => (
              <div key={`slide-${index}`} className={cn(styles.mobileMediaSlide, index === currentIndex ? styles.visible : styles.hidden)}>
                <img
                  src={item.type === 'image' ? item.src : (item as VideoMedia).poster || '/video-fallback.png'}
                  alt={item.type === 'image' ? (item as ImageMedia).alt : (item as VideoMedia).title}
                  className={styles.media}
                  loading="lazy"
                  onError={e => { (e.currentTarget as HTMLImageElement).src = '/placeholder-image.jpg'; }}
                />
                {item.type === 'image' && item.source && item.source.url && (
                  <a
                    href={item.source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.sourceLink}
                  >
                    {item.source.title || (item.source.url && item.source.url.replace(/^https?:\/\/(www\.)?/, '').split(/[/?#]/)[0])}
                  </a>
                )}
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
        
        <div className={styles.desktopGrid}>
          {allMedia.slice(0, 4).map((item, index) => ( // Respects the 4 video limit for the grid
            <button key={`grid-${index}`} className={styles.desktopGridItem} onClick={() => openLightbox(index)}>
              <img
                src={item.type === 'image' ? item.src : (item as VideoMedia).poster || '/video-fallback.png'}
                alt={item.type === 'image' ? (item as ImageMedia).alt : (item as VideoMedia).title}
                className={styles.media}
                loading="lazy"
                onError={e => { (e.currentTarget as HTMLImageElement).src = '/placeholder-image.jpg'; }}
              />
              {item.type === 'image' && item.source && item.source.url && (
                <a
                  href={item.source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.sourceLink}
                >
                  {item.source.title || (item.source.url && item.source.url.replace(/^https?:\/\/(www\.)?/, '').split(/[/?#]/)[0])}
                </a>
              )}
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
                <div
                  key={`lightbox-${index}`}
                  className={cn(
                    styles.lightboxItemWrapper,
                    item.type === 'video' ? styles.videoWrapper : ''
                  )}
                >
                  {item.type === 'image' ? (
                    <img src={item.src} alt={item.alt} className={styles.lightboxMedia} loading="lazy" onError={e => { (e.currentTarget as HTMLImageElement).src = '/placeholder-image.jpg'; }} />
                  ) : (
                    <MediaRenderer
                      media={item as VideoMedia}
                      isPlaying={index === selectedIndex}
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