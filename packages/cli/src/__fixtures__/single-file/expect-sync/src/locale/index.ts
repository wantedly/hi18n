import { Message, Book, Catalog, msg } from "@hi18n/core";

export type Vocabulary = {
  "example/dynamic-todo": Message;
  "example/greeting": Message;
  "example/greeting-todo-newtranslation": Message;
  "example/greeting-todo2": Message;
  // "example/greeting-unused": Message;
  "example/greeting-todo": Message;
};

const catalogEn = new Catalog<Vocabulary>("en", {
  // "example/dynamic-todo": msg.todo("[TODO: example/dynamic-todo]"),
  // "example/greeting": msg.todo("[TODO: example/greeting]"),
  // "example/greeting-todo": msg.todo("[TODO: example/greeting-todo]"),
  // "example/greeting-todo-newtranslation": msg.todo("[TODO: example/greeting-todo-newtranslation]"),
  // "example/greeting-todo2": msg.todo("[TODO: example/greeting-todo2]"),
  // "example/dynamic-todo": msg.todo("[TODO: example/dynamic-todo]"),
  // "example/greeting": msg.todo("[TODO: example/greeting]"),
  // "example/greeting-todo": msg.todo("[TODO: example/greeting-todo]"),
  // "example/greeting-todo-newtranslation": msg.todo("[TODO: example/greeting-todo-newtranslation]"),
  // "example/greeting-todo2": msg.todo("[TODO: example/greeting-todo2]"),
  // "example/dynamic-todo": msg.todo("[TODO: example/dynamic-todo]"),
  // "example/greeting": msg.todo("[TODO: example/greeting]"),
  // "example/greeting-todo": msg.todo("[TODO: example/greeting-todo]"),
  // "example/greeting-todo-newtranslation": msg.todo("[TODO: example/greeting-todo-newtranslation]"),
  // "example/greeting-todo2": msg.todo("[TODO: example/greeting-todo2]"),
  // "example/dynamic-todo": msg.todo("[TODO: example/dynamic-todo]"),
  // "example/greeting": msg.todo("[TODO: example/greeting]"),
  // "example/greeting-todo": msg.todo("[TODO: example/greeting-todo]"),
  // "example/greeting-todo-newtranslation": msg.todo("[TODO: example/greeting-todo-newtranslation]"),
  // "example/greeting-todo2": msg.todo("[TODO: example/greeting-todo2]"),
  // "example/dynamic-todo": msg.todo("[TODO: example/dynamic-todo]"),
  // "example/greeting": msg("Hello, world!"),
  // "example/greeting-todo-newtranslation": msg.todo("[TODO: example/greeting-todo-newtranslation]"),
  // "example/greeting-todo2": msg.todo("[TODO: example/greeting-todo2]"),
  // "example/greeting-unused": msg("Hello, world! (unused translation)"),
  // "example/greeting-todo": msg("Hello, world! (TODO)"),
});

const catalogJa = new Catalog<Vocabulary>("ja", {
  // "example/dynamic-todo": msg.todo("[TODO: example/dynamic-todo]"),
  // "example/greeting": msg.todo("[TODO: example/greeting]"),
  // "example/greeting-todo": msg.todo("[TODO: example/greeting-todo]"),
  // "example/greeting-todo-newtranslation": msg.todo("[TODO: example/greeting-todo-newtranslation]"),
  // "example/greeting-todo2": msg.todo("[TODO: example/greeting-todo2]"),
  // "example/dynamic-todo": msg.todo("[TODO: example/dynamic-todo]"),
  // "example/greeting": msg.todo("[TODO: example/greeting]"),
  // "example/greeting-todo": msg.todo("[TODO: example/greeting-todo]"),
  // "example/greeting-todo-newtranslation": msg.todo("[TODO: example/greeting-todo-newtranslation]"),
  // "example/greeting-todo2": msg.todo("[TODO: example/greeting-todo2]"),
  // "example/dynamic-todo": msg.todo("[TODO: example/dynamic-todo]"),
  // "example/greeting": msg.todo("[TODO: example/greeting]"),
  // "example/greeting-todo": msg.todo("[TODO: example/greeting-todo]"),
  // "example/greeting-todo-newtranslation": msg.todo("[TODO: example/greeting-todo-newtranslation]"),
  // "example/greeting-todo2": msg.todo("[TODO: example/greeting-todo2]"),
  // "example/dynamic-todo": msg.todo("[TODO: example/dynamic-todo]"),
  // "example/greeting": msg.todo("[TODO: example/greeting]"),
  // "example/greeting-todo": msg.todo("[TODO: example/greeting-todo]"),
  // "example/greeting-todo-newtranslation": msg.todo("[TODO: example/greeting-todo-newtranslation]"),
  // "example/greeting-todo2": msg.todo("[TODO: example/greeting-todo2]"),
  // "example/dynamic-todo": msg.todo("[TODO: example/dynamic-todo]"),
  // "example/greeting": msg("こんにちは世界!"),
  // "example/greeting-todo-newtranslation": msg.todo("[TODO: example/greeting-todo-newtranslation]"),
  // "example/greeting-todo2": msg.todo("[TODO: example/greeting-todo2]"),
  // "example/greeting-unused": msg("こんにちは世界! (未使用翻訳)"),
  // "example/greeting-todo": msg("こんにちは世界! (TODO)"),
});

export const book = new Book<Vocabulary>({
  en: catalogEn,
  ja: catalogJa,
});
