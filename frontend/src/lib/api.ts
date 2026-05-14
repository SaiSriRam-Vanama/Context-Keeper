import axios, { AxiosError } from "axios";

export const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const api = axios.create({
  baseURL: API_BASE,
  timeout: 180000,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.code === "ERR_NETWORK") {
      return Promise.reject(new Error("Cannot connect to backend. Is it running on " + API_BASE + "?"));
    }
    const detail = ((error.response?.data as Record<string, unknown>)?.detail as string) || error.message;
    return Promise.reject(new Error(detail));
  }
);

export async function withRetry<T>(fn: () => Promise<T>, retries = 3, delay = 1000): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i === retries - 1) throw err;
      console.warn(`Retry ${i + 1}/${retries} after error:`, err);
      await new Promise((r) => setTimeout(r, delay * (i + 1)));
    }
  }
  throw new Error("Retry failed");
}

export default api;
