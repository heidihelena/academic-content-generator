// electron-builder afterPack hook. On macOS the CI build has no Apple Developer
// certificate, so the packaged .app ends up without a valid signature — and an
// unsigned app downloaded from the internet shows "is damaged and can't be
// opened" on Apple Silicon. Ad-hoc signing (sign identity "-") gives it a valid
// (if unverified) signature, which downgrades that hard block to the normal
// "unidentified developer" prompt the user can clear with right-click → Open.
// No-op on Windows/Linux.
const { execSync } = require('child_process');

exports.default = async function afterPack(context) {
  if (context.electronPlatformName !== 'darwin') return;
  const appName = context.packager.appInfo.productFilename;
  const appPath = `${context.appOutDir}/${appName}.app`;
  console.log(`[afterPack] ad-hoc signing ${appPath}`);
  execSync(`codesign --force --deep --sign - "${appPath}"`, { stdio: 'inherit' });
};
