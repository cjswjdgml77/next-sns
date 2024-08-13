/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        port: "",
        pathname: "**",
      },
      {
        protocol: "https",
        hostname: "jed-nextjs-chatapp.s3.ap-southeast-2.amazonaws.com",
      },
    ],
  },
};

export default nextConfig;
