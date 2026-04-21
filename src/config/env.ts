const rawBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000/api";

export const ENV = {
  API_BASE_URL: rawBaseUrl.replace(/\/$/, ""),
  API_TIMEOUT_MS: Number(process.env.EXPO_PUBLIC_API_TIMEOUT_MS ?? 30000),
  APP_NAME: process.env.EXPO_PUBLIC_APP_NAME ?? "ITM Mobile App",
};
