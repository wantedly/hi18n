import { getI18n } from "@hi18n/core";
import { catalog } from "./locale/catalog";

const { t } = getI18n(catalog, "ja");
t("example/greeting");
