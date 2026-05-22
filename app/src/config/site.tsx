import { Metadata } from "next";
import { FooterItem } from "@/types/type";

export const siteConfig = {
  title: "Alphasuits",
  name: "Alphasuits",
  shortName: "Alphasuits",
  url: "https://alphasuits.com.np",
  ogImage: "https://alphasuits.com.np/og.jpg",
  description:
    "Nepali clothing brand. Premium suits, coats, and pants. For every type of SHIRTING AND SUITING.",
  links: {
    instagram: "https://www.instagram.com/alphasuits0/",
    facebook: "https://www.facebook.com/alphasuits0",
    tiktok: "https://www.tiktok.com/@alphasuits0",
    mail: "mailto:info@alphasuits.com.np",
  },
  footerNav: [
    {
      title: "Support",
      items: [
        {
          title: "About",
          href: "/about",
          external: false,
        },
        {
          title: "Contacts",
          href: "/contacts",
          external: false,
        },
        {
          title: "FAQ",
          href: "/faq",
          external: false,
        },
      ],
    },
    {
      title: "Social",
      items: [
        {
          title: "Instagram",
          href: "https://www.instagram.com/alphasuits0/",
          external: true,
        },
        {
          title: "Facebook",
          href: "https://www.facebook.com/alphasuits0",
          external: true,
        },
        {
          title: "TikTok",
          href: "https://www.tiktok.com/@alphasuits0",
          external: true,
        },
      ],
    },
  ] satisfies FooterItem[],
};

export type SiteConfig = typeof siteConfig;

export const META_THEME_COLORS = {
  light: "#ffffff",
  dark: "#09090b",
};

export function absoluteUrl(path: string) {
  return `${process.env.NEXTAUTH_URL}/${path}`;
}

export function constructMetadata({
  title = siteConfig.title,
  description = siteConfig.description,
  image = siteConfig.ogImage,
  keywords = [],
  ...props
}: {
  title?: string;
  description?: string;
  image?: string;
  keywords?: string[];
  [key: string]: Metadata[keyof Metadata];
}): Metadata {
  const baseKeywords = [
    "Alphasuits",
    "Nepali clothing brand",
    "Premium suits",
    "Coats",
    "Pants",
    "Shirting and Suiting",
    "Tailored suits Nepal",
    "Menswear",
  ];

  const baseUrl = process.env.NEXTAUTH_URL || siteConfig.url;
  return {
    title,
    description,
    keywords: [...baseKeywords, ...keywords],
    openGraph: {
      title,
      description,
      type: "website",
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: `${title} - Premium Suits and Clothing`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
      creator: "@alphasuits0",
    },
    icons: {
      icon: "/favicon.ico",
      apple: "/apple-touch-icon.png",
    },
    metadataBase: new URL(baseUrl),
    authors: [
      {
        name: "Admin12121",
        url: "https://biki.com.np",
      },
    ],
    creator: "Admin12121",
    robots: "index, follow",
    ...props,
  };
}
