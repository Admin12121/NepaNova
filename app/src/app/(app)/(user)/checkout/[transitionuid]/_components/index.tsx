"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import { v4 as uuidv4 } from "uuid";
import { decryptData } from "@/lib/transition";
import { useRouter } from "nextjs-toploader/app";
import {
  useCheckout_productsQuery,
  useVerifyRedeemCodeMutation,
  usePostSaleMutation,
  useClearCartMutation,
} from "@/lib/store/Service/api";
import Voucher, { VoucherSkleton } from "./voucher";
import { Card, CardContent as CardBody } from "@/components/ui/card";
import GradientText from "@/components/global/gradient-text";
import { useAuthUser } from "@/hooks/use-auth-user";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import * as z from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import GlassCard from "@/components/global/glass-card";
import Address from "./address";
import { delay } from "@/lib/utils";
import { handleClick } from "./animation";
import Icons from "@/components/navbar/cart/icons";
import { useDecryptedData } from "@/hooks/dec-data";
import { useCart } from "@/lib/cart-context";

interface Product {
  product: number;
  variant: number;
  pcs: number;
}

interface State {
  redeemData: any;
  discount: number;
  productData: Product[];
  cartItemsWithDetails: any[];
  totalPrice: { price: number; symbol: string };
  totalPriceAfterDiscount: { price: number; symbol: string };
  shipping: string;
}

type Action =
  | { type: "SET_REDEEM_DATA"; payload: any }
  | { type: "SET_DISCOUNT"; payload: number }
  | { type: "SET_CART_ITEMS_WITH_DETAILS"; payload: any[] }
  | { type: "SET_TOTAL_PRICE"; payload: { price: number; symbol: string } }
  | {
      type: "SET_TOTAL_PRICE_AFTER_DISCOUNT";
      payload: { price: number; symbol: string };
    }
  | { type: "SET_SHIPPING"; payload: string };

const initialState: State = {
  redeemData: null,
  discount: 0,
  productData: [],
  cartItemsWithDetails: [],
  totalPrice: { price: 0, symbol: "" },
  totalPriceAfterDiscount: { price: 0, symbol: "" },
  shipping: "",
};

const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case "SET_REDEEM_DATA":
      return { ...state, redeemData: action.payload };
    case "SET_DISCOUNT":
      return { ...state, discount: action.payload };
    case "SET_CART_ITEMS_WITH_DETAILS":
      return { ...state, cartItemsWithDetails: action.payload };
    case "SET_TOTAL_PRICE":
      return { ...state, totalPrice: action.payload };
    case "SET_TOTAL_PRICE_AFTER_DISCOUNT":
      return { ...state, totalPriceAfterDiscount: action.payload };
    case "SET_SHIPPING":
      return { ...state, shipping: action.payload };
    default:
      return state;
  }
};

const schema = z.object({
  code: z.string().min(1, { message: "Code is required" }),
});

