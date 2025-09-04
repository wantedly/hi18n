import { Book, Catalog, getTranslator, Message, msg } from "@hi18n/core";

type Vocabulary = {
  "standalone/answer": Message;
  "standalone/ask": Message<{ name: string }>;
  "standalone/farewell": Message;
  // "standalone/greeting": Message;
};
const catalogEn = new Catalog<Vocabulary>("en", {
  "standalone/answer": msg.todo("[TODO: standalone/answer]"),
  "standalone/ask": msg("Are you {name}?"),
  "standalone/farewell": msg("Bye!"),
  // "standalone/greeting": msg("Hi!"),
});
const catalogJa = new Catalog<Vocabulary>("ja", {
  "standalone/answer": msg.todo("[TODO: standalone/answer]"),
  "standalone/ask": msg("きみ、{name}?"),
  "standalone/farewell": msg("んじゃ!"),
  // "standalone/greeting": msg("んちゃ!"),
});
const book = new Book<Vocabulary>({ en: catalogEn, ja: catalogJa });

{
  const { t } = getTranslator(book, "en");
  t("standalone/farewell");
  // @ts-ignore
  t("standalone/ask", { name: "John" });
  // @ts-ignore
  t("standalone/answer");
}
