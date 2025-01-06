/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        remotePatterns: [
            {
				protocol: 'https',
				hostname: 'd27xedqsgf2j8l.cloudfront.net',
				pathname: '/**',
			}
        ],
    },
};

export default nextConfig;
