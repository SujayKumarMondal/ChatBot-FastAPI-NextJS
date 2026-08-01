export const getApiBaseUrl = () => {
  const configuredUrl = import.meta.env.VITE_API_URL as string | undefined;
  return configuredUrl?.replace(/\/$/, "") || "http://127.0.0.1:7004";
};
