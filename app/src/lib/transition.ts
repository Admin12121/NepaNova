import CryptoJS from "crypto-js";
import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

const secretKey =
  process.env.NEXT_PUBLIC_AUTH_SECRET ||
  process.env.AUTH_SECRET ||
  "fallback-secret-key";

export const encryptData = (data: object, router: AppRouterInstance) => {
  const encurl = CryptoJS.AES.encrypt(
    JSON.stringify(data),
    secretKey,
  ).toString();
  const encodedUrl = encodeURIComponent(encurl);
  router.push(`/checkout/${encodedUrl}`);
};

interface Product {
  product: number;
  variant: number;
  pcs: number;
  source?: string;
  address?: string;
  transactionuid?: string;
}

export const decryptData = (
  encryptedUrl: string,
  router: AppRouterInstance,
): Product[] | null => {
  const decodedUrl = decodeURIComponent(encryptedUrl);
  const decrypted = CryptoJS.AES.decrypt(decodedUrl, secretKey).toString(
    CryptoJS.enc.Utf8,
  );
  try {
    const parsedDecrypted = JSON.parse(decrypted);
    return parsedDecrypted;
  } catch (error) {
    console.error("Failed to parse decrypted data:", error);
    router.push(`/collections/`);
    return null;
  }
};
