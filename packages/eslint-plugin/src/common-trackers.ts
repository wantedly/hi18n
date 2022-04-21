import { Tracker } from "./tracker";

export function localCatalogTracker(): Tracker {
  const tracker = new Tracker();
  tracker.watchImport("@hi18n/core");
  tracker.watchMember("import(\"@hi18n/core\")", "LocalCatalog");
  tracker.watchConstruct("import(\"@hi18n/core\").LocalCatalog", [
    {
      captureAs: "catalogData",
      path: ["0"],
    },
  ]);
  return tracker;
}