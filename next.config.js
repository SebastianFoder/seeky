/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        remotePatterns: [
            {
				protocol: 'https',
				hostname: 'seeky-thumbnails.s3.*.amazonaws.com',
				pathname: '/**',
			},
            {
				protocol: 'https',
				hostname: 'seeky-avatars.s3.*.amazonaws.com',
				pathname: '/**',
			},
        ],
    },
};

export default nextConfig;
