import { Message, Book } from "@hi18n/core";
import catalogEn from "./catalog-en";
import catalogJa from "./catalog-ja";

export type Messages = {
  "example/greeting": Message,
  "example/greeting-unused": Message,
  // "example/greeting-todo": Message,
};

export const book = new Book<Messages>({
  en: catalogEn,
  ja: catalogJa,
});
