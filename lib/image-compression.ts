/**
 * Image Compression Utility
 * 
 * Compresses images client-side using Canvas API to meet 1MB file size limit
 * while maintaining visual quality. Uses intelligent quality reduction and
 * dimension scaling.
 */

export interface CompressionOptions {
  maxSizeMB?: number;        // Target max size in MB (default: 1)
  maxWidthOrHeight?: number; // Max dimension in px (default: 1920)
  quality?: number;          // Initial JPEG quality 0-1 (default: 0.9)
  minWidthOrHeight?: number; // Min dimension to prevent over-scaling (default: 800)
}

export interface CompressionResult {
  blob: Blob;                // Compressed image blob
  originalSize: number;      // Original size in bytes
  compressedSize: number;    // Compressed size in bytes
  compressionRatio: number;  // Percentage reduction
  width: number;             // Final width
  height: number;            // Final height
}

/**
 * Compress an image file to meet size requirements
 * 
 * Strategy:
 * 1. First try quality reduction only (preserves dimensions)
 * 2. If still too large, scale down dimensions progressively
 * 3. Maintain aspect ratio throughout
 */
export async function compressImage(
  file: File,
  options: CompressionOptions = {}
): Promise<CompressionResult> {
  const {
    maxSizeMB = 1,
    maxWidthOrHeight = 1920,
    quality = 0.9,
    minWidthOrHeight = 800,
  } = options;

  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  const originalSize = file.size;

  // If already under limit, return original
  if (originalSize <= maxSizeBytes) {
    return {
      blob: file,
      originalSize,
      compressedSize: originalSize,
      compressionRatio: 0,
      width: 0, // Will be determined during compression
      height: 0,
    };
  }

  // Load image
  const img = await loadImage(file);
  let { width, height } = img;

  // Calculate initial dimensions (scale if needed)
  const originalWidth = width;
  const originalHeight = height;

  if (width > maxWidthOrHeight || height > maxWidthOrHeight) {
    const scale = maxWidthOrHeight / Math.max(width, height);
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }

  // Ensure we don't go below minimum dimensions
  width = Math.max(width, minWidthOrHeight);
  height = Math.max(height, minWidthOrHeight);

  // Create canvas
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  // Draw image with high quality
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, width, height);

  // Compress with progressive quality reduction
  let currentQuality = quality;
  let compressedBlob: Blob | null = null;
  let attempts = 0;
  const maxAttempts = 10;

  while (attempts < maxAttempts) {
    compressedBlob = await canvasToBlob(canvas, 'image/jpeg', currentQuality);

    if (compressedBlob.size <= maxSizeBytes) {
      break; // Target size achieved
    }

    // Reduce quality or dimensions
    if (currentQuality > 0.5) {
      currentQuality -= 0.1; // Reduce quality first
    } else if (width > minWidthOrHeight && height > minWidthOrHeight) {
      // Scale down dimensions
      const scale = 0.8;
      width = Math.round(width * scale);
      height = Math.round(height * scale);
      
      // Ensure minimum dimensions
      width = Math.max(width, minWidthOrHeight);
      height = Math.max(height, minWidthOrHeight);

      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);
    } else {
      break; // Can't reduce further
    }

    attempts++;
  }

  if (!compressedBlob) {
    throw new Error('Failed to compress image');
  }

  const compressedSize = compressedBlob.size;
  const compressionRatio = ((originalSize - compressedSize) / originalSize) * 100;

  console.log('Image compression complete:', {
    original: `${(originalSize / 1024).toFixed(2)} KB`,
    compressed: `${(compressedSize / 1024).toFixed(2)} KB`,
    reduction: `${compressionRatio.toFixed(1)}%`,
    dimensions: `${width}x${height}`,
    quality: currentQuality.toFixed(2),
  });

  return {
    blob: compressedBlob,
    originalSize,
    compressedSize,
    compressionRatio,
    width,
    height,
  };
}

/**
 * Load image from file
 */
function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Convert canvas to blob
 */
function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to create blob from canvas'));
        }
      },
      type,
      quality
    );
  });
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
