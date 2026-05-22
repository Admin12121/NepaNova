import { useState } from 'react';
import { maybeEmitUnauthorizedFromResponse } from "@/lib/auth-logout";

type FetchConfig = {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  data?: unknown;
};

type UseApiResponse<T> = {
  data: T | null;
  error: string | null;
  isLoading: boolean;
  fetchData: (config: FetchConfig) => Promise<void>;
};

function useApi<T>(): UseApiResponse<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchData = async (config: FetchConfig) => {
    setIsLoading(true);
    setError('');
    setData(null);

    try {
      const response = await fetch(config.url, {
        method: config.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...config.headers,
        },
        body: config.data ? JSON.stringify(config.data) : undefined,
      });

      await maybeEmitUnauthorizedFromResponse(response, config.headers);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData?.error || `HTTP error! status: ${response.status}`);
      }

      const responseData: T = await response.json();
      setData(responseData);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message || 'An error occurred. Please try again.');
      } else {
        setError('An unexpected error occurred.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return { data, error, isLoading, fetchData };
}

export default useApi;
