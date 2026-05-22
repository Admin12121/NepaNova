"use client";
import Link from "next/link";
import "swiper/css/bundle";
import { SwiperProps, SwiperSlide } from "swiper/react";
import { Slider } from "./slider";
import { GroupListItem } from "./list-item";
import { Categorty } from "@/app/(app)/(user)/collections/_components";
import { toPascalCase } from "@/lib/utils";

type Props = {
  overlay?: boolean;
  label?: string;
  selected?: string;
  route?: boolean;
  category: Categorty;
} & SwiperProps;

export const CategorySlider = ({
  overlay,
  label,
  selected,
  route,
  category,
  ...rest
}: Props) => {
  return (
    <Slider
      slidesPerView={"auto"}
      spaceBetween={10}
      loop
      freeMode
      label={label}
      overlay={overlay}
      {...rest}
    >
      {category.category.map((cat) => (
        <SwiperSlide key={cat.id || cat.name} className="content-width-slide">
          <Link href={`/collections?category=${toPascalCase(cat.name)}`}>
            <GroupListItem {...cat} selected={selected} />
          </Link>
        </SwiperSlide>
      ))}
    </Slider>
  );
};
