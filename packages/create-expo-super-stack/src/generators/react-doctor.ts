/**
 * React Doctor generator helpers for create-expo-super-stack / MDS onboarding.
 *
 * The live scaffolding path lives in `@mr.dj2u/cli` (`project-memory` + `mds run`).
 * This module re-exports the stable config/docs helpers so CESS and docs can
 * reference one generator surface.
 */

export {
  REACT_DOCTOR_CONFIG_FILE,
  REACT_DOCTOR_PACKAGE,
  REACT_DOCTOR_SCRIPT_NAME,
  REACT_DOCTOR_VERSION,
  MDS_REACT_DOCTOR_SCRIPT_NAME,
  buildDirectReactDoctorPackageScript,
  buildReactDoctorCommandInvocation,
  buildReactDoctorPackageScript,
  ensureReactDoctorConfig,
  ensureReactDoctorReadmeSection,
  isMonorepoWorkspaceRoot,
  renderReactDoctorConfig,
  renderReactDoctorReadmeSection,
  resolveReactDoctorDisabled,
  resolveReactDoctorDisabledFromEnv,
  resolveReactDoctorDisabledFromPackageJson,
} from '@mr.dj2u/cli/react-doctor';
