import { Message, Book } from "@hi18n/core";
// Intentionally having .js extension
import catalogEn from "./en.ts";
// Intentionally having .js extension
import catalogJa from "./ja.ts";

export type Vocabulary = {
  "example/greeting": Message;
  "example/greeting-unused": Message;
  // "example/greeting-todo": Message;
};

export const book = new Book<Vocabulary>({
  en: catalogEn,
  ja: catalogJa,
});
