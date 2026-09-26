import type { Dashboard, Envelope, Location } from "./types";

async function get<T>(url: string): Promise<Envelope<T>> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

export const api = {
  dashboard: () => get<Dashboard>("/api/v1/dashboard"),
  locations: (category = "all", query = "") => get<Location[]>(`/api/v1/locations?category=${encodeURIComponent(category)}&q=${encodeURIComponent(query)}&limit=526`),
};
