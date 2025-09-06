# Message syntax

Message roughly resembles [ICU MessageFormat](https://unicode-org.github.io/icu/userguide/format_parse/messages/).

## Unquoted texts

The following characters can appear unescaped in the text.

- Any characters except `{`, `}`, `'`, `<`, and `#`
- `'` not followed by `{`, `}`, `'`, `<`, `#` or `|`.
- `#` except directly under the plural/selectordinal argument.

```
// Interpreted literally because there is no syntax character
evaluate("Hello, world!")
// => "Hello, world!"

// Interpreted literally because the apostrophe is not followed by syntax characters
evaluate("There's one message.")
// => "There's one message."

// Interpreted literally because # has no meaning here
evaluate("The #1 translation library ever")
// => "The #1 translation library ever"
```

## Quoted texts

`'` can be used to escape syntax characters.

- `'` starts a quoted text if followed by `{`, `}`, `<`, `#` or `|`.
- `'` ends a quoted text if not followed by another `'`.

```
// These two messages are the same
evaluate("Unmatched '{' and '}'")
// => "Unmatched { and }"
evaluate("Unmatched '{ and }'")
// => "Unmatched { and }"
```

## Quoted quotes

`''` is interpreted as a single apostrophe.

```
// These two messages are the same
evaluate("There's one message.")
// => "There's one message."
evaluate("There''s one message.")
// => "There's one message."
```

## Simple string parameters

Use `{` and `}` to embed parameters from the application.

For string parameters, you can simply enclose the parameter name with `{` and `}`.

```
// Named parameters
evaluate("Approve {name}'s request", { name: "John" })
// => "Approve John's request"

// Positional parameters (indexed from 0)
evaluate("Approve {0}'s request", ["John"])
// => "Approve John's request"
```

Currently, names have one of the following forms:

- Named parameters: `/[a-zA-Z_][a-zA-Z0-9_]*/`
- Positional parameters: `/0|[1-9][0-9]*/`

Within `{` and `}`, whitespace between tokens are ignored.

## Formatting numbers

You can add additional keywords to tell hi18n to format numbers, date, time and duration.

```
// Default number format
evaluate("Population: {population, number}", { population: 1234567 })
// => "Population: 1,234,567"

// Currency (not implemented yet)
evaluate("You have {balance, number, currency}", { balance: 1234567, currency: "USD" })

// Percentage
evaluate("{progress, number, percent} progress", { progress: 0.75 })
// => "75% progress"

// Custom number formatting via skeleton (not implemented yet)
evaluate("Estimate {value, number, ::@@#}", { value: 3126 })
```

## Formatting date and time

```
// Default date formats
evaluate("{now, date}", { now: new Date(...), timeZone: "MST" })
// => "Jan 2, 2006" // same as medium
evaluate("{now, date, short}", { now: new Date(...), timeZone: "MST" })
// => "1/2/06"
evaluate("{now, date, medium}", { now: new Date(...), timeZone: "MST" })
// => "Jan 2, 2006"
evaluate("{now, date, long}", { now: new Date(...), timeZone: "MST" })
// => "January 2, 2006"
evaluate("{now, date, full}", { now: new Date(...), timeZone: "MST" })
// => "Monday, January 2, 2006"

// Default time formats
evaluate("{now, time}", { now: new Date(...), timeZone: "MST" })
// => "3:04:05 PM"
evaluate("{now, time, short}", { now: new Date(...), timeZone: "MST" })
// => "3:04 PM"
evaluate("{now, time, medium}", { now: new Date(...), timeZone: "MST" })
// => "3:04:05 PM"
evaluate("{now, time, long}", { now: new Date(...), timeZone: "MST" })
// => "3:04:05 PM GMT-7"
evaluate("{now, time, full}", { now: new Date(...), timeZone: "MST" })
// => "3:04:05 PM GMT-07:00"

// Custom date/time formatting via skeleton
evaluate("{now, time, ::MMMMdjmm}", { now: new Date(...), timeZone: "MST" })
// => "January 2, 3:04 PM"
```

A [skeleton](https://unicode-org.github.io/icu/userguide/format_parse/datetime/#datetimepatterngenerator) is a format specifier following `::`.

A skeleton is a concatenation of the following tokens:

- era: `G` (AD), `GGGG` (Anno Domini), `GGGGG` (A)
- year: `y` (2022), `yy` (22)
- month: `M` (9), `MM` (09), `MMM` (Sep), `MMMM` (September), `MMMMM` (S)
- day: `d` (1), `dd` (01)
- weekday: `E` (Fri), `EEEE` (Friday), `EEEEE` (F)
- day period: `a` (in the afternoon), `aaaa` (in the afternoon), `aaaaa` (in the afternoon)
- hour: `j` (5 PM), `jj` (05 PM) with the following variants:
  - `h` / `hh` forces 12-hour representation with the noon/midnight being 12
  - `H` / `HH` forces 24-hour representation with the midnight being 0
  - `k` / `kk` forces 24-hour representation with the midnight being 24
  - `K` / `KK` forces 12-hour representation with the noon/midnight being 0
- minute: `m` (3), `mm` (03)
- second: `s` (2), `ss` (02)
- fraction seconds: `S` (.1), `SS` (.10), `SSS` (.102)
- time zone name: `z` (PDT), `zzzz` (Pacific Daylight Time), `O` (GMT-8), `OOOO` (GMT-08:00), `v` (PT), `vvvv` (Pacific Time)

Note that the order of the tokens doesn't matter; they are appropriately reordered depending on the locale.

## Selecting messages based on plural forms, ordinals, or list lengths

Use `plural` or `selectordinal` to select plural forms.

```
evaluate("{count, plural, one {You have # message.} other {You have # messages.}}", { count: 1 })
// => "You have 1 message."
```

After `plural,` there is a list of branches. Be aware that there are no commas between branches.

Branch condition has one of the following forms:

|              | examples                            | condition                                    |
| ------------ | ----------------------------------- | -------------------------------------------- |
| Exact match  | `=0`, `=1`, `=2`, ...               | `value === branch.value`                     |
| Plural forms | `zero`, `one`, `two`, `few`, `many` | `pluralForm(value - offset) === branch.name` |
| Catch-all    | `other`                             | `true`                                       |

Please note `zero`, `one`, and `two` does not always match if the value is 0, 1, and 2, respectively. The inverse doesn't hold either: `zero`, `one`, and `two` may match values other than 0, 1, and 2, respectively.

- In English, 0 and 2 resolves as `other`, not `zero` nor `two`.
- In English, in ordinals, 21 resolves as `one`.
- In Russian, 2 resolves as `few`, not `two`.
- In Russian, 21 resolves as `one`.

### Selecting ordinal forms (not implemented yet)

With `selectordinal` to branch on ordinal forms:

```
evaluate("{rank, selectordinal, one {#st} two {#nd} few{#rd} other{#th}}", { rank: 21 })
// => "21st"
```

### Using exact match

Exact match is often useful if we need to special-case 0.

```
evaluate("{count, plural, =0 {You have no message.} one {You have # message.} other {You have # messages.}", { count: 0 })
// => "You have no message."
```

### Counting remainders via `offset:`

Use `offset:` to count remainders.

```
evaluate("{count, plural, offset:1 =0 {No one liked the article.} =1 {{name} liked the article.} one {{name} and # other liked the article.} other {{name} and # others like the article.}}", { count: 3, name: "John" })
// => "John and 2 other liked the article."
```

`offset:` affects the following:

- Determining plural forms
- The value pointed to by `#`

`offset:` doesn't affect the following:

- Exact match condition

### Component formatting with `<>` ... `</>`

Translations can have markups when their semantics are provided by the application.

```
// Example with React JSX
evaluate("Please <link>verify your email</link>.", { link: <a href="" /> })
// => <>Please <a href="">verify your email</a>.</>
```

Tag names can also be a number (unlike XML/HTML).

```
// Example with React JSX
evaluate("Please <0>verify your email</0>.", [<a href="" />])
// => <>Please <a href="">verify your email</a>.</>
```

You can also use self-closing tags.

```
// Example with React JSX
evaluate("Easy come.<br/>Easy go.", { br: <br /> })
// => <>Easy come.<br/>Easy go.<>
```

### Whitespace sensitivity

- Within quoted and unquoted texts, whitespace is also interpreted literally.
- Between `{` and `}`, whitespaces between tokens are ignored. Following is the list of tokens consisting of multiple characters:
  - Identifiers and keywords (e.g. `foo`)
  - Numbers (e.g. `123`)
  - Exact match branch (e.g. `=123`)
  - Skeleton specifier `::`
  - Offset specifier `offset:`
- In a tag, whitespaces can only appear after the tag name. `/>` should also appear consecutively.
  - Valid: `<foo>`, `<foo >`, `</foo>`, `</foo >`, `<foo/>`, `<foo />`
  - Invalid: `< foo>`, `</ foo>`, `< /foo>`, `< foo/>`, `<foo/ >`

## Grammar Summary

```
// Message entrypoint
Message ::= MessageQ
          | MessageU

// Message ending with quoted text
MessageQ ::= MessageU QuotedText
// Message not ending with quoted text
MessageU ::= ε
           | MessageU NonQuoteElement
           | MessageQ NonQuoteElement

// Quoted text (must start with syntax characters)
QuotedText ::= "'" QuotableCharacter QuotedTextElement "'"

QuotedTextElement ::= QuotedTextCharacter
                    | DoubleQuote

QuotedTextCharacter ::= any character but not "'"

DoubleQuote ::= "'" "'"

QuotableCharacter ::= "{" | "}" | "#" | "|" | "<"

NonQuoteElement ::= NonQuotedTextElement
                  | BraceArgument
                  | ElementArgument

NonQuotedTextElement ::= PlainCharacter
                       | DoubleQuote
                       | "'" StrictPlainCharacter

SyntaxCharacter ::= "{" | "}" | "#" | "<" | "'"
PlainCharacter ::= any character but not SyntaxCharacter
StrictPlainCharacter ::= PlainCharacter but not "|"

BraceArgument ::= "{" S* ArgumentName S* "}"
                | "{" S* ArgumentName S* "," S* ArgumentOptions S* "}"

ArgumentName ::= Identifier
               | Number
Identifier ::= IdentifierStart IdentifierContinue*
IdentifierStart ::= "a" ... "z"
                  | "A" ... "Z"
                  | "_"
IdentifierContinue ::= IdentifierStart
                     | "0" ... "9"
Number ::= "0"
         | NonZeroDigit Digit*
NonZeroDigit ::= "1" ... "9"
Digit ::= "0" ... "9"

ArgumentOptions ::= "number"
                  | "number" S* "," S* NumberStyle
                  | "date"
                  | "date" S* "," S* DateStyle
                  | "time"
                  | "time" S* "," S* TimeStyle
                  | "plural" S* "," S* PluralStyle
                  | "selectordinal" S* "," S* PluralStyle
                  | "select" S* "," S* SelectStyle

NumberStyle ::= "integer"
              | "currency"
              | "percent"
              | "::" S* NumberSkeleton

NumberSkeleton ::= (TODO)

DateStyle ::= "short"
            | "medium"
            | "long"
            | "full"
            | "::" S* DateSkeleton

TimeStyle ::= "short"
            | "medium"
            | "long"
            | "full"

DateSkeleton ::= DateSkeletonToken+
  (here we have additional restriction that tokens with the same character must not be placed adjacent)

DateSkeletonToken ::= "G" | "GGGG" | "GGGGG"
                    | "y" | "yy"
                    | "M" | "MM" | "MMM" | "MMMM" | "MMMMM"
                    | "d" | "dd"
                    | "E" | "EEEE" | "EEEEE"
                    | "a" | "aaaa" | "aaaaa"
                    | "j" | "jj"
                    | "h" | "hh"
                    | "H" | "HH"
                    | "k" | "kk"
                    | "K" | "KK"
                    | "m" | "mm"
                    | "s" | "ss"
                    | "S" | "SS" | "SSS"
                    | "z" | "zzzz"
                    | "O" | "OOOO"
                    | "v" | "vvvv"

PluralStyle ::= Offset S* PluralBranches
              | PluralBranches

Offset ::= "offset:" S* Number

PluralBranches ::= PluralBranch
                 | PluralBranches S* PluralBranch
  (here the last branch should be the "other" branch)

PluralBranch ::= PluralCondition S* "{" Message "}"

PluralCondition ::= Identifier
                  | "=" Number

SelectStyle ::= (TODO)

ElementArgument ::= StartTag Message EndTag
                  | SelfClosingTag
  (here the name of the start tag must match the end tag)

StartTag ::= "<" ArgumentName S* ">"
EndTag ::= "</" ArgumentName S* ">"
SelfClosingTag ::= "<" ArgumentName S* "/>"

// Whitespace
S ::= " " | "\n" | "\r" | "\t"
```
