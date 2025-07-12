// FILE: lib/video-processor.ts

"use client"

interface VideoEmbedResult {
  html: string
  platform: string
  title?: string
  thumbnail?: string
}

export class VideoProcessor {
  // YouTube video processing
  static processYouTube(url: string): VideoEmbedResult | null {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /youtube\.com\/watch\?.*v=([^&\n?#]+)/,
    ]

    for (const pattern of patterns) {
      const match = url.match(pattern)
      if (match) {
        const videoId = match[1]
        return {
          html: `<div class="video-wrapper" style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden;">
            <iframe 
              src="https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1" 
              style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;"
              frameborder="0" 
              allowfullscreen
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            ></iframe>
          </div>`,
          platform: "youtube",
        }
      }
    }
    return null
  }

  // Vimeo video processing
  static processVimeo(url: string): VideoEmbedResult | null {
    const patterns = [
      /vimeo\.com\/(\d+)/,
      /vimeo\.com\/channels\/[\w-]+\/(\d+)/,
      /vimeo\.com\/groups\/[\w-]+\/videos\/(\d+)/,
    ]

    for (const pattern of patterns) {
      const match = url.match(pattern)
      if (match) {
        const videoId = match[1]
        return {
          html: `<div class="video-wrapper" style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden;">
            <iframe 
              src="https://player.vimeo.com/video/${videoId}?title=0&byline=0&portrait=0" 
              style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;"
              frameborder="0" 
              allowfullscreen
              allow="autoplay; fullscreen; picture-in-picture"
            ></iframe>
          </div>`,
          platform: "vimeo",
        }
      }
    }
    return null
  }

  // Loom video processing
  static processLoom(url: string): VideoEmbedResult | null {
    const match = url.match(/loom\.com\/share\/([a-zA-Z0-9]+)/)
    if (match) {
      const videoId = match[1]
      return {
        html: `<div class="video-wrapper" style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden;">
          <iframe 
            src="https://www.loom.com/embed/${videoId}" 
            style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;"
            frameborder="0" 
            allowfullscreen
          ></iframe>
        </div>`,
        platform: "loom",
      }
    }
    return null
  }

  // TikTok video processing
  static processTikTok(url: string): VideoEmbedResult | null {
    const match = url.match(/tiktok\.com\/@[\w.-]+\/video\/(\d+)/)
    if (match) {
      const videoId = match[1]
      return {
        html: `<blockquote 
          class="tiktok-embed" 
          cite="${url}" 
          data-video-id="${videoId}" 
          style="max-width: 605px; min-width: 325px; margin: 20px auto;"
        >
          <section>
            <a target="_blank" title="TikTok" href="${url}">View on TikTok</a>
          </section>
        </blockquote>
        <script async src="https://www.tiktok.com/embed.js"></script>`,
        platform: "tiktok",
      }
    }
    return null
  }

  // Twitter/X video processing
  static processTwitter(url: string): VideoEmbedResult | null {
    const patterns = [/twitter\.com\/\w+\/status\/(\d+)/, /x\.com\/\w+\/status\/(\d+)/]

    for (const pattern of patterns) {
      const match = url.match(pattern)
      if (match) {
        return {
          html: `<div class="twitter-embed-wrapper" style="margin: 20px auto; max-width: 550px;">
            <blockquote class="twitter-tweet" data-theme="light">
              <a href="${url}">View Tweet</a>
            </blockquote>
            <script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>
          </div>`,
          platform: "twitter",
        }
      }
    }
    return null
  }

  // Facebook video processing
  static processFacebook(url: string): VideoEmbedResult | null {
    const match = url.match(/facebook\.com\/.*\/videos\/(\d+)/)
    if (match) {
      const encodedUrl = encodeURIComponent(url)
      return {
        html: `<div class="video-wrapper" style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden;">
          <iframe 
            src="https://www.facebook.com/plugins/video.php?href=${encodedUrl}&show_text=0&width=560" 
            style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;"
            frameborder="0" 
            allowfullscreen
            allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
          ></iframe>
        </div>`,
        platform: "facebook",
      }
    }
    return null
  }

  // Twitch video processing
  static processTwitch(url: string): VideoEmbedResult | null {
    const videoMatch = url.match(/twitch\.tv\/videos\/(\d+)/)
    const clipMatch = url.match(/twitch\.tv\/\w+\/clip\/(\w+)/)

    if (videoMatch) {
      const videoId = videoMatch[1]
      return {
        html: `<div class="video-wrapper" style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden;">
          <iframe 
            src="https://player.twitch.tv/?video=${videoId}&parent=${window.location.hostname}" 
            style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;"
            frameborder="0" 
            allowfullscreen
          ></iframe>
        </div>`,
        platform: "twitch",
      }
    }

    if (clipMatch) {
      const clipId = clipMatch[1]
      return {
        html: `<div class="video-wrapper" style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden;">
          <iframe 
            src="https://clips.twitch.tv/embed?clip=${clipId}&parent=${window.location.hostname}" 
            style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;"
            frameborder="0" 
            allowfullscreen
          ></iframe>
        </div>`,
        platform: "twitch",
      }
    }

    return null
  }

  // Dailymotion video processing
  static processDailymotion(url: string): VideoEmbedResult | null {
    const match = url.match(/dailymotion\.com\/video\/([a-zA-Z0-9]+)/)
    if (match) {
      const videoId = match[1]
      return {
        html: `<div class="video-wrapper" style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden;">
          <iframe 
            src="https://www.dailymotion.com/embed/video/${videoId}" 
            style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;"
            frameborder="0" 
            allowfullscreen
          ></iframe>
        </div>`,
        platform: "dailymotion",
      }
    }
    return null
  }

  // Rumble video processing
  static processRumble(url: string): VideoEmbedResult | null {
    const match = url.match(/rumble\.com\/([a-zA-Z0-9-]+)/)
    if (match) {
      const videoId = match[1]
      return {
        html: `<div class="video-wrapper" style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden;">
          <iframe 
            src="https://rumble.com/embed/${videoId}/" 
            style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;"
            frameborder="0" 
            allowfullscreen
          ></iframe>
        </div>`,
        platform: "rumble",
      }
    }
    return null
  }

  // LinkedIn video processing
  static processLinkedIn(url: string): VideoEmbedResult | null {
    // LinkedIn doesn't allow direct embedding, so we create a link preview
    return {
      html: `<div class="linkedin-embed bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-6 my-4">
        <div class="flex items-center gap-3 mb-3">
          <div class="w-8 h-8 bg-blue-700 rounded flex items-center justify-center text-white font-bold">in</div>
          <div>
            <h4 class="font-semibold text-blue-800 dark:text-blue-200">LinkedIn Post</h4>
            <p class="text-sm text-blue-600 dark:text-blue-400">Click to view on LinkedIn</p>
          </div>
        </div>
        <a href="${url}" target="_blank" rel="noopener noreferrer" 
           class="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200 underline">
          View LinkedIn Post →
        </a>
      </div>`,
      platform: "linkedin",
    }
  }

  // Google Drive video processing
  static processGoogleDrive(url: string): VideoEmbedResult | null {
    const match = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9-_]+)/)
    if (match) {
      const fileId = match[1]
      return {
        html: `<div class="video-wrapper" style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden;">
          <iframe 
            src="https://drive.google.com/file/d/${fileId}/preview" 
            style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;"
            frameborder="0" 
            allowfullscreen
          ></iframe>
        </div>`,
        platform: "googledrive",
      }
    }
    return null
  }

  // Zoom recording processing
  static processZoom(url: string): VideoEmbedResult | null {
    // Zoom recordings typically require authentication, so we create a link preview
    return {
      html: `<div class="zoom-embed bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-6 my-4">
        <div class="flex items-center gap-3 mb-3">
          <div class="w-8 h-8 bg-blue-600 rounded flex items-center justify-center text-white">
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
          </div>
          <div>
            <h4 class="font-semibold text-blue-800 dark:text-blue-200">Zoom Recording</h4>
            <p class="text-sm text-blue-600 dark:text-blue-400">Click to view recording</p>
          </div>
        </div>
        <a href="${url}" target="_blank" rel="noopener noreferrer" 
           class="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200 underline">
          Open Zoom Recording →
        </a>
      </div>`,
      platform: "zoom",
    }
  }

  // Main processing function
  static async processVideoUrl(url: string, platform: string): Promise<VideoEmbedResult | null> {
    try {
      // Platform-specific processing
      switch (platform) {
        case "youtube":
          return this.processYouTube(url)
        case "vimeo":
          return this.processVimeo(url)
        case "loom":
          return this.processLoom(url)
        case "tiktok":
          return this.processTikTok(url)
        case "twitter":
          return this.processTwitter(url)
        case "facebook":
          return this.processFacebook(url)
        case "twitch":
          return this.processTwitch(url)
        case "dailymotion":
          return this.processDailymotion(url)
        case "rumble":
          return this.processRumble(url)
        case "linkedin":
          return this.processLinkedIn(url)
        case "googledrive":
          return this.processGoogleDrive(url)
        case "zoom":
          return this.processZoom(url)
        default:
          // Fallback for unknown platforms
          return {
            html: `<div class="video-embed bg-zinc-100 dark:bg-zinc-800 rounded-lg p-8 text-center my-4">
              <div class="text-2xl mb-2">🎥</div>
              <p class="font-medium">${platform.charAt(0).toUpperCase() + platform.slice(1)} Video</p>
              <a href="${url}" target="_blank" rel="noopener noreferrer" 
                 class="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200 underline mt-2 inline-block">
                View Video →
              </a>
            </div>`,
            platform,
          }
      }
    } catch (error) {
      console.error("Video processing error:", error)
      return null
    }
  }

  // Auto-detect platform from URL
  static detectPlatform(url: string): string {
    if (url.includes("youtube.com") || url.includes("youtu.be")) return "youtube"
    if (url.includes("vimeo.com")) return "vimeo"
    if (url.includes("loom.com")) return "loom"
    if (url.includes("tiktok.com")) return "tiktok"
    if (url.includes("twitter.com") || url.includes("x.com")) return "x"
    if (url.includes("facebook.com")) return "facebook"
    if (url.includes("twitch.tv")) return "twitch"
    if (url.includes("dailymotion.com")) return "dailymotion"
    if (url.includes("rumble.com")) return "rumble"
    if (url.includes("linkedin.com")) return "linkedin"
    if (url.includes("drive.google.com")) return "googledrive"
    if (url.includes("zoom.us")) return "zoom"
    return "unknown"
  }
}
