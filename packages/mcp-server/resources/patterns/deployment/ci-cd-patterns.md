# CI/CD Patterns

## Description

CI/CD patterns involve automating build, test, and deployment workflows using GitHub Actions (or similar platforms). This ensures code quality, consistency, and rapid iteration by running automated checks on every commit and deploying when tests pass.

## When to Use

**Implement CI/CD when:**
- ✅ Need automated testing on every push
- ✅ Want to prevent broken code from merging
- ✅ Automating app builds and deployment
- ✅ Need consistent deployment process
- ✅ Managing multiple environments (dev, staging, production)
- ✅ Running linting, type checking, and formatting
- ✅ Building native apps (iOS/Android)

## Core Concepts

**CI/CD Pipeline Stages:**
```
1. Trigger      → Code push to GitHub
2. Install      → Install dependencies
3. Lint         → ESLint, TypeScript type check
4. Test         → Run test suite
5. Build        → Compile app for platforms
6. Deploy       → Release to stores or hosting
```

**Key Workflow Components:**
1. Workflows trigger on events (push, PR)
2. Jobs run on runners (ubuntu, macos, windows)
3. Steps execute commands and actions
4. Artifacts store build outputs
5. Secrets manage sensitive credentials
6. Caching optimizes performance

## Code Examples

### Basic GitHub Actions Workflow

```yaml
# File: .github/workflows/test.yml
name: Test & Lint

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  lint-and-test:
    runs-on: ubuntu-latest
    
    steps:
      # Check out code
      - uses: actions/checkout@v4
      
      # Setup Node
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      
      # Install dependencies
      - name: Install dependencies
        run: npm install
      
      # Run ESLint
      - name: Lint code
        run: npm run lint
      
      # Type check
      - name: Type check
        run: npm run type-check
      
      # Run tests
      - name: Run tests
        run: npm test
```

### Build Workflow

```yaml
# File: .github/workflows/build.yml
name: Build App

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build-web:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      
      - name: Install dependencies
        run: npm install
      
      - name: Build web
        run: npm run build
      
      - name: Upload build artifact
        uses: actions/upload-artifact@v4
        with:
          name: web-build
          path: dist/
          retention-days: 7

  build-android:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      
      - name: Setup Java
        uses: actions/setup-java@v4
        with:
          java-version: 17
          distribution: temurin
      
      - name: Install dependencies
        run: npm install
      
      - name: Build Android APK
        run: eas build --platform android --local
      
      - name: Upload APK
        uses: actions/upload-artifact@v4
        with:
          name: android-build
          path: dist/
```

### Deploy Workflow

```yaml
# File: .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]
    paths:
      - 'src/**'
      - 'package.json'

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    environment: production
    
    steps:
      - uses: actions/checkout@v4
      
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      
      - name: Install dependencies
        run: npm install
      
      - name: Build app
        run: npm run build
        env:
          NODE_ENV: production
      
      - name: Deploy to production
        run: npm run deploy
        env:
          DEPLOY_TOKEN: ${{ secrets.DEPLOY_TOKEN }}
          API_URL: ${{ secrets.PROD_API_URL }}
      
      - name: Notify deployment
        if: success()
        uses: actions/github-script@v7
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: '✅ Deployed to production'
            })
```

### EAS Build CI/CD

```yaml
# File: .github/workflows/eas-build.yml
name: EAS Build

on:
  push:
    branches: [main, develop]
  workflow_dispatch:

jobs:
  build:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      
      - name: Setup Expo
        uses: expo/expo-github-action@v8
        with:
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}
      
      - name: Install dependencies
        run: npm install
      
      - name: Build preview
        run: eas build --platform all --profile preview
      
      - name: Build production
        if: github.ref == 'refs/heads/main'
        run: eas build --platform all --profile production
      
      - name: Submit to stores
        if: github.ref == 'refs/heads/main'
        run: eas submit --platform all --latest
```

