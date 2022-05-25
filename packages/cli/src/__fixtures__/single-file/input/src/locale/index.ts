import { Message, Book, Catalog, msg } from "@hi18n/core";

export type Vocabulary = {
  "example/greeting": Message;
  "example/greeting-unused": Message;
  // "example/greeting-todo": Message;
};

const catalogEn = new Catalog<Vocabulary>({
  "example/greeting": msg("Hello, world!"),
  "example/greeting-unused": msg("Hello, world! (unused translation)"),
  // "example/greeting-todo": msg("Hello, world! (TODO)"),
});

const catalogJa = new Catalog<Vocabulary>({
  "example/greeting": msg("こんにちは世界!"),
  "example/greeting-unused": msg("こんにちは世界! (未使用翻訳)"),
  // "example/greeting-todo": msg("こんにちは世界! (TODO)"),
});

export const book = new Book<Vocabulary>({
  en: catalogEn,
  ja: catalogJa,
});
