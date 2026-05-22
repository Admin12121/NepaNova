/**
 * Centralized error handling utility
 * Provides consistent error message extraction and handling across the application
 */

export interface APIError {
  data?: {
    [key: string]: string[] | string;
  } & {
    detail?: string;
  };
  status?: number;
  message?: string;
}

export interface ErrorResponse {
  message: string;
  status?: number;
  details?: string[];
}

/**
 * Extracts a user-friendly error message from various error formats
 */
export function getErrorMessage(error: unknown): string {
  // Handle TypeError (network errors)
  if (error instanceof TypeError) {
    return "Network error. Please check your connection.";
  }

  // Handle Error instances
  if (error instanceof Error) {
    return error.message || "An unexpected error occurred";
  }

  // Handle API errors with data property
  if (typeof error === 'object' && error && 'data' in error) {
    const apiError = error as APIError;
    
    // Check for detail field
    if (apiError.data?.detail) {
      return apiError.data.detail;
    }

    // Extract field errors
    if (apiError.data && typeof apiError.data === 'object') {
      const errors = Object.entries(apiError.data)
        .filter(([key]) => key !== 'detail')
        .flatMap(([_, value]) => {
          if (Array.isArray(value)) {
            return value;
          }
          return [String(value)];
        });
      
      if (errors.length > 0) {
        return errors.join(", ");
      }
    }
  }

  // Handle string errors
  if (typeof error === 'string') {
    return error;
  }

  return "An unexpected error occurred";
}

/**
 * Gets detailed error information for debugging
 */
export function getErrorDetails(error: unknown): ErrorResponse {
  const message = getErrorMessage(error);
  let status: number | undefined;
  let details: string[] | undefined;

  if (typeof error === 'object' && error && 'status' in error) {
    status = (error as APIError).status;
  }

  if (typeof error === 'object' && error && 'data' in error) {
    const apiError = error as APIError;
    if (apiError.data && typeof apiError.data === 'object') {
      details = Object.entries(apiError.data)
        .flatMap(([_, value]) => {
          if (Array.isArray(value)) {
            return value;
          }
          return [String(value)];
        });
    }
  }

  return { message, status, details };
}

/**
 * Checks if an error is a specific type
 */
export function isNetworkError(error: unknown): boolean {
  return error instanceof TypeError ||
    (typeof error === 'object' && error !== null && 'message' in error && 
     (error as Error).message.includes('fetch'));
}

/**
 * Checks if error is authentication related
 */
export function isAuthError(error: unknown): boolean {
  if (typeof error === 'object' && error && 'status' in error) {
    const status = (error as APIError).status;
    return status === 401 || status === 403;
  }
  return false;
}
