import { Message, Book } from "@hi18n/core";
// Intentionally having .js extension
import catalogEn from "./en.js";
// Intentionally having .js extension
import catalogJa from "./ja.js";

export type Vocabulary = {
  "example/dynamic-todo": Message;
  "example/greeting": Message;
  "example/greeting-todo-newtranslation": Message;
  "example/greeting-todo2": Message;
  // "example/greeting-unused": Message;
  "example/greeting-todo": Message;
};

export const book = new Book<Vocabulary>({
  en: catalogEn,
  ja: catalogJa,
});
