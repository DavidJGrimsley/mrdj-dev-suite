# Error Handling in API Services

## Description

Structured error handling in API services uses custom error classes with status codes, error details, and proper HTTP response formatting. This ensures consistent error responses across all API endpoints with full context for debugging and client-side error handling.

## When to Use

**Use custom error handling** for:
- ✅ API endpoints that need consistent error responses
- ✅ Services that interact with external APIs or databases
- ✅ Situations where you need to distinguish error types and statuses
- ✅ Client-side error handling with structured error objects

## Code Example

### Custom Error Class Definition

```typescript
// File: src/services/quantum-key-management.ts
export class QuantumApiError extends Error {
  status: number;
  details?: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = 'QuantumApiError';
    this.status = status;
    this.details = details;
    
    // Maintain proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, QuantumApiError.prototype);
  }
}

// Usage in services
async function fetchQuantumProfile(
  bearerClient: QuantumApiClient,
  profileId: string
): Promise<IbmProfileRecord> {
  try {
    const response = await bearerClient.getProfile(profileId);
    return response;
  } catch (err) {
    if (err instanceof SdkQuantumApiError) {
      throw new QuantumApiError(
        `Failed to fetch profile: ${err.message}`,
        err.statusCode || 500,
        { originalError: err }
      );
    }
    throw new QuantumApiError(
      'Unknown error fetching profile',
      500,
      { originalError: err }
    );
  }
}
```

**From:** DJsPortfolio/src/services/quantum-key-management.ts (lines 1-60)

### SDK Client Error Mapping

```typescript
// File: src/lib/quantum-sdk-executor.ts
import { QuantumApiError as SdkQuantumApiError } from '@mr.dj2u/quantum-api';

export type QuantumSdkEndpointExecutionResult = {
  status: number;
  statusText: string;
  data: unknown;
};

async function executeQuantumEndpoint(
  input: QuantumSdkEndpointExecutionInput
): Promise<QuantumSdkEndpointExecutionResult> {
  try {
    // Select appropriate client based on auth method
    const client = input.bearerToken
      ? createQuantumBearerClient(input.baseUrl, input.bearerToken)
      : createQuantumPublicClient(input.baseUrl);

    // Execute request
    const response = await client.request({
      method: input.method,
      path: input.path,
      body: input.body,
    });

    return {
      status: response.status,
      statusText: response.statusText,
      data: response.data,
    };
  } catch (err) {
    if (err instanceof SdkQuantumApiError) {
      return {
        status: err.statusCode || 500,
        statusText: 'Error',
        data: {
          error: err.message,
          details: err.details,
        },
      };
    }
    
    return {
      status: 500,
      statusText: 'Internal Server Error',
      data: {
        error: 'Unexpected error executing endpoint',
      },
    };
  }
}
```

**From:** DJsPortfolio/src/lib/quantum-sdk-executor.ts (lines 1-50)

### Error Response Format

```typescript
// Standard error response structure
type ErrorResponse = {
  error: string;           // Human-readable error message
  status: number;          // HTTP status code
  details?: unknown;       // Additional error context
  timestamp?: string;      // When error occurred
};

// Return from API route
export async function POST(request: ExpoRequest) {
  try {
    const data = await request.json();
    const result = await processQuantumRequest(data);
    return new ExpoResponse(JSON.stringify(result), { status: 200 });
  } catch (err) {
    const errorResponse: ErrorResponse = {
      error: err instanceof Error ? err.message : 'Unknown error',
      status: err instanceof QuantumApiError ? err.status : 500,
      details: err instanceof QuantumApiError ? err.details : undefined,
      timestamp: new Date().toISOString(),
    };

    return new ExpoResponse(
      JSON.stringify(errorResponse),
      {
        status: errorResponse.status,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
```

## Configuration

### Environment-Specific Error Handling

```typescript
// config/error-handling.ts
export const errorConfig = {
  development: {
    exposeStackTraces: true,
    logErrors: true,
    verboseMessages: true,
  },
  production: {
    exposeStackTraces: false,
    logErrors: true,
    verboseMessages: false,
  },
};

export function shouldExposeErrorDetails(): boolean {
  return errorConfig[process.env.NODE_ENV || 'development'].exposeStackTraces;
}
```

### Error Logging

```typescript
// middleware/error-logger.ts
export function logError(err: Error, context?: Record<string, any>) {
  const timestamp = new Date().toISOString();
  const errorData = {
    timestamp,
    message: err.message,
    name: err.name,
    stack: err.stack,
    context,
  };

  console.error(JSON.stringify(errorData));
  
  // Could also send to external logging service
  // sendToSentry(errorData);
}
```

## Best Practices

### ✅ DO

1. **Create typed error classes** for different error scenarios
   ```typescript
   class ValidationError extends Error {
     constructor(public field: string, message: string) {
       super(message);
       this.name = 'ValidationError';
     }
   }
   
   class AuthenticationError extends Error {
     constructor(message: string) {
       super(message);
       this.name = 'AuthenticationError';
     }
   }
   ```

2. **Include status codes** with all errors
   ```typescript
   throw new ValidationError('email', 'Invalid email format');
   // Map to 400 status in handler
   ```

3. **Log errors with context** for debugging
   ```typescript
   try {
     await fetchData();
   } catch (err) {
     logError(err, {
       userId: user.id,
       action: 'fetch-profile',
       timestamp: Date.now(),
     });
   }
   ```

4. **Distinguish error types** in client responses
   ```typescript
   const statusMap = {
     ValidationError: 400,
     AuthenticationError: 401,
     NotFoundError: 404,
     ServerError: 500,
   };
   ```

### ❌ DON'T

1. **Don't expose internal error details** in production
   ```typescript
   // ❌ BAD - leaks implementation details
   return JSON.stringify({ error: err.stack });
   
   // ✅ GOOD - generic message, log details server-side
   return JSON.stringify({ error: 'Internal server error' });
   ```

2. **Don't ignore error types** from third-party libraries
   ```typescript
   // ❌ BAD - loses error context
   catch (err) {
     throw new Error('Failed');
   }
   
   // ✅ GOOD - map SDK errors to application errors
   catch (err) {
     if (err instanceof SdkError) {
       throw new ApiError(err.message, err.statusCode);
     }
   }
   ```

3. **Don't return different error formats** across endpoints
   ```typescript
   // ❌ INCONSISTENT
   Endpoint 1: { message: "Error" }
   Endpoint 2: { error: "Error" }
   Endpoint 3: { err: "Error" }
   
   // ✅ CONSISTENT
   All endpoints: { error, status, details, timestamp }
   ```

4. **Don't forget to set proper HTTP status codes**
   ```typescript
   // ❌ BAD - always returns 200
   return new ExpoResponse(JSON.stringify(error), { status: 200 });
   
   // ✅ GOOD - correct status codes
   return new ExpoResponse(
     JSON.stringify(error),
     { status: error.status || 500 }
   );
   ```

## Related Patterns

- [API Routes](./api-routes.md) — Route endpoint structure
- [CORS Configuration](./cors-configuration.md) — Origin validation
- [Health Endpoints](./health-endpoints.md) — Health check patterns

---

*Pattern extracted from production repositories: DJsPortfolio, PokePages*
*Files: f:\ReactNativeApps\DJsPortfolio\src\services\quantum-key-management.ts*
*Lines 1-60 showing custom QuantumApiError class and error handling patterns*