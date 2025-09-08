import { getTranslator, translationId } from "@hi18n/core";
// Intentionally having .js extension
import { book } from "./locale/index.ts";

const { t } = getTranslator(book, "ja");
t("example/greeting");

// @ts-ignore
translationId(book, "example/dynamic-todo");

// @ts-ignore
t("example/greeting-todo");

t.todo("example/greeting-todo2");

// @ts-ignore
t("example/greeting-todo-newtranslation");

/* eslint-disable-next-line a-nonexistent-rule */
