import type { Viewport } from "next";
import { Metadata } from "next";
import { absoluteUrl, constructMetadata } from "@/config/site";
import localFont from "next/font/local";
import { Provider } from "@/components/provider";
import NextTopLoader from "nextjs-toploader";
import { auth } from "@/auth";
import { cookies } from "next/headers";

import "@/styles/globals.css";
import dynamic from "next/dynamic";

const Cookies = dynamic(() => import("./cookies"));

const geistSansLight = localFont({
  src: "./fonts/AtAero-Light.woff2",
  variable: "--font-geist-sans-light",
  weight: "300",
});

const geistSansRegular = localFont({
  src: "./fonts/AtAero-Regular.woff2",
  variable: "--font-geist-sans-regular",
  weight: "400",
});

const geistSansMedium = localFont({
  src: "./fonts/AtAero-Medium.woff2",
  variable: "--font-geist-sans-medium",
  weight: "500",
});

const geistSansSemibold = localFont({
  src: "./fonts/AtAero-Semibold.woff2",
  variable: "--font-geist-sans-semibold",
  weight: "600",
});

const geistSansBold = localFont({
  src: "./fonts/AtAero-Bold.woff2",
  variable: "--font-geist-sans-bold",
  weight: "700",
});

export const metadata: Metadata = constructMetadata({
  title: "Alphasuits",
  description:
    "Premium suits, coats, and pants.",
  image: absoluteUrl("/og"),
});

export const viewport: Viewport = {
  colorScheme: "dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "white" },
    { media: "(prefers-color-scheme: dark)", color: "black" },
  ],
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();
  const cookieStore = await cookies();
  const hasAccepted = cookieStore.get("accept")?.value;

  return (

    <html lang="en" suppressHydrationWarning>
      <head />
      <body
        className={`${geistSansLight.variable} ${geistSansRegular.variable} ${geistSansMedium.variable} ${geistSansSemibold.variable} ${geistSansBold.variable} antialiased flex flex-col items-center`}
      >
        <NextTopLoader
          color="linear-gradient(to right, #9353d3, #F38CB8, #FDCC92)"
          initialPosition={0.08}
          crawlSpeed={100}
          height={3}
          crawl={true}
          showSpinner={false}
          easing="ease"
          speed={100}
        />
        <Provider session={session}>
          {children}
          {!hasAccepted && <Cookies />}
        </Provider>
      </body>
    </html>
  );
}
