import { getTranslator } from "@hi18n/core";
import { book } from "./locale";

const { t } = getTranslator(book, "ja");
t("example/greeting");

// @ts-ignore
t("example/greeting-todo");

// @ts-ignore
t("example/greeting-todo-newtranslation");

/* eslint-disable-next-line a-nonexistent-rule */
