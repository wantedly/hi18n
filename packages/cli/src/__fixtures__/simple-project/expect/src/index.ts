import { getTranslator } from "@hi18n/core";
import { catalog } from "./locale/catalog";

const { t } = getTranslator(catalog, "ja");
t("example/greeting");

// @ts-ignore
t("example/greeting-todo");

// @ts-ignore
t("example/greeting-todo-newtranslation");

/* eslint-disable-next-line a-nonexistent-rule */
