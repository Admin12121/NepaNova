"use client";

import Image from "next/image";
import { Card, CardContent as CardBody } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useCallback, useDeferredValue, useMemo } from "react";
import { Button } from "@/components/ui/button";

const Voucher = ({
  data,
  price = true,
  review = false,
}: {
  data: any;
  price?: boolean;
  review?: boolean;
}) => {
  const actualprice = data.variantDetails.price;
  const discount = data.variantDetails.discount;

  const finalPrice = useMemo(() => {
    return Number((actualprice - actualprice * (discount / 100)).toFixed(2));
  }, [actualprice, discount]);
  const truncateText = useCallback(
    (text: string, maxLength: number): string => {
      return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
    },
    [],
  );
  const baseName = data.images.image.split("/").pop()?.split(".")[0] ?? "";
  const cleanBase = baseName.replace(/_[A-Za-z0-9]{7,}$/, "");
  const isFullCover = cleanBase.endsWith("not");
  const imageClassName = isFullCover ? "w-full h-full object-cover" : "";
  return (
    <Card className="p-1 w-full rounded-lg shadow-none bg-transparent h-[90px] bg-white dark:bg-neutral-900">
      <CardBody className="flex justify-between flex-row items-center h-full relative">
        <span className="flex gap-5 items-center h-full">
          <span className="h-full rounded-md w-[80px] dark:bg-zinc-700/50">
            <Image
              alt="nextui logo"
              height={100}
              src={data.images.image}
              width={80}
              className={cn(
                "w-[80px] h-full object-contain rounded-sm",
                imageClassName,
              )}
            />
          </span>
          <span className="flex items-start flex-col gap-2 justify-between h-full">
            <span className="flex flex-col gap-0">
              <p className="text-base ">
                {truncateText(data.product_name, 14)}
              </p>
              <p className="text-xs text-zinc-400">
                {data.categoryname}{" "}
                {data.variantDetails.size
                  ? ` ( ${data.variantDetails.size}cm )`
                  : ""}
              </p>
            </span>
            <span>
              <p className="text-xs text-zinc-300 pb-1">qty: {data.pcs}</p>
            </span>
          </span>
        </span>
        {price && (
          <span className="flex items-end gap-8 justify-between flex-col h-full ">
            <p className="text-sm bg-secondary-500 rounded-md text-center px-2 text-white ">
              {discount ? `-${discount}%` : "for you"}
            </p>
            <span className={cn("flex", discount > 0 && " gap-2")}>
              <p className="text-sm">
                {discount > 0 && `रु ${finalPrice * data.pcs}`}
              </p>
              <p
                className={cn(
                  "text-sm",
                  discount > 0 && "text-neutral-500 line-through",
                )}
              >
                रु {actualprice * data.pcs}
              </p>
            </span>
          </span>
        )}
        {review && <Button className="-bottom-5">Rewiew</Button>}
      </CardBody>
    </Card>
  );
};

export const Skeleton = () => {
  return (
    <div className="p-1 flex justify-between w-full rounded-md bg-white dark:bg-neutral-900 h-[90px] shadow-none">
      <div className="flex gap-1 w-60 h-full">
        <span className="min-w-[80px] h-full rounded-md bg-neutral-800/10 dark:bg-neutral-100/10 animate-pulse"></span>
        <div className="flex w-full h-full gap-1 flex-col">
          <span className="w-full rounded-md h-10 animate-pulse bg-neutral-800/10 dark:bg-neutral-100/10 "></span>
          <span className="w-1/2 rounded-md h-10 animate-pulse bg-neutral-800/10 dark:bg-neutral-100/10 "></span>
        </div>
      </div>
      <div className="h-full w-28 flex gap-1 flex-col items-end">
        <span className="w-full rounded-md h-10 animate-pulse bg-neutral-800/10 dark:bg-neutral-100/10 "></span>
        <span className="w-1/2 rounded-md h-10 animate-pulse bg-neutral-800/10 dark:bg-neutral-100/10 "></span>
      </div>
    </div>
  );
};

export const VoucherSkleton = ({
  loading,
  children,
}: {
  loading: boolean;
  children: React.ReactNode;
}) => {
  const load = useDeferredValue(loading);
  if (load) {
    return (
      <>
        {Array.from({ length: 2 }, (_, index) => (
          <Skeleton key={index} />
        ))}
      </>
    );
  }
  return <>{children}</>;
};

export default Voucher;
