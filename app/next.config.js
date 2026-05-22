/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        loader: 'custom',
        loaderFile: './src/lib/image-loader.ts',
        remotePatterns: [
            {
                protocol: "https",
                hostname: "server.alphasuits.com.np",
                pathname: "/media/**",
            },
            {
                protocol: "https",
                hostname: "backendcore.vickytajpuriya.com",
                pathname: "/media/**",
            },
            {
                protocol: "https",
                hostname: "assets.aceternity.com",
                pathname: "/**",
            },
            {
                protocol: "https",
                hostname: "images.unsplash.com",
                pathname: "/**",
            },
            {
                protocol: "https",
                hostname: "i.pinimg.com",
                pathname: "/**",
            },
        ],
        formats: ["image/avif", "image/webp"],
        deviceSizes: [640, 750, 828, 1080, 1200, 1920],
        imageSizes: [16, 32, 48, 64, 96, 128, 256],
    },

    compress: true,

    productionBrowserSourceMaps: false,

    experimental: {
        optimizePackageImports: [
            "@radix-ui/react-dialog",
            "@radix-ui/react-select",
            "@radix-ui/react-dropdown-menu",
            "lucide-react",
        ],
    },
};

module.exports = nextConfig;
