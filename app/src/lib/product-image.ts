export type ProductImageInput =
  | string
  | { image?: string | null }
  | Array<string | { image?: string | null } | null | undefined>
  | null
  | undefined;

const FALLBACK_PRODUCT_IMAGE = "/logo.png";

export const getProductImageSrc = (images: ProductImageInput): string => {
  const image = Array.isArray(images) ? images[0] : images;

  if (typeof image === "string" && image.trim()) {
    return image;
  }

  if (image && typeof image === "object" && image.image?.trim()) {
    return image.image;
  }

  return FALLBACK_PRODUCT_IMAGE;
};

export const shouldCoverProductImage = (imageSrc: string): boolean => {
  const baseName = imageSrc.split("/").pop()?.split(".")[0] ?? "";
  const cleanBase = baseName.replace(/_[A-Za-z0-9]{7,}$/, "");
  return cleanBase.endsWith("not");
};
