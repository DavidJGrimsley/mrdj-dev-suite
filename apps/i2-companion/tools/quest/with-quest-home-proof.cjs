const fs = require('node:fs');
const path = require('node:path');
const { withAppBuildGradle, withFinalizedMod } = require('expo/config-plugins');

const META_SPATIAL_SDK_DEP = 'implementation("com.meta.spatial:meta-spatial-sdk-vr:0.15.0")';
const HOME_PROOF_PANEL_ID_ITEM = '<item name="home_proof_webview_panel" type="id" />';

const SYNC_HOME_PROOF_ASSETS_TASK = `
tasks.register('syncHomeProofAssets') {
    doLast {
        def appAssetsDir = file("$projectDir/src/main/assets")
        copy {
            from("$projectRoot/assets/infie")
            into(new File(appAssetsDir, "infie"))
            include("infie-mist.glb")
        }
        copy {
            from("$projectRoot/assets/fonts")
            into(new File(appAssetsDir, "fonts"))
            include("*.ttf")
        }
        copy {
            from("$projectRoot/tools/quest/homeproof")
            into(new File(appAssetsDir, "homeproof"))
            include("index.html")
        }
        def spatialAar = configurations.spatialSdkAar.singleFile
        def spatialJniOut = file("$buildDir/generated/spatialJniLibs/homeproof")
        copy {
            from(zipTree(spatialAar)) {
                include("jni/arm64-v8a/libopenxr_loader.so")
                eachFile { fcd ->
                    fcd.relativePath = new org.gradle.api.file.RelativePath(true, "arm64-v8a", "libopenxr_loader.so")
                }
                includeEmptyDirs = false
            }
            into(spatialJniOut)
        }
    }
}

preBuild.dependsOn(tasks.named('syncHomeProofAssets'))
`.trimStart();

