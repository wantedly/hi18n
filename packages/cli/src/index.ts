import { hideBin } from "yargs/helpers";
import { hi18n } from "./command";

const result = hi18n(hideBin(process.argv));
result.catch((e) => {
  console.error(e);
  // eslint-disable-next-line no-process-exit
  process.exit(1);
});
