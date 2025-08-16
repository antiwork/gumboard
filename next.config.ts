import type { NextConfig } from "next";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const withPWA = require('next-pwa')({
	dest: 'public',
	register: true,
	skipWaiting: true,
	disable: process.env.NODE_ENV === 'development',
})

const nextConfig: NextConfig = {
  /* config options here */
};

export default withPWA(nextConfig);
