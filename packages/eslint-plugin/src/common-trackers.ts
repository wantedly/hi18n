import { Tracker } from "./tracker";

export function bookTracker(): Tracker {
  const tracker = new Tracker();
  tracker.watchImport("@hi18n/core");
  tracker.watchMember('import("@hi18n/core")', "Book");
  tracker.watchConstruct(
    'import("@hi18n/core").Book',
    [
      {
        captureAs: "catalogs",
        path: ["0"],
      },
    ],
    "book"
  );
  return tracker;
}

export function catalogTracker(): Tracker {
  const tracker = new Tracker();
  tracker.watchImport("@hi18n/core");
  tracker.watchMember('import("@hi18n/core")', "Catalog");
  tracker.watchConstruct('import("@hi18n/core").Catalog', [
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
  tracker.watchMember('import("@hi18n/core")', "getTranslator");
  tracker.watchCall(
    'import("@hi18n/core").getTranslator',
    [
      {
        captureAs: "book",
        path: ["0"],
      },
    ],
    "translatorObject"
  );
  tracker.watchMember('import("@hi18n/react")', "useI18n");
  tracker.watchCall(
    'import("@hi18n/react").useI18n',
    [
      {
        captureAs: "book",
        path: ["0"],
      },
    ],
    "translatorObject"
  );
  tracker.watchMember("translatorObject", "t", "translate");
  tracker.watchCall(
    "translate",
    [
      {
        captureAs: "id",
        path: ["0"],
      },
    ],
    "translation"
  );
  tracker.watchMember('import("@hi18n/react")', "Translate");
  tracker.watchJSXElement(
    'import("@hi18n/react").Translate',
    [
      {
        captureAs: "book",
        path: ["book"],
      },
      {
        captureAs: "id",
        path: ["id"],
      },
    ],
    "translation"
  );
  return tracker;
}