### Monorepo Workflow

```yaml
# File: .github/workflows/monorepo.yml
name: Monorepo Build

on:
  push:
    branches: [main]
  pull_request:

jobs:
  build:
    runs-on: ubuntu-latest
    
    strategy:
      matrix:
        package: [app1, app2, packages/ui]
    
    steps:
      - uses: actions/checkout@v4
      
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      
      - name: Install dependencies
        run: npm install
      
      - name: Build ${{ matrix.package }}
        run: npm --filter ${{ matrix.package }} run build
      
      - name: Test ${{ matrix.package }}
        run: npm --filter ${{ matrix.package }} run test
```

### Matrix Strategy for Multiple Platforms

```yaml
# File: .github/workflows/matrix.yml
name: Cross-Platform Build

on: [push, pull_request]

jobs:
  build:
    runs-on: ${{ matrix.os }}
    
    strategy:
      matrix:
        os: [ubuntu-latest, macos-latest, windows-latest]
        node-version: [18, 20]
    
    steps:
      - uses: actions/checkout@v4
      
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'
      
      - name: Install dependencies
        run: npm install
      
      - name: Run tests
        run: npm test
      
      - name: Upload coverage
        uses: codecov/codecov-action@v4
        if: matrix.os == 'ubuntu-latest' && matrix.node-version == '20'
        with:
          token: ${{ secrets.CODECOV_TOKEN }}
```

### Conditional Deployment

```yaml
# File: .github/workflows/conditional-deploy.yml
name: Conditional Deployment

on:
  push:
    branches: [main, develop]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      
      - name: Install and build
        run: npm install && npm run build
      
      - name: Deploy to staging
        if: github.ref == 'refs/heads/develop'
        run: npm run deploy:staging
        env:
          DEPLOY_URL: ${{ secrets.STAGING_URL }}
      
      - name: Deploy to production
        if: github.ref == 'refs/heads/main' && github.event_name == 'push'
        run: npm run deploy:production
        env:
          DEPLOY_URL: ${{ secrets.PROD_URL }}
      
      - name: Slack notification
        if: always()
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

## CI/CD Best Practices

### ✅ DO

1. **Run tests on every push**
   ```yaml
   on:
     push:
       branches: [main]
     pull_request:
       branches: [main]
   ```

2. **Use matrix for multiple environments**
   ```yaml
   strategy:
     matrix:
       os: [ubuntu, macos, windows]
       node-version: [18, 20]
   ```

3. **Cache dependencies**
   ```yaml
   - uses: actions/setup-node@v4
     with:
       cache: 'npm'
   ```

4. **Separate workflows by purpose**
   ```
   workflows/
   ├── test.yml
   ├── build.yml
   ├── deploy.yml
   ├── eas-build.yml
   ```

### ❌ DON'T

1. **Don't skip tests before deployment**
   ```yaml
   # ❌ WRONG - Deploys without testing
   - run: npm deploy
   
   # ✅ RIGHT - Test first
   - run: npm test
   - run: npm run build
   - run: npm deploy
   ```

2. **Don't hardcode secrets**
   ```yaml
   # ❌ WRONG
   env:
     API_KEY: "sk-123456"
   
   # ✅ RIGHT - Use GitHub Secrets
   env:
     API_KEY: ${{ secrets.API_KEY }}
   ```

3. **Don't deploy on pull requests**
   ```yaml
   # ❌ WRONG
   on: [pull_request]
   
   # ✅ RIGHT - Deploy only on main branch
   on:
     push:
       branches: [main]
   ```

## Related Patterns

- [Build Configuration](./build-configuration.md) — Metro, EAS, Babel setup
- [Environment Configuration](./environment-config.md) — Environment variables
- [Hosting Setup](./hosting-setup.md) — Deployment targets

---

*Pattern extracted from production repositories: time2pay, core-monorepo*
*Files: .github/workflows/*.yml, EAS build configuration*