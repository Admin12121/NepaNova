"use client";

import React from "react";
import { cn } from "@/lib/utils";

export function ManualImage({
  src,
  alt,
  caption,
}: {
  src: string;
  alt: string;
  caption?: string;
}) {
  const [isLoaded, setIsLoaded] = React.useState(false);
  const [hasError, setHasError] = React.useState(false);

  return (
    <figure className="my-6 overflow-hidden rounded-lg border border-border bg-muted/30">
      <div className="relative w-full overflow-hidden">
        {!isLoaded && !hasError && (
          <div className="flex h-64 items-center justify-center bg-muted/50">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground" />
          </div>
        )}
        {hasError ? (
          <div className="flex h-64 items-center justify-center bg-muted/50 text-sm text-muted-foreground">
            Image could not be loaded
          </div>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt={alt}
            className={cn(
              "w-full h-auto transition-opacity duration-300",
              isLoaded ? "opacity-100" : "opacity-0",
            )}
            onLoad={() => setIsLoaded(true)}
            onError={() => setHasError(true)}
          />
        )}
      </div>
      {caption && (
        <figcaption className="border-t border-border bg-muted/40 px-4 py-2.5 text-center text-sm text-muted-foreground">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}
