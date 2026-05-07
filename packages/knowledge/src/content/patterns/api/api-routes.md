# API Routes with Catch-All Pattern

## Description

Expo Router API routes use the `+api.ts` pattern to create server-side endpoints directly alongside client routes. The `[...segments]+api.ts` syntax creates catch-all routes that capture all path segments, enabling flexible API endpoint structures with full control over HTTP methods, CORS, and request handling.

## When to Use

**Use API routes** for:
- ✅ Backend endpoints served from same domain as frontend
- ✅ Proxy servers that forward requests upstream
- ✅ Server-side validation and data transformation
- ✅ Protected endpoints with authentication
- ✅ Catch-all routes for dynamic path handling

## Code Example

### Basic API Route (Single Endpoint)

```typescript
// File: app/api/quantum-backend/[...segments]+api.ts
import { ExpoRequest, ExpoResponse } from 'expo-server-rendering';

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS';

const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:8081',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:8081',
];

function normalizeOrigin(request: ExpoRequest): string | null {
  const origin = request.headers.get('origin');
  if (!origin) return null;
  
  return ALLOWED_ORIGINS.includes(origin) ? origin : null;
}

export async function GET(request: ExpoRequest) {
  const allowedOrigin = normalizeOrigin(request);
  
  if (request.method === 'OPTIONS') {
    return new ExpoResponse(null, {
      status: 204,
      headers: allowedOrigin
        ? { 'Access-Control-Allow-Origin': allowedOrigin }
        : {},
    });
  }

  // Handle GET request
  return new ExpoResponse(JSON.stringify({ message: 'GET OK' }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      ...(allowedOrigin && {
        'Access-Control-Allow-Origin': allowedOrigin,
      }),
    },
  });
}

export async function POST(request: ExpoRequest) {
  const allowedOrigin = normalizeOrigin(request);
  const body = await request.json();
  
  // Process request
  const result = {
    success: true,
    data: body,
  };

  return new ExpoResponse(JSON.stringify(result), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      ...(allowedOrigin && {
        'Access-Control-Allow-Origin': allowedOrigin,
      }),
    },
  });
}
```

**From:** DJsPortfolio/src/app/api/quantum-backend/[...segments]+api.ts

### Catch-All Route with Path Normalization

```typescript
// File: app/public-facing/api/quantum/v1/[...segments]+api.ts
import { ExpoRequest, ExpoResponse } from 'expo-server-rendering';

const DISALLOWED_PREFIXES = ['/v1/keys', '/v1/ibm/profiles'];
const DEFAULT_UPSTREAM_BASE_URL = 'http://127.0.0.1:8000/v1';

type ProxyMethod = 'GET' | 'HEAD' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

function normalizeUpstreamBaseUrl(): string {
  const raw = process.env.EXPO_PUBLIC_QUANTUM_API_BASE_URL?.trim();
  const base = raw || DEFAULT_UPSTREAM_BASE_URL;
  
  // Remove trailing slash
  const trimmed = base.replace(/\/+$/, '');
  
  // Ensure /v1 suffix
  return trimmed.endsWith('/v1') ? trimmed : `${trimmed}/v1`;
}

function normalizeOperationPath(pathname: string): string {
  // Remove leading/trailing slashes, lowercase
  return `/${pathname.toLowerCase().trim().replace(/^\/+|\/+$/g, '')}`;
}

export async function POST(request: ExpoRequest) {
  try {
    // Parse segments from URL
    const url = new URL(request.url);
    const pathname = url.pathname;
    
    // Extract segments after route prefix
    const segments = pathname
      .replace('/public-facing/api/quantum/v1', '')
      .split('/')
      .filter(Boolean);
    
    const operationPath = '/' + segments.join('/');
    
    // Validate disallowed paths
    for (const prefix of DISALLOWED_PREFIXES) {
      if (operationPath.startsWith(prefix)) {
        return new ExpoResponse(
          JSON.stringify({ error: 'Path not allowed' }),
          { status: 403, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }
    
    // Forward to upstream
    const upstreamUrl = normalizeUpstreamBaseUrl() + operationPath;
    const upstreamRequest = new Request(upstreamUrl, {
      method: 'POST',
      headers: request.headers,
      body: await request.text(),
    });
    
    const response = await fetch(upstreamRequest);
    return new ExpoResponse(await response.text(), {
      status: response.status,
      headers: Object.fromEntries(response.headers),
    });
  } catch (error) {
    return new ExpoResponse(
      JSON.stringify({ error: 'Internal Server Error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
```

