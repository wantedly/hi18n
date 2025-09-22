import semver, { SemVer } from "semver";
import type { TSESLint } from "@typescript-eslint/utils";

export class CoreVersion {
  readonly version: SemVer | null;

  constructor(version: SemVer | null) {
    this.version = version;
  }

  /**
   * Is the module `@hi18n/core/msg` available?
   */
  hasBuilderUtils(): boolean {
    if (this.version == null) {
      return true;
    }
    return semver.satisfies(this.version, ">= 0.2.1");
  }
}

export function getCoreVersion(context: {
  settings: TSESLint.SharedConfigurationSettings;
}): CoreVersion {
  const versionString = (
    context.settings?.hi18n as { version: string } | undefined
  )?.version;
  if (versionString != null) {
    return new CoreVersion(semver.parse(versionString));
  }
  return new CoreVersion(null);
}
