import React, { useEffect, useRef, useCallback } from "react";

interface InfiniteScrollProps {
  loading: boolean;
  hasMore: boolean;
  loadMore: () => void;
  children: React.ReactNode;
  className?: string;
}

const InfiniteScroll: React.FC<InfiniteScrollProps> = ({
  loading,
  hasMore,
  loadMore,
  children,
  className,
}) => {
  const observer = useRef<IntersectionObserver | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const target = entries[0];
      if (target.isIntersecting && !loading && hasMore) {
        loadMore();
      }
    },
    [loading, hasMore, loadMore]
  );

  useEffect(() => {
    if (observer.current) observer.current.disconnect();

    observer.current = new IntersectionObserver(handleObserver, {
      root: null,
      rootMargin: "200px",
      threshold: 0.1,
    });

    if (bottomRef.current) observer.current.observe(bottomRef.current);

    return () => {
      if (observer.current) observer.current.disconnect();
    };
  }, [handleObserver]);

  return (
    <div className={className}>
      {children}
      <div ref={bottomRef} style={{ height: "1px", width: "100%" }} />
    </div>
  );
};

export default InfiniteScroll;
