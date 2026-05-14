# Skill: API Routes

Use when creating, reviewing, or debugging Expo Router API route handlers.

## Main rule

Keep route handlers thin and defensive: validate input, enforce auth/authorization before data access, and return consistent typed responses.

## Checks

- Confirm each endpoint handles allowed methods explicitly and rejects unsupported methods.
- Validate request params/body with schema guards before business logic executes.
- Enforce auth first for privileged operations; never rely on client-provided roles.
- Keep service-role credentials on server-only paths and avoid exposing them to client bundles.
- Confirm error responses are structured and safe (no stack traces or secret values).

## Preferred structure

- Use one route module per resource concern.
- Parse and validate request data first, then call feature/service logic.
- Keep DB and external API logic in service modules, not inline in route files.
- Use a shared response envelope pattern for success and failure paths.

## Example fix

- Problem: A `POST` route writes directly to DB with unchecked body data.
- Fix: Add schema validation, early auth check, and move write logic into a service function before returning a typed response object.

## Agent behavior

- Apply the smallest safe refactor that adds validation/auth boundaries first.
- Delegate framework primitive questions to official Expo API route guidance, then layer MDS project-specific rules (env boundaries, doc updates, Doctor compatibility).

