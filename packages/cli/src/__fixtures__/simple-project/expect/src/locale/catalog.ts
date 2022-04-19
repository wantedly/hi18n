import { Message, MessageCatalog } from "@hi18n/core";
import catalogEn from "./catalog-en";
import catalogJa from "./catalog-ja";

export type Messages = {
  "example/greeting": Message,
};

export const catalog = new MessageCatalog<Messages>({
  en: catalogEn,
  ja: catalogJa,
});
