export const DASHBOARD_URL = (
  process.env.EXPO_PUBLIC_DASHBOARD_URL ?? "http://localhost:3000"
).replace(/\/+$/, "");
