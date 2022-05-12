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
  tracker.watchMember("translate", "todo", "translate");
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
  tracker.watchMember('import("@hi18n/core")', "translationId");
  tracker.watchCall(
    'import("@hi18n/core").translationId',
    [
      {
        captureAs: "book",
        path: ["0"],
      },
      {
        captureAs: "id",
        path: ["1"],
      },
    ],
    "translation"
  );
  tracker.watchMember('import("@hi18n/react")', "Translate");
  tracker.watchMember('import("@hi18n/react").Translate', "Todo");
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
  tracker.watchJSXElement(
    'import("@hi18n/react").Translate.Todo',
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

export function linguiTracker(): Tracker {
  const tracker = new Tracker();
  tracker.watchImport("@lingui/react");
  tracker.watchImport("@lingui/macro");
  tracker.watchMember('import("@lingui/react")', "Trans", "Trans");
  tracker.watchMember('import("@lingui/macro")', "Trans", "Trans");
  tracker.watchJSXElement(
    "Trans",
    [
      {
        captureAs: "props",
        path: [],
      },
      {
        captureAs: "id",
        path: ["id"],
      },
      {
        captureAs: "defaults",
        path: ["defaults"],
      },
      {
        captureAs: "message",
        path: ["message"],
      },
      {
        captureAs: "render",
        path: ["render"],
      },
      {
        captureAs: "component",
        path: ["component"],
      },
      {
        captureAs: "components",
        path: ["components"],
      },
    ],
    "translationJSX"
  );
  return tracker;
}
