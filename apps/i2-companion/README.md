# App

## React Doctor (code quality checks)

MDS includes [React Doctor](https://github.com/millionco/react-doctor) by default.
It scans React/React Native code for hooks, performance, architecture, security, and a11y issues.
It is **not** wired into Expo/Metro startup, so it does not slow down `expo start`.

### Run it

```bash
mds run react-doctor
npm run react-doctor
```

In monorepos, `mds run react-doctor` auto-detects workspaces and scans them with `react-doctor -y`.

### Disable it

Pick any one:

1. Environment variable:
   - `MDS_REACT_DOCTOR=0`
   - `MDS_DISABLE_REACT_DOCTOR=1`
   - `REACT_DOCTOR_DISABLED=1`
2. Project config in `package.json`:
   ```json
   {
     "mds": { "reactDoctor": false }
   }
   ```
3. Or:
   ```json
   {
     "reactDoctor": { "enabled": false }
   }
   ```

Pass `--force` to `mds run react-doctor` to run once even when disabled.
