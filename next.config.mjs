/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['qlxabxhszpvetblvnfxl.supabase.co'],
  },
  // Aumentar limite de body para suportar uploads grandes (PDFs ate 50MB)
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb',
    },
  },
}

export default nextConfig
