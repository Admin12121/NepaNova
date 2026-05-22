import { useState, useRef, DragEvent, ChangeEvent } from "react";
import { toast } from "sonner";

export const useImageUpload = (maxImages = 5) => {
  const [images, setImages] = useState<string[]>([]);
  const [productImages, setProductImages] = useState<File[]>([]);
  const [imageColors, setImageColors] = useState<Record<number, string>>({});
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [loadingIndex, setLoadingIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Pure utility functions - no need for useCallback with React 19
  const validateFile = (file: File): boolean => {
    const isValidSize = file.size <= 50 * 1024 * 1024;
    const isValidType = file.type === "image/png";
    return isValidSize && isValidType;
  };

  // Promise-based FileReader for better async handling
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsDataURL(file);
    });
  };

  const handleFiles = async (files: FileList, index: number) => {
    const validFiles: File[] = [];
    const newImagePreviews: string[] = [];

    // Validate all files first
    for (const file of Array.from(files)) {
      if (validateFile(file)) {
        if (images.length + validFiles.length < maxImages) {
          validFiles.push(file);
        }
      } else {
        toast.error(
          "Invalid File Format. Please upload a PNG image with a maximum size of 50MB.",
        );
      }
    }

    if (validFiles.length === 0) return;

    setLoadingIndex(index);

    try {
      // Process all files in parallel
      const base64Results = await Promise.all(
        validFiles.map((file) => fileToBase64(file)),
      );

      newImagePreviews.push(...base64Results);

      // Single batched state update for all images
      setImages((prev) => [...prev, ...newImagePreviews]);
      setProductImages((prev) => [...prev, ...validFiles]);
    } catch (error) {
      toast.error("Failed to process images. Please try again.");
    } finally {
      setLoadingIndex(null);
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>, index: number) => {
    e.preventDefault();
    setIsDragging(false);
    setDraggingIndex(null);

    const files = e.dataTransfer.files;
    handleFiles(files, index);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>, index: number) => {
    e.preventDefault();
    setIsDragging(true);
    setDraggingIndex(index);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
    setDraggingIndex(null);
  };

  const handleImageUpload = (index: number) => {
    setDraggingIndex(index);
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      handleFiles(files, draggingIndex || 0);
    }
  };

  const setImageColor = (index: number, colorCode: string) => {
    setImageColors((prev) => ({ ...prev, [index]: colorCode }));
  };

  const clearImageColor = (index: number) => {
    setImageColors((prev) => {
      const next = { ...prev };
      delete next[index];
      return next;
    });
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
    setProductImages((prev) => prev.filter((_, i) => i !== index));
    // Shift color assignments down and remove the deleted index
    setImageColors((prev) => {
      const next: Record<number, string> = {};
      Object.entries(prev).forEach(([key, value]) => {
        const k = Number(key);
        if (k < index) {
          next[k] = value;
        } else if (k > index) {
          next[k - 1] = value;
        }
        // k === index is removed
      });
      return next;
    });
  };

  const removeAllImages = () => {
    setImages([]);
    setProductImages([]);
    setImageColors({});
  };

  return {
    images,
    productImages,
    imageColors,
    isDragging,
    draggingIndex,
    loadingIndex,
    fileInputRef,
    handleDrop,
    handleDragOver,
    handleDragLeave,
    handleImageUpload,
    handleInputChange,
    removeImage,
    removeAllImages,
    setImageColor,
    clearImageColor,
  };
};
