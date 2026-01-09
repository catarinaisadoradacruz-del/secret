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
  // Configuracao para API routes
  api: {
    bodyParser: {
      sizeLimit: '50mb',
    },
    responseLimit: false,
  },
}

export default nextConfig
