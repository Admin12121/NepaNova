import React, { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import { Autoplay, Navigation, Pagination, EffectFade } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";
import type { Swiper as SwiperType } from "swiper";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import "swiper/css/effect-fade";
import { cn } from "@/lib/utils";

interface ImageItem {
  image: string;
  color?: string | null;
}

const DemoSlider = ({
  images,
  selectedColorCode,
}: {
  images: ImageItem[];
  selectedColorCode?: string | null;
}) => {
  const swiperRef = useRef<SwiperType | null>(null);

  useEffect(() => {
    if (!swiperRef.current || !selectedColorCode) return;
    const matchIndex = images.findIndex(
      (img) => img.color === selectedColorCode,
    );
    if (matchIndex >= 0) {
      swiperRef.current.slideToLoop(matchIndex, 400);
    }
  }, [selectedColorCode, images]);

  return (
    <section className="w-full flex items-center justify-center">
      <span className="relative w-[95dvw] flex flex-col h-[500px] m-0 dark:bg-neutral-950 rounded-lg">
        <Swiper
          onSwiper={(swiper) => {
            swiperRef.current = swiper;
          }}
          navigation
          pagination={{ type: "bullets", clickable: true }}
          autoplay={{ delay: 5000 }}
          loop={true}
          effect="fade"
          modules={[Autoplay, Navigation, Pagination, EffectFade]}
          style={{ margin: "0px" }}
          className="w-full h-[500px] rounded-lg"
        >
          {images.map((img, index) => {
            const isMatch =
              selectedColorCode && img.color === selectedColorCode;
            return (
              <SwiperSlide key={`${img.image}-${index}`}>
                <div className="h-full w-full left-0 top-0 dark:bg-neutral-950 bg-white flex items-center justify-center relative">
                  <Image
                    src={img.image}
                    className="w-full cursor-pointer h-[350px] object-contain"
                    alt={`Product image ${index + 1}`}
                    width={800}
                    height={800}
                  />
                </div>
              </SwiperSlide>
            );
          })}
        </Swiper>
      </span>
    </section>
  );
};

export default function ImageContainer({
  images,
  selectedColorCode,
}: {
  images: ImageItem[];
  selectedColorCode?: string | null;
}) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 1000);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Scroll the first matching image into view on desktop when color changes
  const matchRef = useRef<HTMLSpanElement | null>(null);
  const hasScrolled = useRef<string | null>(null);

  useEffect(() => {
    if (
      !isMobile &&
      selectedColorCode &&
      matchRef.current &&
      hasScrolled.current !== selectedColorCode
    ) {
      hasScrolled.current = selectedColorCode;
      matchRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [selectedColorCode, isMobile]);

  if (isMobile) {
    return <DemoSlider images={images} selectedColorCode={selectedColorCode} />;
  }

  let firstMatchAssigned = false;

  return (
    <>
      {images.map((img, index) => {
        const isPng = img.image.endsWith("not.png");
        const imageClassName = isPng
          ? "w-full h-full object-cover p-0 overflow-hidden"
          : "";

        const isMatch =
          selectedColorCode != null && img.color === selectedColorCode;

        // Assign ref to first matching image for scroll-into-view
        let refProp: React.Ref<HTMLSpanElement> | undefined;
        if (isMatch && !firstMatchAssigned) {
          firstMatchAssigned = true;
          refProp = matchRef;
        }

        return (
          <span
            key={index}
            ref={refProp}
            className={cn(
              "relative mmd:w-[49%] bg-white dark:bg-neutral-950 flex items-center justify-center rounded-xl p-3 transition-all duration-300",
              imageClassName,
              selectedColorCode != null &&
                !isMatch &&
                "opacity-50 hover:opacity-80",
            )}
          >
            <Image
              className={cn(
                "w-full md:min-h-[470px] h-[500px] object-contain",
                imageClassName,
              )}
              src={img.image}
              alt={`image ${index + 1}`}
              width={800}
              height={800}
            />
          </span>
        );
      })}
    </>
  );
}