**From:** DJsPortfolio/src/app/public-facing/api/quantum/v1/[...segments]+api.ts (lines 1-50)

## Configuration

### Enable API Routes in app.json

```json
{
  "expo": {
    "plugins": [
      [
        "expo-router",
        {
          "apiRoutes": true,
          "origin": false
        }
      ]
    ]
  }
}
```

### Environment Variables for API Base URLs

```bash
# .env or .env.production
EXPO_PUBLIC_QUANTUM_API_BASE_URL=http://127.0.0.1:8000/v1
QUANTUM_UPSTREAM_API_SECRET=your-secret-key
```

### TypeScript Setup

```typescript
import { ExpoRequest, ExpoResponse } from 'expo-server-rendering';

export type { ExpoRequest, ExpoResponse };

// Type for allowed HTTP methods
type HTTPMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';
```

## Best Practices

### ✅ DO

1. **Always validate CORS origin** before responding
   ```typescript
   const ALLOWED_ORIGINS = ['http://localhost:3000', 'https://app.example.com'];
   
   function validateOrigin(origin: string | null): boolean {
     return !!origin && ALLOWED_ORIGINS.includes(origin);
   }
   ```

2. **Normalize paths and trim trailing slashes**
   ```typescript
   function normalizePath(path: string): string {
     return path.replace(/\/+$/, '').toLowerCase();
   }
   ```

3. **Use explicit status codes**
   ```typescript
   // ✅ GOOD
   return new ExpoResponse(JSON.stringify(error), {
     status: 400,
     headers: { 'Content-Type': 'application/json' },
   });
   ```

4. **Handle disallowed paths explicitly**
   ```typescript
   const DISALLOWED_PREFIXES = ['/keys', '/credentials'];
   
   for (const prefix of DISALLOWED_PREFIXES) {
     if (operationPath.startsWith(prefix)) {
       return new ExpoResponse(
         JSON.stringify({ error: 'Forbidden' }),
         { status: 403 }
       );
     }
   }
   ```

5. **Support OPTIONS preflight requests**
   ```typescript
   if (request.method === 'OPTIONS') {
     return new ExpoResponse(null, {
       status: 204,
       headers: corsHeaders,
     });
   }
   ```

### ❌ DON'T

1. **Don't skip CORS validation**
   ```typescript
   // ❌ BAD - allows any origin
   headers: { 'Access-Control-Allow-Origin': '*' }
   
   // ✅ GOOD - restrict to known origins
   if (ALLOWED_ORIGINS.includes(origin)) {
     headers: { 'Access-Control-Allow-Origin': origin }
   }
   ```

2. **Don't expose sensitive environment variables**
   ```typescript
   // ❌ BAD
   headers: process.env.API_SECRET
   
   // ✅ GOOD - only use server-side secrets
   const secret = process.env.API_SECRET; // Used in headers, not exposed
   ```

3. **Don't pass unchecked path segments to upstream**
   ```typescript
   // ❌ BAD - could be exploited
   const upstreamUrl = baseUrl + segments;
   
   // ✅ GOOD - validate and normalize
   const validatedPath = normalizePath(segments);
   const upstreamUrl = baseUrl + validatedPath;
   ```

4. **Don't forget to handle errors**
   ```typescript
   // ❌ BAD - uncaught errors crash request
   const data = await request.json();
   
   // ✅ GOOD - catch and return error response
   try {
     const data = await request.json();
   } catch (error) {
     return new ExpoResponse(
       JSON.stringify({ error: 'Invalid JSON' }),
       { status: 400 }
     );
   }
   ```

## Related Patterns

- [File-Based Routing](./file-based-routing.md) — Route file structure
- [Error Handling](../api/error-handling.md) — Custom error classes
- [CORS Configuration](../api/cors-configuration.md) — Origin validation
- [Health Endpoints](../api/health-endpoints.md) — Health check patterns

---

*Pattern extracted from production repositories: DJsPortfolio, PokePages*
*Files: DJsPortfolio/src\app\api\quantum-backend\[...segments]+api.ts*
*Lines 1-40 of catch-all route pattern with path normalization*