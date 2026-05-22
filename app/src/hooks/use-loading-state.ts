/**
 * Standardized loading state management hook
 * Provides consistent loading state handling across the application
 */

import { useState } from 'react';

export interface UseLoadingStateReturn {
  isLoading: boolean;
  startLoading: () => void;
  stopLoading: () => void;
  withLoading: <T>(fn: () => Promise<T>) => Promise<T>;
}

/**
 * Hook for managing loading states consistently
 * @param initialState - Initial loading state (default: false)
 * @returns Loading state utilities
 */
export function useLoadingState(initialState = false): UseLoadingStateReturn {
  const [isLoading, setIsLoading] = useState(initialState);

  const startLoading = () => {
    setIsLoading(true);
  };

  const stopLoading = () => {
    setIsLoading(false);
  };

  /**
   * Wraps an async function with loading state management
   * Automatically sets loading to true before execution and false after
   */
  const withLoading = async <T,>(fn: () => Promise<T>): Promise<T> => {
    setIsLoading(true);
    try {
      const result = await fn();
      return result;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    startLoading,
    stopLoading,
    withLoading,
  };
}
