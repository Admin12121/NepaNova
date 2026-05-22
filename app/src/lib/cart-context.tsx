"use client";
import React, {
  createContext,
  useRef,
  useContext,
  useState,
  useEffect,
} from "react";
import { getDecryptedProductList } from "@/lib/utils";
import {
  useCartViewQuery,
  useCartPostMutation,
  useCartDeleteMutation,
  useCartUpdateMutation,
} from "@/lib/store/Service/api";
import { useAuthUser } from "@/hooks/use-auth-user";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/error-handler";

interface CartProduct {
  user?: number;
  product: number;
  variant: number;
  pcs?: number;
}

interface HandleProps {
  product: number;
  variant: number;
  message?: string;
}

interface CartContextType {
  totalPieces: number;
  cartdata: CartProduct[];
  updateProductList: (
    newProduct: CartProduct,
    increment?: boolean,
    message?: string
  ) => void;
  HandleIncreaseItems: ({ product, variant }: HandleProps) => void;
  HandledecreaseItems: ({ product, variant }: HandleProps) => void;
  loading: boolean;
  setCartItems: React.Dispatch<React.SetStateAction<CartProduct[]>>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { status, accessToken } = useAuthUser();
  const [cartdata, setCartItems] = useState<CartProduct[]>([]);

  const [postCartItem, { isLoading: postLoading }] = useCartPostMutation();
  const [deleteCart, { isLoading: deleteLoading }] = useCartDeleteMutation();
  const [updateCart, { isLoading: updateLoading }] = useCartUpdateMutation();
  const { data: serverCart }: { data?: CartProduct[] } = useCartViewQuery(
    { token: accessToken },
    { skip: !status }
  );

  useEffect(() => {
    if (status && serverCart) {
      setCartItems(serverCart);
    } else if (!status) {
      setCartItems(getDecryptedProductList());
    }
  }, [status, serverCart]);

  const [loading, setLoading] = useState(false);

  // Removed merging logic and compareCartData

  const HandleAction = async ({
    action,
    successMessage,
    errorMessage,
  }: {
    action: () => Promise<any>;
    successMessage?: string;
    errorMessage?: string;
  }) => {
    if (status) {
      const res = await action();
      if (res.data) {
        if (successMessage) {
          toast.success(successMessage, { position: "top-center" });
        }
      } else {
        if (res.error?.data?.detail === "No Product matches the given query.") {
          // Handle specific error if needed, but don't touch localStorage for logged in user cart setup
        } else {
          const errorMsg = getErrorMessage(res.error);
          toast.error(errorMsg || errorMessage || "Something went wrong", {
            position: "top-center",
          });
        }
      }
    } else {
      setLoading(true);
      try {
        await action();
        if (successMessage) {
          toast.success(successMessage, { position: "top-center" });
        }
      } finally {
        setLoading(false);
      }
    }
  };

  // Simple calculation - React 19 compiler optimizes this automatically
  const totalPieces = cartdata.reduce((acc, item) => {
    return acc + (item.pcs ?? 0);
  }, 0);

  const updateProductList = (
    newProduct: CartProduct,
    increment: boolean = true,
    message?: string
  ): void => {
    // SEPARATE LOGIC
    if (status) {
      // Logged In: Call API directly
      if (increment) {
        // Check if item exists in cartdata to decide if POST or UPDATE
        const existingItem = cartdata.find(item => item.product === newProduct.product && item.variant === newProduct.variant);
        if (existingItem) {
          const item = {
            product: existingItem.product,
            variant: existingItem.variant,
            pcs: (existingItem.pcs || 0) + 1,
          };
          HandleAction({
            action: () => updateCart({ actualData: item, token: accessToken }),
            successMessage: message,
          });
        } else {
          const items = {
            items: [
              { id: newProduct.product, variantId: newProduct.variant, pcs: 1 },
            ],
          };
          HandleAction({
            action: () => postCartItem({ actualData: items, token: accessToken }),
            successMessage: message,
          });
        }
      } else {
        // Decrement
        const existingItem = cartdata.find(item => item.product === newProduct.product && item.variant === newProduct.variant);
        if (existingItem) {
          const newPcs = (existingItem.pcs || 0) - 1;
          if (newPcs <= 0) {
            HandleAction({
              action: () =>
                deleteCart({
                  id: existingItem.product,
                  variantId: existingItem.variant,
                  token: accessToken,
                }),
              successMessage: message,
            });
          } else {
            const item = {
              product: existingItem.product,
              variant: existingItem.variant,
              pcs: newPcs,
            };
            HandleAction({
              action: () => updateCart({ actualData: item, token: accessToken }),
              successMessage: message,
            });
          }
        }
      }
    } else {
      // Not Logged In: LocalStorage Logic
      const productList: CartProduct[] = getDecryptedProductList();
      const existingProductIndex = productList.findIndex(
        (product) =>
          product.product === newProduct.product &&
          product.variant === newProduct.variant
      );

      if (existingProductIndex > -1) {
        const existingProduct = productList[existingProductIndex];
        const currentPcs = existingProduct.pcs ?? 0;
        if (increment) {
          existingProduct.pcs = currentPcs + 1;
        } else {
          existingProduct.pcs = currentPcs - 1;
          if (existingProduct.pcs <= 0) {
            productList.splice(existingProductIndex, 1);
          }
        }
      } else if (increment) {
        productList.push({ ...newProduct, pcs: 1 });
      }

      // Update LocalStorage
      const cartData = productList.map(({ product, variant, pcs }) => ({
        product,
        variant,
        pcs
      }));
      localStorage.setItem("cart-items", JSON.stringify(cartData));

      // Update State
      HandleAction({
        action: async () => {
          setCartItems(getDecryptedProductList());
        },
        successMessage: message,
      });
    }
  };

  const HandleIncreaseItems = ({ product, variant, message }: HandleProps) => {
    const productdata = { product, variant };
    updateProductList(productdata, true, message);
  };

  const HandledecreaseItems = ({ product, variant, message }: HandleProps) => {
    const productdata = { product, variant };
    updateProductList(productdata, false, message);
  };

  return (
    <CartContext.Provider
      value={{
        cartdata,
        updateProductList,
        HandleIncreaseItems,
        HandledecreaseItems,
        totalPieces,
        loading: postLoading || deleteLoading || updateLoading || loading,
        setCartItems
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
};
