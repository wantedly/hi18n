import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { fixTranslations } from "./fixer";

const result = (async () => {
  await yargs(hideBin(process.argv))
    .command(
      "sync <files...>",
      "synchronize translation ids",
      (yargs) => {
        return yargs
          .positional("files", {
            required: true,
            type: "string",
            array: true,
          })
          .option("exclude", {
            type: "string",
            array: true,
          });
      },
      syncCommand
    )
    .strict()
    .demandCommand(1)
    .parse();
})();
result.catch((e) => {
  console.error(e);
  // eslint-disable-next-line no-process-exit
  process.exit(1);
});

async function syncCommand(
  args: yargs.ArgumentsCamelCase<{
    files: string[] | undefined;
    exclude: string[] | undefined;
  }>
) {
  await fixTranslations({
    cwd: process.cwd(),
    include: args.files ?? [],
    exclude: args.exclude,
  });
}
