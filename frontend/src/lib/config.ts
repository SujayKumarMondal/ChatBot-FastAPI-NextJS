export const getApiBaseUrl = () => {
  const configuredUrl = import.meta.env.VITE_API_URL as string | undefined;

  if (configuredUrl) {
    return configuredUrl.replace(/\/$/, "");
  }

  if (typeof window !== "undefined") {
    return window.location.origin;
  }

  if (import.meta.env.MODE === "production") {
    console.error(
      "VITE_API_URL is not configured in production. API calls and OAuth token exchange may fail."
    );
  }

  return "http://127.0.0.1:7004";
};
