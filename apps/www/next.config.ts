import type { NextConfig } from "next";

const nextConfig = {
  transpilePackages: ["@workspace/ui"],
  async rewrites() {
    let cmsRoutes = [];

    try {
      const response = await fetch(process.env.CMS_ROUTES_API_URL, {
        next: { tags: ['cms-routes-tag'] }
      });

      const data = await response.json();

      cmsRoutes = data.map(route => ({
        source: `/${route.slug}`,
        destination: `${process.env.CMS_BASE_URL}/${route.slug}`,
        basePath: false,
      }));

    } catch (error) {
      console.error('Error fetching dynamic CMS routes:', error);
    }

    return [
      ...cmsRoutes,
    ];
  },
};

module.exports = nextConfig;
