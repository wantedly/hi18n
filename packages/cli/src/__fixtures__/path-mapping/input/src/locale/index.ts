import { Message, Book } from "@hi18n/core";
import catalogEn from "src/locale/en";
import catalogJa from "@/ja";

export type Vocabulary = {
  "example/greeting": Message;
  "example/greeting-unused": Message;
  // "example/greeting-todo": Message;
};

export const book = new Book<Vocabulary>({
  en: catalogEn,
  ja: catalogJa,
});
