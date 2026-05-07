# SSR Safety Rule

Expo web routes must not assume browser-only globals are available during
render.

Warn on unguarded `window`, `document`, `localStorage`, `sessionStorage`, and
`navigator` references in route files. Prefer `useEffect`, explicit
`typeof window !== 'undefined'` guards, or a storage adapter.

