import path from 'node:path';

import type { DoctorCheckResult } from '../types.js';
import { findFiles, pathExists, readOptionalText, relative, SOURCE_EXTENSIONS } from '../utils.js';

const ANIMATION_SIGNAL_RE =
  /\b(react-native-reanimated|useAnimatedStyle|useSharedValue|useAnimatedScrollHandler|interpolate|withTiming|withSpring|Animated\.|LottieView|FadeIn|FadeOut|LinearTransition|layout=|entering=|exiting=)\b/u;

const PERFORMANCE_NOTE_RE =
  /\b(animation performance|motion budget|performance note|motion note|parallax budget|release build|scroll budget)\b/i;

export async function checkAnimationPerformance(projectPath: string): Promise<DoctorCheckResult> {
  if (!(await pathExists(projectPath))) {
    return {
      name: 'animation performance',
      status: 'skip',
      message: 'Project path does not exist, so animation checks were skipped.',
    };
  }

  const sourceFiles = await findFiles(projectPath, (filePath) => SOURCE_EXTENSIONS.has(path.extname(filePath)));
  const findings: string[] = [];
  let scannedAnimatedFiles = 0;

  for (const filePath of sourceFiles) {
    if (findings.length >= 50) {
      break;
    }
    const contents = await readOptionalText(filePath);
    if (!contents || !ANIMATION_SIGNAL_RE.test(contents)) {
      continue;
    }
    scannedAnimatedFiles += 1;
    findings.push(...scanAnimationFile(projectPath, filePath, contents));
  }

  if (findings.length > 0) {
    return {
      name: 'animation performance',
      status: 'warn',
      message: 'Animation-heavy files have motion budget warnings.',
      details: {
        findings: findings.slice(0, 50),
        truncated: findings.length > 50,
        scannedAnimatedFiles,
      },
    };
  }

  return {
    name: 'animation performance',
    status: scannedAnimatedFiles > 0 ? 'pass' : 'skip',
    message:
      scannedAnimatedFiles > 0
        ? 'Animation-heavy files passed the lightweight motion scan.'
        : 'No animation-heavy files detected.',
  };
}

export async function scanFileAnimationPerformance(
  projectPath: string,
  filePath: string
): Promise<DoctorCheckResult> {
  const contents = (await readOptionalText(filePath)) ?? '';
  if (!ANIMATION_SIGNAL_RE.test(contents)) {
    return {
      name: 'animation performance',
      status: 'skip',
      message: 'File does not contain animation-heavy signals.',
    };
  }

  const findings = scanAnimationFile(projectPath, filePath, contents);
  return findings.length > 0
    ? {
        name: 'animation performance',
        status: 'warn',
        message: 'File has animation performance warnings.',
        details: { findings },
      }
    : {
        name: 'animation performance',
        status: 'pass',
        message: 'File passed the lightweight motion scan.',
      };
}

function scanAnimationFile(projectPath: string, filePath: string, contents: string): string[] {
  const findings: string[] = [];
  const metrics = collectMetrics(contents);
  const shortPath = relative(projectPath, filePath);
  const isRouteFile = /(^|\/)(src\/)?app\//u.test(shortPath);
  const hasPerformanceNote = PERFORMANCE_NOTE_RE.test(contents);
  const scrollLinkedScore =
    metrics.interpolateCount + metrics.animatedStyleCount + metrics.scrollHandlerCount + metrics.parallaxHintCount;

  if (
    metrics.repeatedMotionCount >= 4 &&
    (metrics.flatListCount > 0 || metrics.mapCount > 0) &&
    !hasPerformanceNote
  ) {
    findings.push(
      `${shortPath}: repeated animated rows or cards detected; add a motion budget note or simplify list-heavy motion.`
    );
  }

  if (
    metrics.parallaxHintCount > 0 &&
    (scrollLinkedScore >= 10 || metrics.interpolateCount >= 6 || metrics.animatedStyleCount >= 4) &&
    !hasPerformanceNote
  ) {
    findings.push(
      `${shortPath}: dense parallax or scroll-linked layers detected without a nearby motion/performance note.`
    );
  }

  if (
    isRouteFile &&
    metrics.lineCount >= 260 &&
    (metrics.interpolateCount + metrics.animatedStyleCount + metrics.sharedValueCount >= 8 ||
      metrics.repeatedMotionCount >= 6)
  ) {
    findings.push(
      `${shortPath}: large route file mixes dense motion logic with route concerns; move interpolation-heavy logic into focused helpers or components.`
    );
  }

  if (
    metrics.lottieCount > 0 &&
    metrics.lineCount >= 220 &&
    metrics.repeatedMotionCount >= 6 &&
    !hasPerformanceNote
  ) {
    findings.push(
      `${shortPath}: combines long-running animation with many other motion signals; confirm the scene has a measured release-build budget.`
    );
  }

  return findings;
}

function collectMetrics(contents: string): {
  lineCount: number;
  interpolateCount: number;
  animatedStyleCount: number;
  sharedValueCount: number;
  scrollHandlerCount: number;
  parallaxHintCount: number;
  repeatedMotionCount: number;
  flatListCount: number;
  mapCount: number;
  lottieCount: number;
} {
  return {
    lineCount: contents.split(/\r?\n/u).length,
    interpolateCount: countMatches(contents, /\binterpolate\s*\(/gu),
    animatedStyleCount: countMatches(contents, /\buseAnimatedStyle\s*\(/gu),
    sharedValueCount: countMatches(contents, /\buseSharedValue\s*\(/gu),
    scrollHandlerCount: countMatches(contents, /\b(useAnimatedScrollHandler|scrollEventThrottle|onScroll)\b/gu),
    parallaxHintCount: countMatches(contents, /\b(parallax|scroll-linked|scroll linked|pinned|depth|layered|hero)\b/giu),
    repeatedMotionCount: countMatches(contents, /\b(entering|exiting|layout)\s*=|<Animated\.|Fade(In|Out|Up|Down)|LinearTransition\b/gu),
    flatListCount: countMatches(contents, /\b(FlatList|FlashList|SectionList)\b/gu),
    mapCount: countMatches(contents, /\.map\s*\(/gu),
    lottieCount: countMatches(contents, /\b(LottieView|lottie-react-native)\b/gu),
  };
}

function countMatches(contents: string, pattern: RegExp): number {
  return [...contents.matchAll(pattern)].length;
}
