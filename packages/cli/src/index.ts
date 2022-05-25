import { hi18n } from "./command";

const result = hi18n();
result.catch((e) => {
  console.error(e);
  // eslint-disable-next-line no-process-exit
  process.exit(1);
});
