/**
 * API Error Interceptor
 * Centralized error handling for all API requests
 */
import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";

// Error handler function
export const setupAxiosInterceptors = (
  handleUnauthorized: () => void,
  showError: (message: string) => void
) => {
  // Response interceptor for centralized error handling
  axios.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
      if (error.response) {
        const status = error.response.status;
        const data = error.response.data as any;
        const detail = data?.detail || error.message;

        switch (status) {
          case 401:
            // Unauthorized - Token expired or invalid
            console.error("[API] 401 Unauthorized:", detail);
            handleUnauthorized();
            showError("Session expired. Please login again.");
            break;

          case 403:
            // Forbidden - User doesn't have permission
            console.error("[API] 403 Forbidden:", detail);
            showError("You don't have permission to access this resource.");
            break;

          case 404:
            // Not Found
            console.error("[API] 404 Not Found:", detail);
            showError("Resource not found.");
            break;

          case 409:
            // Conflict - Resource already exists
            console.error("[API] 409 Conflict:", detail);
            showError(detail || "This resource already exists.");
            break;

          case 413:
            // Payload too large
            console.error("[API] 413 Payload Too Large:", detail);
            showError("File or message is too large.");
            break;

          case 422:
            // Unprocessable Entity - Validation error
            console.error("[API] 422 Validation Error:", detail);
            showError(detail || "Please check your input and try again.");
            break;

          case 429:
            // Too Many Requests - Rate limited
            console.error("[API] 429 Rate Limited:", detail);
            showError("Too many requests. Please try again later.");
            break;

          case 500:
            // Internal Server Error
            console.error("[API] 500 Server Error:", detail);
            showError("Server error. Please try again later.");
            break;

          case 503:
            // Service Unavailable
            console.error("[API] 503 Service Unavailable:", detail);
            showError("Service temporarily unavailable. Please try again later.");
            break;

          default:
            // Other errors
            console.error(`[API] Error ${status}:`, detail);
            showError(detail || "An error occurred. Please try again.");
        }
      } else if (error.request) {
        // Request made but no response
        console.error("[API] No response from server");
        showError("Network error. Please check your connection.");
      } else {
        // Error setting up request
        console.error("[API] Error:", error.message);
        showError("An error occurred. Please try again.");
      }

      return Promise.reject(error);
    }
  );

  // Request interceptor for adding auth token
  axios.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      const token = sessionStorage.getItem("access_token");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );
};
