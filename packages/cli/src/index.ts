import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { fixTranslations } from "./fixer";

yargs(hideBin(process.argv))
  .command("sync <files...>", "synchronize translation ids", (yargs) => {
    return yargs
      .positional("files", {
        required: true,
        type: "string",
        array: true,
      })
      .option("exclude", {
        type: "string",
        array: true
      });
  }, syncCommand)
  .strict()
  .demandCommand(1)
  .parse();

function syncCommand(args: yargs.ArgumentsCamelCase<{ files: string[] | undefined, exclude: string[] | undefined }>) {
  fixTranslations({
    cwd: process.cwd(),
    include: args.files ?? [],
    exclude: args.exclude,
  });
}
