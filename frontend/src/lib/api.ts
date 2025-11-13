import { firebaseAuth } from "@/integrations/firebase/client";

const API_BASE = import.meta.env.VITE_API_BASE || "";

async function getIdToken(): Promise<string | null> {
  try {
    const user = firebaseAuth.currentUser;
    if (!user) return null;
    return await user.getIdToken();
  } catch {
    return null;
  }
}

async function request<T = any>(path: string, init: RequestInit = {}, opts?: { auth?: boolean }) {
  const url = `${API_BASE}${path}`;
  const headers = new Headers(init.headers || {});
  const isFormData = typeof FormData !== "undefined" && init.body instanceof FormData;
  const isBlob = typeof Blob !== "undefined" && init.body instanceof Blob;
  if (!headers.has("Content-Type") && init.body && !isFormData && !isBlob) headers.set("Content-Type", "application/json");

  if (opts?.auth) {
    const token = await getIdToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }

  const res = await fetch(url, { ...init, headers });
  const isJson = res.headers.get("content-type")?.includes("application/json");
  const data = isJson ? await res.json() : await res.text();
  if (!res.ok) {
    const message = (isJson && data?.detail) ? data.detail : res.statusText;
    throw new Error(message || `Request failed: ${res.status}`);
  }
  return data as T;
}

export const api = {
  get: <T = any>(path: string, auth = false) => request<T>(path, { method: "GET" }, { auth }),
  post: <T = any>(path: string, body?: any, auth = false) => request<T>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined }, { auth }),
  put: <T = any>(path: string, body?: any, auth = false) => request<T>(path, { method: "PUT", body: body ? JSON.stringify(body) : undefined }, { auth }),
  patch: <T = any>(path: string, body?: any, auth = false) => request<T>(path, { method: "PATCH", body: body ? JSON.stringify(body) : undefined }, { auth }),
  delete: <T = any>(path: string, auth = false) => request<T>(path, { method: "DELETE" }, { auth }),
  upload: <T = any>(path: string, formData: FormData, auth = false) => request<T>(path, { method: "POST", body: formData }, { auth }),
};
