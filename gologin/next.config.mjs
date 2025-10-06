/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Externalize gologin and its problematic dependencies for server-side builds
      config.externals = config.externals || []
      config.externals.push({
        gologin: 'commonjs gologin',
        when: 'commonjs when',
        vertx: 'commonjs vertx',
      })
    }
    return config
  },
}

export default nextConfig
