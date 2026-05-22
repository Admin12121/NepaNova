"use client";
import React, { useState, useDeferredValue } from "react";
import {
  useGetUserReviewQuery,
  useGetPendingReviewsQuery,
} from "@/lib/store/Service/api";
import { useAuthUser } from "@/hooks/use-auth-user";
import { Card, CardHeader } from "@/components/ui/card";
import { ReviewsImage } from "@/types/product";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import WriteReview from "@/app/(app)/(user)/collections/[productslug]/_components/write-review";

export interface Review {
  id: number;
  user: number;
  rating: number;
  title: string;
  content: string;
  recommended: boolean;
  delivery: boolean;
  review_images: ReviewsImage[];
  created_at: string;
  product_image: string;
  product_name: string;
  category_name: string;
  productslug: string;
}

interface PendingReviewProduct {
  product_id: number;
  product_name: string;
  productslug: string;
  category_name: string;
  product_image: string | null;
  remaining_reviews: number;
}

const Reviews = () => {
  const { accessToken } = useAuthUser();
  const [filter, setFilter] = useState("recent");
  const { data, isLoading } = useGetUserReviewQuery(
    { token: accessToken, filter },
    { skip: !accessToken },
  );
  const { data: pendingData, isLoading: pendingLoading } =
    useGetPendingReviewsQuery({ token: accessToken }, { skip: !accessToken });

  return (
    <div className="min-h-screen space-y-6">
      {/* Pending Reviews Section */}
      <PendingReviewsSection
        pendingProducts={pendingData || []}
        loading={pendingLoading}
      />

      {/* Existing Reviews Section */}
      <div className="space-y-3">
        <div className="flex justify-between w-full items-center">
          <h1 className="text-lg font-medium">My Reviews</h1>
          <Select
            defaultValue="recent"
            onValueChange={(value: string) => setFilter(value)}
          >
            <SelectTrigger className="w-40 dark:bg-[#171717]">
              <SelectValue placeholder="Select a Rating" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="relevent">Oldest</SelectItem>
                <SelectItem value="recent">Most recent</SelectItem>
                <SelectItem value="rating">By Rating</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
        <ReviewsCard loading={isLoading}>
          {data?.results?.length > 0 ? (
            <div className="columns-1 sm:columns-2 lg:columns-3 gap-2">
              {data?.results.map((review: Review) => (
                <Card
                  className="mb-2 break-inside-avoid flex flex-col gap-1 p-1"
                  key={review.id}
                >
                  <Link
                    href={`/collections/${review.productslug}`}
                    className="flex flex-row gap-2 bg-white dark:bg-neutral-800 p-1 rounded-lg"
                  >
                    <Image
                      src={review.product_image}
                      alt="product"
                      width={70}
                      height={70}
                      className="rounded-md object-cover p-1 px-3 bg-zinc-950"
                    />
                    <span className="flex flex-col">
                      <p className="text-sm">{review.product_name}</p>
                      <p className="text-xs text-zinc-400">
                        {review.category_name}
                      </p>
                    </span>
                  </Link>
                  <div className="bg-white dark:bg-neutral-900 shadow rounded-lg">
                    <CardHeader className="flex flex-row items-center justify-between px-1">
                      <span>
                        {[...Array(review.rating)].map((_, index) => (
                          <span key={index}>★</span>
                        ))}
                      </span>
                      <p className="text-xs">
                        {new Date(review.created_at).toLocaleDateString(
                          "en-US",
                          {
                            month: "short",
                            year: "numeric",
                            day: "numeric",
                          },
                        )}
                      </p>
                    </CardHeader>
                    {review?.review_images?.[0]?.image && (
                      <span className="flex px-1">
                        <Image
                          src={review.review_images[0].image}
                          width={100}
                          height={100}
                          layout="responsive"
                          objectFit="cover"
                          alt={review.title}
                          className="w-full h-full object-contain rounded-lg bg-neutral-800"
                        />
                      </span>
                    )}
                    <span className="flex flex-col p-2">
                      <h1 className="text-sm font-normal">{review.title}</h1>
                      <p className="text-xs font-light">{review.content}</p>
                    </span>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <span className="space-y-2 flex flex-col items-center justify-center w-full h-full">
              <h1 className="text-xl">Reviews</h1>
              <p>Your account has no reviews. Yet.</p>
              <Link href="/collections">
                <Button>Shop Now</Button>
              </Link>
            </span>
          )}
        </ReviewsCard>
      </div>
    </div>
  );
};

const PendingReviewsSection = ({
  pendingProducts,
  loading,
}: {
  pendingProducts: PendingReviewProduct[];
  loading: boolean;
}) => {
  const [activeReviewSlug, setActiveReviewSlug] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="space-y-3">
        <h1 className="text-lg font-medium">Pending Reviews</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {Array.from({ length: 2 }, (_, index) => (
            <div
              key={index}
              className="animate-pulse bg-neutral-800/10 dark:bg-neutral-100/10 h-24 rounded-lg"
            />
          ))}
        </div>
      </div>
    );
  }

  if (!pendingProducts || pendingProducts.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <h1 className="text-lg font-medium">Pending Reviews</h1>
        <p className="text-xs text-neutral-500">
          {pendingProducts.length} product
          {pendingProducts.length !== 1 ? "s" : ""} awaiting review
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {pendingProducts.map((product) => (
          <Card
            key={product.product_id}
            className="flex flex-col gap-2 p-2 border border-dashed border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900/50"
          >
            <div className="flex flex-row gap-3 items-center">
              {product.product_image ? (
                <Image
                  src={product.product_image}
                  alt={product.product_name}
                  width={60}
                  height={60}
                  className="rounded-md object-cover p-1 px-2 bg-zinc-950 flex-shrink-0"
                />
              ) : (
                <div className="w-[60px] h-[60px] rounded-md bg-zinc-800 flex items-center justify-center flex-shrink-0">
                  <span className="text-zinc-500 text-xs">No img</span>
                </div>
              )}
              <div className="flex flex-col flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {product.product_name}
                </p>
                <p className="text-xs text-zinc-400">{product.category_name}</p>
                {product.remaining_reviews > 1 && (
                  <p className="text-xs text-neutral-500 mt-0.5">
                    {product.remaining_reviews} reviews available
                  </p>
                )}
              </div>
            </div>
            <Button
              size="sm"
              className="w-full bg-foreground text-background"
              onClick={() => setActiveReviewSlug(product.productslug)}
            >
              Write a Review
            </Button>
            <WriteReview
              product={{
                product_name: product.product_name,
                productslug: product.productslug,
                categoryname: product.category_name,
                category_name: product.category_name,
                images: product.product_image
                  ? [{ image: product.product_image }]
                  : [],
              }}
              open={activeReviewSlug === product.productslug}
              onOpenChange={(open) => {
                if (!open) setActiveReviewSlug(null);
              }}
            />
          </Card>
        ))}
      </div>
    </div>
  );
};

export const Skeleton = () => {
  return (
    <section className="w-full p-1 h-full flex flex-col gap-1 rounded-lg">
      <div className="w-full flex flex-col gap-1 animate-pulse bg-neutral-800/10 dark:bg-neutral-100/10 h-[390px] rounded-lg p-1">
        <span className="w-full flex flex-row gap-1">
          <span className="animate-pulse w-20 h-20 rounded-lg bg-neutral-800/10 dark:bg-neutral-100/10"></span>
        </span>
        <span className="w-full flex flex-row justify-between">
          <span className="animate-pulse w-32 h-7 rounded-lg bg-neutral-800/10 dark:bg-neutral-100/10"></span>
          <span className="animate-pulse w-16 h-7 rounded-lg bg-neutral-800/10 dark:bg-neutral-100/10"></span>
        </span>
        <span className="animate-pulse w-full h-full rounded-lg bg-neutral-800/10 dark:bg-neutral-100/10"></span>
        <span className="animate-pulse w-full h-28 rounded-lg bg-neutral-800/10 dark:bg-neutral-100/10"></span>
      </div>
    </section>
  );
};

const ReviewsCard = ({
  loading,
  children,
}: {
  loading: boolean;
  children: React.ReactNode;
}) => {
  const load = useDeferredValue(loading);
  if (load)
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1">
        {Array.from({ length: 3 }, (_, index) => (
          <Skeleton key={index} />
        ))}
      </div>
    );
  return <>{children}</>;
};

export default Reviews;
