import yargs from "yargs";
import { sync } from "./sync";

export async function hi18n(
  argv: readonly string[],
  cwd: string = ".",
  exitProcess = true
) {
  await yargs(argv)
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
          })
          .option("c", {
            alias: "check",
            type: "boolean",
            describe: "report errors if one or more files would be changed",
          });
      },
      syncCommand
    )
    .strict()
    .demandCommand(1)
    .exitProcess(exitProcess)
    .parse();

  async function syncCommand(
    args: yargs.ArgumentsCamelCase<{
      files: string[] | undefined;
      exclude: string[] | undefined;
      c: boolean | undefined;
    }>
  ) {
    await sync({
      cwd,
      include: args.files ?? [],
      exclude: args.exclude,
      checkOnly: args.c,
    });
  }
}
