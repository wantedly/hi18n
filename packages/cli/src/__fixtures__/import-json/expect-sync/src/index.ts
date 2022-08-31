import { getTranslator } from "@hi18n/core";
import { book } from "./locale";

const { t } = getTranslator(book, "ja");
// @ts-ignore
t("example/greeting");
t("example/greeting2");
