export interface FormValues {
  productName: string;
  description: string;
  isMultiVariant: boolean;
  category: number;
  basePrice?: number | null | undefined;
  stock?: number | null | undefined;
  discount?: number | null | undefined;
  variants?: Array<{
    size?: string;
    color_code?: string;
    color_name?: string;
    price: number;
    stock: number;
    discount?: number;
  }>;
}

export interface FormData {
  id: number;
  product_name: string;
  description: string;
  productslug: string;
  category: number;
  categoryname?: string;
  rating: number;
  total_ratings: number;
  images: Image[];
  variants?: Array<Variant> | Variant;
}

export interface Comment {
  id: number;
  user: number;
  content: string;
  created_at: string;
}

export interface Product {
  id: number;
  categoryname: string;
  comments?: Comment[];
  product_name: string;
  rating: number;
  description: string;
  productslug: string;
  category: number;
  variants: VariantObject | VariantObject[];
  images: Image[];
  colors?: ProductColor[];
  has_colors?: boolean;
  has_sizes?: boolean;
}

export interface Image {
  id?: number;
  image: string;
  color?: string | null;
}

export interface ProductColor {
  color_code: string;
  color_name: string;
  image?: string | null;
}

export interface VariantObject {
  id: number;
  color?: string | null;
  color_code?: string | null;
  color_name?: string | null;
  size: string | null;
  price: number;
  discount: number;
  stock: number;
  product: number;
}

export interface Variant {
  id: number;
  color_code?: string | null;
  color_name?: string | null;
  size?: string;
  price: number;
  stock: number;
  discount?: number;
}

export interface updateFormValues {
  id: string;
  productName: string;
  description: string;
  isMultiVariant: boolean;
  category: number;
  basePrice?: number | null | undefined;
  stock?: number | null | undefined;
  discount?: number | null | undefined;
  variants?: Array<{
    id: string;
    size?: string;
    color_code?: string;
    color_name?: string;
    price: number;
    stock: number;
    discount?: number;
  }>;
}

export interface ReviewsImage {
  id: number;
  image: string;
  review: number;
}

export interface Reviews {
  id: number;
  user: number;
  rating: number;
  title: string;
  content: string;
  recommended: boolean;
  delivery: boolean;
  review_images: ReviewsImage[];
  created_at: string;
}
