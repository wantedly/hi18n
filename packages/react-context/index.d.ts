import React from "react";

/**
 * A {@link https://reactjs.org/docs/context.html React context} to pass down the current locale.
 *
 * It contains a list of {@link https://en.wikipedia.org/wiki/IETF_language_tag BCP 47 langauge tags}.
 */
export const LocaleContext: React.Context<readonly string[]>;
