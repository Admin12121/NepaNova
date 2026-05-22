import type { ImageLoaderProps } from 'next/image';

export default function customImageLoader({ src, width, quality }: ImageLoaderProps) {
  // For localhost images, return the original URL without optimization
  if (src.startsWith('http://localhost') || src.startsWith('http://127.0.0.1')) {
    return src;
  }
  
  // For other images, use default Next.js optimization
  // This is a fallback - Next.js will handle other remote images normally
  return src;
}
