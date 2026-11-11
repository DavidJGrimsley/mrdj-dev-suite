// Resolves a public-folder asset against the Vite base path so the same source works on
// localhost (base "/") and when the hosted build is served under a subpath ("/iSquared/").
const BASE_URL = import.meta.env.BASE_URL;

export function assetUrl(path: string): string {
  return `${BASE_URL}${path.replace(/^\/+/, "")}`;
}
