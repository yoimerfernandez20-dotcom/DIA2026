/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    // pdfjs-dist intenta cargar "canvas" de forma opcional (solo Node); en el navegador no hace falta.
    config.resolve.alias.canvas = false;
    return config;
  },
};
export default nextConfig;
