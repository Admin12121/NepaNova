import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

const encodeCheckoutPayload = (data: object) =>
  btoa(encodeURIComponent(JSON.stringify(data))).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");

const decodeCheckoutPayload = (value: string) => {
  const base64 = value.replaceAll("-", "+").replaceAll("_", "/");
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
  return JSON.parse(decodeURIComponent(atob(padded)));
};

export const encryptData = (data: object, router: AppRouterInstance) => {
  const encodedUrl = encodeURIComponent(encodeCheckoutPayload(data));
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
  try {
    const decodedUrl = decodeURIComponent(encryptedUrl);
    return decodeCheckoutPayload(decodedUrl);
  } catch (error) {
    console.error("Failed to parse checkout data:", error);
    router.push(`/collections/`);
    return null;
  }
};