const Checkout = ({ params }: { params: string }) => {
  const router = useRouter();
  const { accessToken, user } = useAuthUser();
  const [source, setSource] = useState<boolean>(false);
  const [repayment, setRepayment] = useState<boolean>(false);
  const [tranuid, setTranuid] = useState<string>("");
  const [defadd, setDefadd] = useState<string>("");
  const [redeemCode, { isLoading }] = useVerifyRedeemCodeMutation();
  const [postSale, { isLoading: placingOrder }] = usePostSaleMutation();
  const isSubmittingRef = useRef(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [clearCart] = useClearCartMutation();
  const { setCartItems } = useCart();
  const [state, dispatch] = useReducer(reducer, {
    ...initialState,
    productData: decryptData(params, router) || [],
  });

  useEffect(() => {
    const data = decryptData(params, router);
    setSource(data?.[0]?.source === "cart");
    if (data?.[0]?.transactionuid) {
      setRepayment(true);
      setTranuid(data[0].transactionuid);
      if (data?.[0]?.address) setDefadd(data[0].address);
    }
  }, [accessToken, router]);

  const productIds = useMemo(
    () => Array.from(new Set(state.productData.map((item) => item.product))),
    [state.productData],
  );

  const { data: checkout_products, isLoading: productLoading } =
    useCheckout_productsQuery(
      { ids: productIds, token: accessToken },
      { skip: productIds.length === 0 },
    );
  type CheckoutProductsResponse = { results: any[] };
  const { data: products } = useDecryptedData(
    checkout_products,
    productLoading,
  );
  const productsResp = products as CheckoutProductsResponse | undefined;

  const totalPieces = useMemo(() => {
    return state.productData.reduce((acc, item) => acc + (item.pcs ?? 0), 0);
  }, [state.productData]);

  const getCartItemsWithDetails = useCallback(() => {
    if (!productsResp) return [];
    return state.productData
      .map((cartItem) => {
        const product = productsResp.results.find(
          (p: any) => p.id === cartItem.product,
        );
        if (!product) return null;

        const variantDetails = Array.isArray(product.variants)
          ? product.variants.find((v: any) => v.id === cartItem.variant)
          : product.variants;

        return {
          ...cartItem,
          categoryname: product.categoryname,
          description: product.description,
          images: product.images,
          product_name: product.product_name,
          productslug: product.productslug,
          variantDetails: variantDetails || {},
        };
      })
      .filter((item) => item !== null);
  }, [productsResp, state.productData]);

  const getTotalPrice = (items: any[]) => {
    return items.reduce(
      (acc, item) => {
        const price = parseFloat(item.variantDetails.price);
        const discount = item.variantDetails.discount;
        const pcs = item.pcs ?? 0;
        const finalPrice = Number(
          (price - price * (discount / 100)).toFixed(2),
        );
        acc.totalPrice += finalPrice * pcs;
        return acc;
      },
      { totalPrice: 0 },
    );
  };

  const calculateDiscount = (totalPrice: number, discountData: any) => {
    if (discountData.type === "percentage") {
      return Number((totalPrice * (discountData.discount / 100)).toFixed(2));
    } else if (discountData.type === "amount") {
      return discountData.discount;
    }
    return 0;
  };

  const applyDiscount = (discountAmount: number) => {
    const newTotalPrice = state.totalPrice.price - discountAmount;
    dispatch({
      type: "SET_TOTAL_PRICE_AFTER_DISCOUNT",
      payload: { price: newTotalPrice, symbol: state.totalPrice.symbol },
    });
  };

  useEffect(() => {
    const itemsWithDetails = getCartItemsWithDetails();
    const { totalPrice } = getTotalPrice(itemsWithDetails);
    dispatch({
      type: "SET_CART_ITEMS_WITH_DETAILS",
      payload: itemsWithDetails,
    });
    dispatch({
      type: "SET_TOTAL_PRICE",
      payload: { price: totalPrice, symbol: "रु" },
    });
  }, [products]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: z.infer<typeof schema>) => {
    const code = { code: data.code };
    const toastId = toast.loading("Verifying Redeem Code...", {
      position: "top-center",
    });
    const res = await redeemCode({ code: code, token: accessToken });
    if (res.data) {
      toast.success("Code Verified", {
        id: toastId,
        position: "top-center",
      });
    } else {
      toast.error((res.error as any).data?.error || "Something went wrong!", {
        id: toastId,
        position: "top-center",
      });
      setError("code", { message: (res.error as any).data?.error });
      return;
    }

    dispatch({ type: "SET_REDEEM_DATA", payload: res.data });
    const minPPrice = res.data.minimum;
    if (state.totalPrice.price > minPPrice) {
      const discountAmount = calculateDiscount(
        state.totalPrice.price,
        res.data,
      );
      dispatch({ type: "SET_DISCOUNT", payload: discountAmount });
      applyDiscount(discountAmount);
      handleClick();
    } else {
      setError("code", { message: "Minimum purchase amount not met" });
    }
  };

  const placeCodOrder = useCallback(async () => {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setIsSubmitting(true);

    const toastId = toast.loading("Creating order...", {
      position: "top-center",
    });

    if (!state.shipping) {
      toast.error("Please select a shipping address first", {
        id: toastId,
        position: "top-center",
      });
      isSubmittingRef.current = false;
      setIsSubmitting(false);
      return;
    }

    const transaction_uid = tranuid || uuidv4();
    const totalAmount =
      state.totalPriceAfterDiscount.price > 0
        ? state.totalPriceAfterDiscount.price
        : state.totalPrice.price;

    const payload = {
      products: state.productData,
      sub_total: state.totalPrice.price,
      total_amt: totalAmount,
      discount: state.discount,
      redeemData: state.redeemData,
      transactionuid: transaction_uid,
      shipping: state.shipping,
      payment_method: "Cash On Delivery",
    };

    try {
      const res = await postSale({ actualData: payload, token: accessToken });
      if (res.data) {
        toast.success("Order placed. Pay cash on delivery.", {
          id: toastId,
          position: "top-center",
        });

        if (source) {
          const clearRes = await clearCart({ token: accessToken });
          if (clearRes.data) {
            localStorage.removeItem("productList");
            setCartItems([]);
          }
        }

        router.push(`/checkout/${transaction_uid}/success?method=cash`);
      } else {
        toast.error("Failed to place order", {
          id: toastId,
          position: "top-center",
        });
        isSubmittingRef.current = false;
        setIsSubmitting(false);
      }
    } catch (error: any) {
      toast.error("Failed to place order", {
        id: toastId,
        position: "top-center",
      });
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  }, [
    accessToken,
    clearCart,
    postSale,
    router,
    setCartItems,
    source,
    state.discount,
    state.productData,
    state.redeemData,
    state.shipping,
    state.totalPrice.price,
    state.totalPriceAfterDiscount.price,
    tranuid,
  ]);

  return (
    <>
      <div className="flex h-full lg:h-[90vh]">
        <div className="relative w-full flex flex-col gap-10">
          <span className="flex gap-5 flex-col">
            <GradientText element="H2" className="text-4xl font-semibold py-1">
              Proceed to Payment
            </GradientText>
            <Address
              accessToken={accessToken}
              shipping={state.shipping}
              dispatch={dispatch}
              defadd={defadd}
            />
            <VoucherSkleton loading={isLoading}>
              {state.cartItemsWithDetails &&
                state.cartItemsWithDetails.map((product: any) => {
                  return <Voucher key={Math.random()} data={product} />;
                })}
            </VoucherSkleton>
            <form onSubmit={handleSubmit(onSubmit)}>
              <span className="flex flex-col gap-2">
                <Label>Add Coupon or Gift Card</Label>
                <span className="flex gap-2">
                  <Input
                    className={cn(
                      "w-full bg-white dark:bg-neutral-950 rounded-md",
                      errors.code && "!ring-red-500 !bg-red-500/10",
                    )}
                    placeholder="Enter your code"
                    disabled={state.redeemData || repayment}
                    {...register("code")}
                  />
                  <Button
                    variant="custom"
                    type="submit"
                    loading={isLoading}
                    disabled={state.redeemData || repayment}
                  >
                    Apply
                  </Button>
                </span>
                {errors.code && (
                  <p className="text-red-500 text-xs font-normal">
                    {errors.code.message}
                  </p>
                )}
              </span>
            </form>
            <Card className="min-h-[105px] bg-white dark:bg-neutral-900 lg:mb-28">
              <CardBody className="flex text-sm gap-1 flex-col">
                <span className="flex w-full justify-between items-center">
                  <p>Subtotal • {totalPieces} items</p>
                  <p>
                    {state.totalPrice.symbol} {state.totalPrice.price}
                  </p>
                </span>
                {state.discount > 0 && (
                  <span className="flex w-full justify-between items-center">
                    <p>Discount </p>
                    <p>
                      - {state.totalPrice.symbol} {state.discount}
                    </p>
                  </span>
                )}
                <span className="flex w-full justify-between items-center">
                  <p>Shipping </p>
                  <p>Free</p>
                </span>
                <Separator
                  className="my-1 bg-zinc-800/20 dark:bg-zinc-400/50"
                  orientation="horizontal"
                />
                <span className="flex w-full justify-between items-center">
                  <p>Total </p>
                  <span className="flex gap-1">
                    <p className="text-[9px] text-zinc-500">
                      {tranuid ? "Repayment" : `(All taxes included )`}
                    </p>
                    <p>
                      {state.totalPriceAfterDiscount.price > 0
                        ? `${state.totalPriceAfterDiscount.symbol} ${state.totalPriceAfterDiscount.price}`
                        : `${state.totalPrice.symbol} ${state.totalPrice.price}`}
                    </p>
                  </span>
                </span>
              </CardBody>
            </Card>
          </span>
        </div>
      </div>
      <div className="lg:items-center relative w-full flex flex-col ">
        <GlassCard className="xs:w-full lg:w-10/12 xl:w-8/12 mt-16 py-4 p-2 !rounded-lg">
          <div className="px-2 flex flex-col gap-3">
            <span>
              <h5 className="font-bold text-base dark:text-themeTextWhite">
                Payment Method
              </h5>
              <p className="text-themeTextGray leading-tight">
                Cash On Delivery Only. No hidden fees.
              </p>
            </span>
          </div>
          <div className="w-full flex items-center justify-center flex-col pt-5 min-h-44">
            <div className="w-full overflow-hidden bg-neutral-100 dark:bg-neutral-900 rounded-lg">
              <div className="flex items-center px-4 py-3 text-[15px] justify-between leading-6 gap-3 border-b dark:border-neutral-800">
                <span className="flex items-center gap-2 font-medium">
                  Cash On Delivery
                </span>
                <Icons icons={["cash"]} className="w-auto" />
              </div>
              <div className="p-0 bg-neutral-50 dark:bg-zinc-800/50">
                <div className="flex items-center gap-4 p-2 justify-center flex-col">
                  <div className="p-5 flex items-center gap-4 justify-center flex-col">
                    <div className="flex items-center justify-center flex-col">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        xmlnsXlink="http://www.w3.org/1999/xlink"
                        version="1.1"
                        id="Capa_1"
                        viewBox="0 0 490 490"
                        xmlSpace="preserve"
                        className="w-32"
                      >
                        <g>
                          <path d="M259.206,167.014H0.004v91.472h259.202V167.014z M237.877,237.157H21.333v-48.813h216.544V237.157z" />
                          <path d="M259.206,51.665H142.999v93.675h116.208V51.665z M237.877,124.011h-73.549V72.994h73.549V124.011z M116.212,51.665H0.004   v93.675h116.208V51.665z M94.883,124.011H21.333V72.994h73.549V124.011z M365.202,136.449h-47.095v72.887h119.632L365.202,136.449z    M338.131,156.473h18.75l32.682,32.84h-51.432V156.473z M0,350.51v1.711h57.536c-6.84,9.01-10.91,20.23-10.91,32.39   c0,29.624,24.1,53.725,53.72,53.725c29.63,0,53.729-24.1,53.729-53.725c0-12.16-4.07-23.38-10.91-32.39h188.579   c-6.84,9.01-10.91,20.23-10.91,32.39c0,29.624,24.1,53.725,53.72,53.725c29.619,0,53.719-24.1,53.719-53.725   c0-12.16-4.07-23.38-10.91-32.39H490V199.863L379.564,91.962h-99.43v184.001L0,275.961 M100.347,417.006   c-17.862,0-32.391-14.534-32.391-32.395c0-17.861,14.529-32.39,32.391-32.39c17.861,0,32.399,14.528,32.399,32.39   C132.746,402.472,118.208,417.006,100.347,417.006z M280.135,330.892H20.024v-34.904h260.111V330.892z M374.555,417.006   c-17.861,0-32.391-14.534-32.391-32.395c0-17.861,14.529-32.39,32.391-32.39c17.861,0,32.389,14.528,32.389,32.39   C406.945,402.472,392.417,417.006,374.555,417.006z M468.671,330.892H301.464v-217.6h68.081l99.126,94.259V330.892z" />
                        </g>
                        <g></g>
                        <g></g>
                        <g></g>
                        <g></g>
                        <g></g>
                        <g></g>
                        <g></g>
                        <g></g>
                        <g></g>
                        <g></g>
                        <g></g>
                        <g></g>
                        <g></g>
                        <g></g>
                        <g></g>
                      </svg>

                      <p className="text-center dark:text-neutral-400">
                        After clicking &ldquo;Place Order&rdquo;, your order
                        will be processed and you can pay with cash upon
                        delivery.
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="custom"
                    type="button"
                    className="dark:bg-themeBlack border-none w-full"
                    onClick={placeCodOrder}
                    loading={placingOrder || isSubmitting}
                    disabled={placingOrder || isSubmitting}
                  >
                    Place Order
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </GlassCard>
      </div>
    </>
  );
};

export default Checkout;
