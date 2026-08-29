import { describe, expect, it } from 'vitest';

import {
  REACT_DOCTOR_PACKAGE,
  REACT_DOCTOR_VERSION,
  buildReactDoctorCommandInvocation,
  renderReactDoctorConfig,
  renderReactDoctorReadmeSection,
} from '../src/generators/react-doctor.js';

describe('create-expo-super-stack react-doctor generator', () => {
  it('re-exports stable config helpers for generator consumers', () => {
    expect(REACT_DOCTOR_PACKAGE).toBe('react-doctor');
    expect(REACT_DOCTOR_VERSION).toBe('^0.9.12');
    expect(renderReactDoctorConfig()).toContain('$schema');
    expect(renderReactDoctorReadmeSection()).toContain('mds run react-doctor');
    expect(buildReactDoctorCommandInvocation().display).toContain('react-doctor');
  });
});
