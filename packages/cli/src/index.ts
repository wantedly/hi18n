import { hi18n } from "./command.ts";

const result = hi18n();
result.catch((e) => {
  console.error(e);
  // eslint-disable-next-line n/no-process-exit
  process.exit(1);
});
