import { Message, MessageCatalog } from "@hi18n/core";

export type Messages = {
  "example/greeting": Message,
};

export const catalog = new MessageCatalog<Messages>({});
