/**
 * Video Frame Extractor
 * Extracts key frames from a video for AI analysis
 */

export interface ExtractedFrame {
  dataUrl: string;
  timestamp: number; // seconds
}

/**
 * Extract key frames from a video at regular intervals
 * @param videoUrl - Base64 data URL or blob URL of the video
 * @param frameCount - Number of frames to extract (default: 8)
 * @returns Array of extracted frames as base64 data URLs
 */
export async function extractVideoFrames(
  videoUrl: string,
  frameCount: number = 8
): Promise<ExtractedFrame[]> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.muted = true;
    video.preload = 'metadata';
    
    const frames: ExtractedFrame[] = [];
    let currentFrameIndex = 0;
    let frameInterval = 0;
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      reject(new Error('Failed to get canvas context'));
      return;
    }
    
    video.onloadedmetadata = () => {
      const duration = video.duration;
      
      // Skip first and last 0.5 seconds to avoid black frames
      const startTime = Math.min(0.5, duration * 0.1);
      const endTime = Math.max(duration - 0.5, duration * 0.9);
      const effectiveDuration = endTime - startTime;
      
      frameInterval = effectiveDuration / (frameCount - 1);
      
      // Set canvas size to video dimensions (max 1280px for efficiency)
      const scale = Math.min(1, 1280 / Math.max(video.videoWidth, video.videoHeight));
      canvas.width = video.videoWidth * scale;
      canvas.height = video.videoHeight * scale;
      
      // Seek to first frame
      video.currentTime = startTime;
    };
    
    video.onseeked = () => {
      if (currentFrameIndex >= frameCount) {
        // Cleanup
        video.src = '';
        resolve(frames);
        return;
      }
      
      // Draw current frame to canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Convert to base64 JPEG (good balance of quality and size)
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      
      frames.push({
        dataUrl,
        timestamp: video.currentTime,
      });
      
      currentFrameIndex++;
      
      // Calculate next timestamp
      const duration = video.duration;
      const startTime = Math.min(0.5, duration * 0.1);
      const nextTime = startTime + (frameInterval * currentFrameIndex);
      
      if (currentFrameIndex < frameCount && nextTime < duration) {
        video.currentTime = nextTime;
      } else {
        // Done extracting
        video.src = '';
        resolve(frames);
      }
    };
    
    video.onerror = () => {
      reject(new Error('Failed to load video for frame extraction'));
    };
    
    // Set source and start loading
    video.src = videoUrl;
  });
}

/**
 * Generate a thumbnail from the first frame of a video
 */
export async function generateVideoThumbnail(videoUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.muted = true;
    video.preload = 'metadata';
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      reject(new Error('Failed to get canvas context'));
      return;
    }
    
    video.onloadedmetadata = () => {
      // Seek to 1 second or 10% of duration
      video.currentTime = Math.min(1, video.duration * 0.1);
    };
    
    video.onseeked = () => {
      const scale = Math.min(1, 320 / Math.max(video.videoWidth, video.videoHeight));
      canvas.width = video.videoWidth * scale;
      canvas.height = video.videoHeight * scale;
      
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const thumbnail = canvas.toDataURL('image/jpeg', 0.8);
      
      video.src = '';
      resolve(thumbnail);
    };
    
    video.onerror = () => {
      reject(new Error('Failed to generate thumbnail'));
    };
    
    video.src = videoUrl;
  });
}

/**
 * Format frame timestamps for display
 */
export function formatTimestamp(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
