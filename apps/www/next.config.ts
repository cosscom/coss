import type { NextConfig } from "next";

const getCMSRewrites = async() => {
  let cmsRoutes: string[] = [];

  if (!process.env.CMS_ROUTES_API_URL) {
    return cmsRoutes;
  }

  try {
    const response = await fetch(process.env.CMS_ROUTES_API_URL, {
      next: { tags: ['cms-routes-tag'] }
    });

    const data = await response.json();

    cmsRoutes = data.routes.map((route: string) => ({
      source: `${route}`,
      destination: `${process.env.CMS_BASE_URL}${route}`,
      basePath: false,
    }));

  } catch (error) {
    console.error('Error fetching dynamic CMS routes:', error);
  }

  return cmsRoutes;
}

const nextConfig = {
  transpilePackages: ["@workspace/ui"],
  async rewrites() {
    const cmsRewrites = await getCMSRewrites();

    if (cmsRewrites.length > 0) {
      return {
        beforeFiles: cmsRewrites,
      };
    }

    return [];
  }
};

module.exports = nextConfig;
