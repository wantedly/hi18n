import { PluralArg, PluralBranch } from "../msgfmt.ts";
import { unwrap, wrap, type Message } from "../opaque.ts";
import type { BranchBuilder, BranchesBase, When } from "./branch.ts";
import { validateName } from "./util.ts";

// "other" is excluded as it should be handled by otherwise().
/**
 * Plural categories defined in [CLDR](https://cldr.unicode.org/index/cldr-spec/plural-rules),
 * except "other".
 *
 * Note that "zero" and 0 are different conditions.
 * Similarly, "one" and 1 are different conditions and "two" and 2 are different conditions.
 *
 * For English cardinal plurals, only "one" and "other" are used.
 *
 * - "one" is used for singular forms (e.g. 1 item).
 * - "other" is used for plural forms (e.g. 0, 2, or more items).
 *
 * For English ordinal plurals, "one", "two", "few", and "other" are used.
 *
 * - "one" is used for "-st".
 * - "two" is used for "-nd".
 * - "few" is used for "-rd".
 * - "other" is used for "-th".
 *
 * @since 0.2.1 (`@hi18n/core`)
 */
export type PluralType = "zero" | "one" | "two" | "few" | "many";
const validPluralTypes: Set<PluralType> = new Set([
  "zero",
  "one",
  "two",
  "few",
  "many",
]);

/**
 * @since 0.2.1 (`@hi18n/core`)
 */
export type PluralOptions = {
  /**
   * The value to subtract from the number before determining the plural category.
   *
   * Note that subtraction only applies to plural category selection,
   * not to exact number match (e.g. `when(0, ...)`).
   */
  subtract?: number;
};

/**
 * Initiates a plural branch.
 *
 * In plural branches, one can specify three types of branches:
 *
 * - `when(number, message)`: for exact number match.
 * - `when(pluralType, message)`: for plural category match. The categories are:
 *   - `zero` for languages that distinguishes it (English cardinals do not).
 *     Typically used for 0, but not limited to it (e.g. cardinal 10 in Latvian).
 *   - `one` for languages that distinguishes it.
 *     Typically used for 1, but not limited to it (e.g. cardinal 21 in Russian).
 *   - `two` for languages that distinguishes it (English cardinals do not).
 *     Typically used for 2, but not limited to it (e.g. ordinal 22 in English).
 *   - `few` for languages that distinguishes it (English cardinals do not).
 *     Typically used for small counts (e.g. 3, 4), but not limited to them (e.g. cardinal 1004 in Russian).
 *   - `many` for languages that distinguishes it (English cardinals do not).
 *     Typically used for a bit larger counts (e.g. 5 and above), but not limited to them (e.g. cardinal 1011 in Arabic).
 *   - `other` for all languages, but you cannot specify it here.
 *     Use `otherwise()` instead.
 * - `otherwise(message)`: mandatory catch-all branch.
 *
 * For English:
 *
 * - For cardinal plurals, use `one` for singular and `otherwise()` for plural.
 * - For ordinal plurals, use `one`, `two`, `few` for `-st`, `-nd`, `-rd` respectively, and `otherwise()` for `-th`.
 *
 * See [Language Plural Rules](https://www.unicode.org/cldr/charts/47/supplemental/language_plural_rules.html)
 * for details about plural rules in various languages.
 *
 * @param name The name of the number-valued parameter used for plural selection.
 * @param options the options.
 * @returns the branch builder that can be used to define branches.
 *
 * @since 0.2.1 (`@hi18n/core`)
 *
 * @example
 *   ```ts
 *   const catalogEn = new Catalog<Vocabulary>("en", {
 *     itemCount: plural("count").branch(
 *       when("one", msg`${arg("count", "number")} item`),
 *       otherwise(msg`${arg("count", "number")} items`),
 *     ),
 *   });
 *   ```
 */
export function plural(
  name: string | number,
  options: PluralOptions = {},
): BranchBuilder<PluralType | number> {
  const { subtract = 0 } = options;
  validateName(name);

  return {
    branch: <
      const Branches extends BranchesBase<PluralType | number, Message<never>>,
    >(
      ...branches: Branches
    ): Message<
      Branches extends BranchesBase<PluralType | number, Message<infer T>>
        ? { [K in keyof T]: T[K] }
        : never
    > => {
      if (
        branches.length === 0 ||
        branches[branches.length - 1]!.type !== "Otherwise"
      ) {
        throw new TypeError(`The last branch must be otherwise() branch`);
      }
      const whenBranches = branches.slice(0, -1);
      const lastBranch = branches[branches.length - 1]!;
      const seen = new Set<PluralType | number>();
      for (const branch of whenBranches) {
        if (branch.type !== "When") {
          throw new TypeError(`Only the last branch can be otherwise()`);
        }
        validateCondition(branch.when);
        if (seen.has(branch.when)) {
          throw new TypeError(`Duplicate plural condition: ${branch.when}`);
        }
        seen.add(branch.when);
      }
      return wrap(
        PluralArg(
          name,
          (whenBranches as When<PluralType | number, Message<never>>[]).map(
            ({ when, message }): PluralBranch => ({
              selector: when,
              message: unwrap(message),
            }),
          ),
          unwrap(lastBranch.message),
          { subtract },
        ),
      );
    },
  };
}

function validateCondition(condition: string | number): void {
  if (typeof condition === "string") {
    if (!validPluralTypes.has(condition as PluralType)) {
      throw new TypeError(`Invalid plural condition: ${condition}`);
    }
  } else if (typeof condition === "number") {
    if (!Number.isInteger(condition) || condition < 0) {
      throw new TypeError(`Invalid plural condition: ${condition}`);
    }
  } else {
    throw new TypeError(`Invalid plural condition: ${condition as string}`);
  }
}
