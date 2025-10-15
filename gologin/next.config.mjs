/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  outputFileTracingRoot: process.cwd(),
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
      // Externalize gologin, puppeteer-extra and their problematic dependencies for server-side builds
      config.externals = config.externals || []
      config.externals.push({
        gologin: 'commonjs gologin',
        when: 'commonjs when',
        vertx: 'commonjs vertx',
        'puppeteer-extra': 'commonjs puppeteer-extra',
        'puppeteer-extra-plugin-stealth': 'commonjs puppeteer-extra-plugin-stealth',
        'clone-deep': 'commonjs clone-deep',
        'merge-deep': 'commonjs merge-deep',
      })
    }
    return config
  },
}

export default nextConfig
