import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: "https://coss.com" },
    { url: "https://coss.com/scheduling" },
    { url: "https://coss.com/calendar" },
    { url: "https://coss.com/email" },
    { url: "https://coss.com/sms" },
    { url: "https://coss.com/video" },
    { url: "https://coss.com/payments" },
    { url: "https://coss.com/notifications" },
    { url: "https://coss.com/auth" },
  ];
}
