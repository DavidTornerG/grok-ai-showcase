import { useEffect, useCallback } from 'react';
import { toast } from 'sonner';

interface ClipboardOptions {
  onImagePaste?: (file: File) => void;
  onTextPaste?: (text: string) => void;
  enableImagePaste?: boolean;
  enableTextPaste?: boolean;
  enabled?: boolean;
}

export function useClipboard({
  onImagePaste,
  onTextPaste,
  enableImagePaste = true,
  enableTextPaste = true,
  enabled = true
}: ClipboardOptions) {
  
  const handlePaste = useCallback(async (e: ClipboardEvent) => {
    if (!enabled) return;
    
    console.log('📋 Paste event triggered!', e);
    
    const clipboardData = e.clipboardData;
    if (!clipboardData) {
      console.warn('No clipboard data available');
      return;
    }

    // Log all available clipboard items for debugging
    console.log('Clipboard items:', Array.from(clipboardData.items).map(item => ({
      kind: item.kind,
      type: item.type
    })));

    // Handle image paste
    if (enableImagePaste && onImagePaste) {
      const items = Array.from(clipboardData.items);
      const imageItem = items.find(item => 
        item.kind === 'file' && item.type.startsWith('image/')
      );
      
      if (imageItem) {
        const file = imageItem.getAsFile();
        if (file) {
          console.log('📋 Image found in clipboard:', file.name || 'unnamed', file.type, file.size);
          // Prevent default only if we're handling an image
          e.preventDefault();
          onImagePaste(file);
          return;
        }
      }
    }

    // Handle text paste
    if (enableTextPaste && onTextPaste) {
      const text = clipboardData.getData('text/plain');
      if (text && text.trim()) {
        console.log('📋 Text found in clipboard:', text.substring(0, 50) + '...');
        // Only prevent default if we want to handle text paste
        if (!e.defaultPrevented) {
          e.preventDefault();
          onTextPaste(text);
          return;
        }
      }
    }

    // If no handlers were triggered and we have content, show a message
    if (clipboardData.items.length > 0 && !e.defaultPrevented) {
      console.log('No compatible content handlers found for clipboard data');
    }
  }, [enabled, enableImagePaste, enableTextPaste, onImagePaste, onTextPaste]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!enabled) return;
    
    // Check for Ctrl+V (or Cmd+V on Mac)
    if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
      console.log('📋 Ctrl+V detected on:', e.target);
      // Don't prevent default here - let the paste event fire naturally
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;

    console.log('🎯 Clipboard hook initialized');

    // Add event listeners with capture phase to catch events before they're handled
    document.addEventListener('paste', handlePaste, true);
    document.addEventListener('keydown', handleKeyDown, true);

    // Cleanup
    return () => {
      document.removeEventListener('paste', handlePaste, true);
      document.removeEventListener('keydown', handleKeyDown, true);
      console.log('🎯 Clipboard hook cleaned up');
    };
  }, [handlePaste, handleKeyDown, enabled]);

  // Utility function to check clipboard content
  const checkClipboard = useCallback(async () => {
    try {
      if (!navigator.clipboard) {
        console.warn('Clipboard API not available');
        return null;
      }

      const clipboardItems = await navigator.clipboard.read();
      const clipboardContent = {
        hasImage: false,
        hasText: false,
        imageTypes: [] as string[],
        textContent: ''
      };

      for (const item of clipboardItems) {
        for (const type of item.types) {
          if (type.startsWith('image/')) {
            clipboardContent.hasImage = true;
            clipboardContent.imageTypes.push(type);
          } else if (type === 'text/plain') {
            clipboardContent.hasText = true;
            const blob = await item.getType(type);
            clipboardContent.textContent = await blob.text();
          }
        }
      }

      return clipboardContent;
    } catch (error) {
      console.warn('Unable to check clipboard content:', error);
      return null;
    }
  }, []);

  return {
    checkClipboard
  };
}

// Utility function to process pasted image files
export const processClipboardImage = (
  file: File,
  maxSize: number = 2 * 1024 * 1024, // 2MB default
  maxDimension: number = 1024,
  quality: number = 0.85
): Promise<{ url: string; compressedSize: number }> => {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('File is not an image'));
      return;
    }

    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    img.onload = () => {
      try {
        let { width, height } = img;

        // Resize if too large
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = (height * maxDimension) / width;
            width = maxDimension;
          } else {
            width = (width * maxDimension) / height;
            height = maxDimension;
          }
        }

        canvas.width = width;
        canvas.height = height;

        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }

        // Enable image smoothing for better quality
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to blob
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to create blob'));
              return;
            }

            if (blob.size > maxSize) {
              reject(new Error(`Image too large after compression: ${Math.round(blob.size / 1024)}KB`));
              return;
            }

            const url = URL.createObjectURL(blob);
            resolve({
              url,
              compressedSize: blob.size
            });
          },
          'image/jpeg',
          quality
        );
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };

    img.src = URL.createObjectURL(file);
  });
}; 