function patchAppBuildGradle(contents) {
  let updated = contents;

  if (!updated.includes('IS_HOME_PROOF')) {
    updated = updated.replace(
      /buildConfigField\s+"String",\s+"REACT_NATIVE_RELEASE_LEVEL"[^\r\n]*/,
      (match) => `${match}\n        buildConfigField "boolean", "IS_HOME_PROOF", "false"`
    );
  }

  if (!updated.includes('applicationIdSuffix ".homeproof"')) {
    updated = updated.replace(
      /buildTypes\s*\{\s*debug\s*\{\s*signingConfig\s+signingConfigs\.debug\s*\}/,
      (match) => `${match}
        homeproof {
            initWith debug
            applicationIdSuffix ".homeproof"
            resValue "string", "app_name", "i² Home Proof"
            buildConfigField "boolean", "IS_HOME_PROOF", "true"
            signingConfig signingConfigs.debug
            matchingFallbacks = ['debug', 'release']
        }`
    );
  }

  if (!updated.includes('libthird-party_zlib_1_3_1_z.so')) {
    updated = updated.replace(
      /useLegacyPackaging\s+enableLegacyPackaging\.toBoolean\(\)/,
      `useLegacyPackaging enableLegacyPackaging.toBoolean()
            pickFirsts += [
                '**/libopenxr_loader.so',
                '**/libthird-party_zlib_1_3_1_z.so',
                '**/libc++_shared.so'
            ]`
    );
  }

  if (!updated.includes('generated/spatialJniLibs/homeproof')) {
    updated = updated.replace(
      /androidResources\s*\{/,
      `sourceSets {
        homeproof {
            jniLibs.srcDirs += ["$buildDir/generated/spatialJniLibs/homeproof"]
        }
    }
    androidResources {`
    );
  }

  if (!updated.includes(META_SPATIAL_SDK_DEP)) {
    updated = updated.replace(
      /dependencies\s*\{/,
      `configurations {
    spatialSdkAar
}

dependencies {
    spatialSdkAar("com.meta.spatial:meta-spatial-sdk:0.15.0@aar")
    // Meta Spatial SDK 0.15.0 (declared first so its OpenXR loader takes precedence in pickFirsts)
    ${META_SPATIAL_SDK_DEP}\n`
    );
  }

  if (!updated.includes("tasks.register('syncHomeProofAssets')")) {
    updated = `${updated.trimEnd()}\n\n${SYNC_HOME_PROOF_ASSETS_TASK}`;
  } else if (!updated.includes('tools/quest/homeproof')) {
    updated = updated.replace(
      /tasks\.register\('syncHomeProofAssets'\)[\s\S]*$/,
      SYNC_HOME_PROOF_ASSETS_TASK
    );
  }

  return updated;
}

function patchMainApplicationSource(source) {
  const lineEnding = source.includes('\r\n') ? '\r\n' : '\n';
  let normalized = source.replace(/\r\n/g, '\n');

  if (!normalized.includes('if (BuildConfig.IS_HOME_PROOF)')) {
    normalized = normalized.replace(
      '  override fun onCreate() {\n    super.onCreate()',
      [
        '  override fun onCreate() {',
        '    super.onCreate()',
        '    if (BuildConfig.IS_HOME_PROOF) {',
        '      // Home Proof runs an exclusive Meta Spatial SDK 0.15.0 runtime/session without Viro or React Native boot.',
        '      return',
        '    }',
      ].join('\n')
    );
  }

  if (!normalized.includes('if (!BuildConfig.IS_HOME_PROOF)')) {
    normalized = normalized.replace(
      '  override fun onConfigurationChanged(newConfig: Configuration) {\n    super.onConfigurationChanged(newConfig)\n    ApplicationLifecycleDispatcher.onConfigurationChanged(this, newConfig)\n  }',
      [
        '  override fun onConfigurationChanged(newConfig: Configuration) {',
        '    super.onConfigurationChanged(newConfig)',
        '    if (!BuildConfig.IS_HOME_PROOF) {',
        '      ApplicationLifecycleDispatcher.onConfigurationChanged(this, newConfig)',
        '    }',
        '  }',
      ].join('\n')
    );
  }

  return lineEnding === '\r\n' ? normalized.replace(/\n/g, '\r\n') : normalized;
}

function ensureHomeProofIdsXml(idsXmlPath) {
  fs.mkdirSync(path.dirname(idsXmlPath), { recursive: true });
  if (!fs.existsSync(idsXmlPath)) {
    fs.writeFileSync(
      idsXmlPath,
      `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    ${HOME_PROOF_PANEL_ID_ITEM}\n</resources>\n`,
      'utf8'
    );
    return;
  }
  const current = fs.readFileSync(idsXmlPath, 'utf8');
  if (!current.includes('name="home_proof_webview_panel"')) {
    const updated = current.replace(
      /<\/resources>/,
      `    ${HOME_PROOF_PANEL_ID_ITEM}\n</resources>`
    );
    fs.writeFileSync(idsXmlPath, updated, 'utf8');
  }
}

function applyQuestHomeProofFiles(
  projectRoot,
  platformProjectRoot,
  packageName = 'com.mrdj.i2companion'
) {
  const templateDir = path.join(projectRoot, 'tools', 'quest', 'homeproof');
  const packagePath = packageName.split('.');

  const activityTemplate = path.join(templateDir, 'HomeProofSpatialActivity.kt');
  const activityDest = path.join(
    platformProjectRoot,
    'app',
    'src',
    'main',
    'java',
    ...packagePath,
    'HomeProofSpatialActivity.kt'
  );
  if (fs.existsSync(activityTemplate)) {
    fs.mkdirSync(path.dirname(activityDest), { recursive: true });
    fs.copyFileSync(activityTemplate, activityDest);
  }

  const manifestTemplate = path.join(templateDir, 'AndroidManifest.xml');
  const manifestDest = path.join(
    platformProjectRoot,
    'app',
    'src',
    'homeproof',
    'AndroidManifest.xml'
  );
  if (fs.existsSync(manifestTemplate)) {
    fs.mkdirSync(path.dirname(manifestDest), { recursive: true });
    fs.copyFileSync(manifestTemplate, manifestDest);
  }

  const htmlTemplate = path.join(templateDir, 'index.html');
  const htmlDest = path.join(
    platformProjectRoot,
    'app',
    'src',
    'main',
    'assets',
    'homeproof',
    'index.html'
  );
  if (fs.existsSync(htmlTemplate)) {
    fs.mkdirSync(path.dirname(htmlDest), { recursive: true });
    fs.copyFileSync(htmlTemplate, htmlDest);
  }

  const idsXmlPath = path.join(
    platformProjectRoot,
    'app',
    'src',
    'main',
    'res',
    'values',
    'ids.xml'
  );
  ensureHomeProofIdsXml(idsXmlPath);

  const mainApplicationPath = path.join(
    platformProjectRoot,
    'app',
    'src',
    'main',
    'java',
    ...packagePath,
    'MainApplication.kt'
  );
  if (fs.existsSync(mainApplicationPath)) {
    const currentSource = fs.readFileSync(mainApplicationPath, 'utf8');
    const patchedSource = patchMainApplicationSource(currentSource);
    if (patchedSource !== currentSource) {
      fs.writeFileSync(mainApplicationPath, patchedSource, 'utf8');
    }
  }
}

/**
 * Reconciles Meta Spatial SDK 0.15.0 and the explicit `homeproof` buildType
 * (`com.mrdj.i2companion.homeproof` / `i² Home Proof`) so `expo prebuild`
 * deterministically generates the Spatial SDK dependency, OpenXR loader precedence
 * over `:viro_renderer`, asset sync task, `HomeProofSpatialActivity.kt`,
 * `src/homeproof/AndroidManifest.xml`, `ids.xml`, and `MainApplication.kt` guard
 * alongside existing Viro dev targets.
 */
function withQuestHomeProof(config) {
  const withGradle = withAppBuildGradle(config, (mod) => {
    mod.modResults.contents = patchAppBuildGradle(mod.modResults.contents);
    return mod;
  });

  return withFinalizedMod(withGradle, [
    'android',
    async (modConfig) => {
      applyQuestHomeProofFiles(
        modConfig.modRequest.projectRoot,
        modConfig.modRequest.platformProjectRoot,
        modConfig.android?.package || 'com.mrdj.i2companion'
      );
      return modConfig;
    },
  ]);
}

withQuestHomeProof.patchAppBuildGradle = patchAppBuildGradle;
withQuestHomeProof.patchMainApplicationSource = patchMainApplicationSource;
withQuestHomeProof.ensureHomeProofIdsXml = ensureHomeProofIdsXml;
withQuestHomeProof.applyQuestHomeProofFiles = applyQuestHomeProofFiles;

module.exports = withQuestHomeProof;
