import { Command, OutputConfiguration } from "commander";
import { export_ } from "./export";
import { sync } from "./sync";

export async function hi18n(
  argv?: readonly string[],
  cwd: string = process.cwd(),
  output?: OutputConfiguration,
  overrideExit?: boolean
) {
  const program = new Command();

  program.name("hi18n").description("CLI for managing translations with hi18n");

  if (output) program.configureOutput(output);
  if (overrideExit) program.exitOverride();

  program
    .command("sync")
    .description("Synchronize translation ids")
    .argument("[files...]")
    .option("--exclude <files...>")
    .option(
      "-c, --check",
      "report errors if one or more files would be changed"
    )
    .action(syncCommand);

  program.command("export").description("export data").action(exportCommand);

  async function syncCommand(
    files: string[],
    options: {
      exclude?: string[];
      check?: boolean;
    }
  ) {
    await sync({
      cwd,
      include: files,
      exclude: options.exclude,
      checkOnly: options.check,
    });
  }

  async function exportCommand() {
    await export_({
      cwd,
    });
  }

  await program.parseAsync(argv);
}
