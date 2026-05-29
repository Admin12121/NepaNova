import { Metadata } from "next";
import { FooterItem } from "@/types/type";

export const siteConfig = {
  title: "NepaNova",
  name: "NepaNova Impact",
  shortName: "NepaNova",
  url: "https://nepanova.com",
  ogImage: "https://nepanova.com/og.jpg",
  description:
    "Purpose-driven Himalayan products funding grassroots innovation and self-reliance in Nepal.",
  links: {
    instagram: "https://www.instagram.com/nepanova_impact/",
    facebook: "https://www.facebook.com/EveryPurchaseBuildsNepal",
    tiktok: "https://www.tiktok.com/@nepanova.impact",
    mail: "mailto:info@nepanova.com",
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
          href: "https://www.instagram.com/nepanova_impact/",
          external: true,
        },
        {
          title: "Facebook",
          href: "https://www.facebook.com/EveryPurchaseBuildsNepal",
          external: true,
        },
        {
          title: "TikTok",
          href: "https://www.tiktok.com/@nepanova.impact",
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
    "NepaNova",
    "NepaNova Impact",
    "Himalayan products",
    "Himalayan tea",
    "Nepali craft",
    "Ethically sourced products",
    "National Innovation Centre",
    "Mahabir Pun",
    "Social enterprise Nepal",
    "Impact commerce",
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
          alt: `${title} - Himalayan Products With Impact`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
      creator: "@nepanova",
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
