/** @type {import('next').NextConfig} */
const isProd = process.env.NODE_ENV === 'production';
const repo = 'Abbey_Sandbox';

const nextConfig = {
  output: 'export',
  basePath: isProd ? `/${repo}` : '',
  assetPrefix: isProd ? `/${repo}/` : '',
  trailingSlash: true,
  images: { unoptimized: true },

  async rewrites() {
    if (isProd) return [];
    return [
      { source: '/api/:path*', destination: 'http://localhost:3000/:path*' }
    ];
  }
};

export default nextConfig;

// /** @type {import('next').NextConfig} */
// const nextConfig = {
//     async rewrites() {
//         return [
//             {
//                 source: '/api/:path*',
//                 destination: 'http://localhost:3000/:path*'
//             }
//         ]
//     }
// }

// export default nextConfig