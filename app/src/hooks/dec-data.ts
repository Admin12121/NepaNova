"use client";
import { useEffect, useState } from "react";
import { useAuthUser } from "./use-auth-user";

interface DecryptResult<T = Record<string, unknown>> {
  data: T | null;
  error?: string;
  loading: boolean;
}

function xorEncryptDecrypt(data: string, key: string): string {
  return Array.from(data)
    .map((char: string, index: number) =>
      String.fromCharCode(
        char.charCodeAt(0) ^ key.charCodeAt(index % key.length)
      )
    )
    .join("");
}

export function encryptData(data: Record<string, unknown>, key: string): string {
  const token = key.slice(0, 32);
  const jsonData = JSON.stringify(data);
  const encrypted = xorEncryptDecrypt(jsonData, token);
  return btoa(encrypted);
}

export function decriptData(encryptedData: { data: string }, key: string): Record<string, unknown> {
  const token = key.slice(0, 32);
  const decodedData = atob(encryptedData.data);
  const decrypted = xorEncryptDecrypt(decodedData, token);
  return JSON.parse(decrypted);
}

export function useDecryptedData<T = Record<string, unknown>>(
  encryptedData: { data: string } | null,
  isLoading: boolean,
  token?: string
): DecryptResult<T> {
  const [loading, setLoading] = useState(isLoading);
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | undefined>(undefined);
  const { accessToken } = useAuthUser();

  useEffect(() => {
    const decrypt = async () => {
      if (encryptedData && accessToken) {
        try {
          const key = token ? token : accessToken.slice(0, 32);
          const decodedData = atob(encryptedData.data);
          const decrypted = xorEncryptDecrypt(decodedData, key);
          setData(JSON.parse(decrypted) as T);
          setError(undefined);
        } catch (e) {
          setError("Failed to decrypt data");
          setData(null);
        } finally {
          setLoading(false);
        }
      }
    };

    decrypt();
  }, [encryptedData, accessToken, token]);

  return { data, error, loading };
}
