import { Message, Book } from "@hi18n/core";

export type Vocabulary = {
  "example/greeting": Message;
  "example/greeting-unused": Message;
  // "example/greeting-todo": Message;
};

export const book = new Book<Vocabulary>({
  en: () => import("./en"),
  ja: () => import("./ja"),
});
