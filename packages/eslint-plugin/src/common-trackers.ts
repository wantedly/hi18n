import { Tracker } from "./tracker";

export function messageCatalogTracker(): Tracker {
  const tracker = new Tracker();
  tracker.watchImport("@hi18n/core");
  tracker.watchMember("import(\"@hi18n/core\")", "MessageCatalog");
  tracker.watchConstruct("import(\"@hi18n/core\").MessageCatalog", [
    {
      captureAs: "localCatalogs",
      path: ["0"],
    },
  ], "messageCatalog");
  return tracker;
}

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

export function translationCallTracker(): Tracker {
  const tracker = new Tracker();
  tracker.watchImport("@hi18n/core");
  tracker.watchImport("@hi18n/react");
  tracker.watchMember("import(\"@hi18n/core\")", "getI18n");
  tracker.watchCall("import(\"@hi18n/core\").getI18n", [
    {
      captureAs: "catalog",
      path: ["0"],
    },
  ], "i18n");
  tracker.watchMember("import(\"@hi18n/react\")", "useI18n");
  tracker.watchCall("import(\"@hi18n/react\").useI18n", [
    {
      captureAs: "catalog",
      path: ["0"],
    },
  ], "i18n");
  tracker.watchMember("i18n", "t");
  tracker.watchCall("i18n.t", [
    {
      captureAs: "id",
      path: ["0"],
    },
  ]);
  tracker.watchMember("import(\"@hi18n/react\")", "Translate");
  tracker.watchJSXElement("import(\"@hi18n/react\").Translate", [
    {
      captureAs: "catalog",
      path: ["catalog"],
    },
    {
      captureAs: "id",
      path: ["id"],
    },
  ], "i18n.t()");
  return tracker;
}
