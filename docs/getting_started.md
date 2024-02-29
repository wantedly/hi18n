# Getting Started

## hi18n を用いた Ruby(haml) 実装

### 基本的な使い方

```rb
I18n.t("example.new", user: user.name, company: company.name)
```

```yml
# ja.yml
ja:
  new: "サンプル"

# en.yml
en:
  new: "sample"
```

### 変数・引数

```rb
I18n.t("example.notification.title", user: user.name, company: company.name)
```

```yml
# ja.yml
ja:
  post:
    title: "%{user}さんが%{company}に参加しました。"

# en.yml
en:
  post:
    title: "%{user} has joined %{company}."
```

### id 自体を変数化する

```rb
I18n.t("example.category.#{example.category}")
```

### ヘルパーメソッドを使い、導線を出す条件節の中に入れる

簡単にいえば、`if`文で他の言語の人には導線を隠すということです。
ただし、この時、view や controller に

```rb
if I18n.locale == :ja  # x
```

とか

```rb
if current_country == :japan  # x
```

と書かないようにしてください。

ではどうすればいいかというと、

```rb
def facebook_option_available?(country = current_country)
  country == :japan && I18n.locale == :ja
end
```

というように Helper を定義した上で、

```rb
if facebook_option_available?  # o
```

### i18n のスコープ(翻訳キー)を追加し、それを js から読み込む

js から新しく翻訳データを読み込ませたい場合は、以下の手順が必要です。

1. スコープを yaml に追記する。
2. 1 で追記したスコープを [/config/i18n-js.yml](https://github.com/wantedly/wantedly/blob/master/config/i18n-js.yml) に追記する。

ここで追加されたスコープは [/frontend/assets/javascripts/shims/I18n.js](https://github.com/wantedly/wantedly/blob/master/frontend/assets/javascripts/shims/I18n.js) をインポートすることで以下のよう使えるようになります。

```js
import { t } from "path/to/shims/I18n";
t("scope.action");
```

## hi18n を用いた React 実装

### 導入とセットアップ

```ts
npm install @hi18n/core @hi18n/react-context @hi18n/react
npm install -D @hi18n/cli

# または:
yarn add @hi18n/core @hi18n/react-context @hi18n/react
yarn add -D @hi18n/cli
```

翻訳 ID の同期のためのコマンドを用意します。

```ts
// package.json
{
  "scripts": {
    "i18n:sync": "hi18n sync 'src/**/*.ts' 'src/**/*.tsx'"
  }
}
```

## Book の準備

書く画面で呼び出す文言の元となる凡例(index)と各言語別辞書(en, js)を用意する。

```ts
// src/locale/index.ts
// (他の名前でもOK)
// 翻訳可能な文字列の一覧をここに定義する。

import { Book, Message } from "@hi18n/core";
import catalogEn from "./en";
import catalogJa from "./ja";

export type Vocabulary = {
  // 凡例: "翻訳ID": Message<{ 引数 }>; (引数がないときは単に Message でOK)
  "example/greeting": Message<{ name: string }>;
};

// 各言語の翻訳データをまとめたオブジェクト
export const book = new Book<Vocabulary>({
  en: catalogEn,
  ja: catalogJa,
});
```

```ts
// src/locale/en.ts
// (他の名前でもOK)
// 各言語での翻訳をここに定義する。

import { Catalog, msg } from "@hi18n/core";
import type { Vocabulary } from ".";

export default new Catalog<Vocabulary>({
  // 凡例: "翻訳ID": msg(翻訳文字列),
  "example/greeting": msg("Hello, {name}!"),
});
```

```ts
// src/locale/ja.ts (enと同様)
import { Catalog, msg } from "@hi18n/core";
import type { Vocabulary } from ".";

export default new Catalog<Vocabulary>({
  "example/greeting": msg("こんにちは、{name}さん!"),
});
```

## 文言の呼び出しの基本形

### ① getTranslator を使う方法

React に依存しない方法です。ロケール情報は自前で管理する必要があります。

```ts
import { getTranslator } from "@hi18n/core";
// 最初に定義したBookインスタンス (翻訳データ) を明示的にimportする
import { book } from "../../locale";

const { t } = getTranslator(book, "en");
console.log(t("example/greeting", { name: "太郎" }));
```

### ② `<Translate>` を使う方法

`<Translate>`は React の要素を含むコンテンツの翻訳に適した方法です。

```ts
import { Translate } from "@hi18n/react";
// 最初に定義したBookインスタンス (翻訳データ) を明示的にimportする
import { book } from "../../locale";

const Greet: React.FC = () => {
  return <Translate book={book} id="example/greeting" name="太郎" />;
};
```

## 変数・引数を使った実装方法

### 変数を渡す

波括弧で引数名を囲むことで、動的に生成された文字列を間に挟むことができます。引数名のかわりに番号を入れることもできます。

翻訳中に動的に文字列を挿入したい、というのはよくあるケースです。これには { + 引数名 + } という記法を使います。翻訳引数は t 関数の第二引数にオブジェクトとして渡します。 <Translate> コンポーネントを使っている場合は、それぞれを同名の prop として渡します。

```ts
// 型定義
"example/greeting": Message<{ name: string }>;

// 定義
"example/greeting": msg("Hello, {name}!"),
"example/greeting": msg("{name}さん、こんにちは!"),

// 呼び出し
t("example/greeting", { name: "John" })
<Translate book={book} id="example/greeting" name="John" />
```

引数に名前をつけずに、番号で呼ぶこともできます。番号は 0 から始まります。

```ts
// 型定義
"example/greeting": Message<{ 0: string }>;

// 定義
"example/greeting": msg("Hello, {0}!"),
"example/greeting": msg("{0}さん、こんにちは!"),

// 呼び出し
t("example/greeting", ["John"]);
t("example/greeting", { 0: "John" });
<Translate book={book} id="example/greeting" {...["John"]} />
<Translate book={book} id="example/greeting" {...{ 0: "John" }} />
```

引数の順番は自由です。言語によって自然な語順が異なることはよくあるので、翻訳を細切れにして連結するよりも連続したメッセージ全体を 1 つの翻訳対象にしましょう。

```ts
// 型定義
"example/friendRequest": Message<{ name: string; company: string }>;

// 定義
"example/friendRequest": msg("{name} from {company} wants to connect to you."),
"example/friendRequest": msg("{company}の{name}さんがあなたに友達申請をしています。"),
```

### フォーマット指定

文字列のかわりに数値や日付時刻をフォーマットするよう指定できます。また、第三引数でより細かいフォーマットを指定できます。
波括弧 {} の中では、引数名のあとにカンマ区切りでオプションを指定することができます。number を使うと数値としてフォーマットします。

```ts
// 型定義
"example/unreadMessages": Message<{ count: number }>;

// 定義
// 複数形の分岐については後で説明 (ここでは使ってない)
"example/unreadMessages": msg("You have {count, number} unread messages."),
"example/unreadMessages": msg("{count, number}件の未読メッセージがあります。"),

// 呼び出し
t("example/unreadMessages", { count: 42 })
<Translate book={book} id="example/unreadMessages" count=42 />
数値フォーマットでは言語に応じて区切り文字などがついた状態でフォーマットされます。たとえば1234567は言語によっては "1,234,567" のように出力されます。

第3引数を入れると、表記をカスタマイズできます。

msg("{count, number, integer}"); // 常に整数として扱われる
msg("{count, number, currency}"); // 通貨として単位つきでフォーマットする (未実装)
msg("{count, number, percent}"); // 100倍してパーセント表記でフォーマットする
msg("{count, number, ::+! K currency/GBP}"); // カスタムフォーマット (未実装)
```

## 複数形

### 基本的な使い方

日本語圏ではなじみが薄いですが、数値を含むメッセージでは数量に応じて表記を変える必要がある場合があります。

- You have 1 unread message.
- You have 2 unread messages.
- これは以下のように plural を使うことで分岐を書くことができます。

```ts
// (実際には文字列内では改行できない)
"example/unreadMessages": msg(
  "{ count, plural,
     one {You have # unread message.}
     other {You have # unread messages.} }"
),
```

ここで # は {count, number} と書いたのと同様の効果があります。 (複数形の分岐中でのみ使えます)

### 分岐の指定

分岐の条件として書けるのは以下の 3 種類です。

- =0, =1, =2, =3, ... はちょうど指定した数のときにマッチします。
- zero, one, two, few, many は言語ごとに固有の複数形の名称をあらわします。条件は言語によりまちまちです。
- other は他の条件に該当しなかったときに使われます。

ただし、zero, one, two は =0, =1, =2 と違い、言語ごとに様々な扱いを受けるので注意が必要です。たとえば……

- 日本語では常に other となるため、zero, one, two の分岐を書いてもヒットしません。
- 英語の序数詞では 1 だけではなく 21, 31 なども one に該当します。
  - これは 1st, 2nd, 3rd, 4th を区別するために使われます。

**英語の基数詞の場合に限れば** one と =1 は同じ効果があるので、次のように書くこともできます。

```ts
"example/unreadMessages": msg(
  "{ count, plural,
     =1 {You have # unread message.}
     other {You have # unread messages.} }"
),
```

しかし、複数形の変化形にもとづいて分岐しているという意図を表現するには、one と書いたほうがいいでしょう。

たとえば、何もないときに別のメッセージを出すのには =0 が使えます。 (この場合は、翻訳 ID を分けてアプリケーションで分岐してもいいかもしれません)

```ts
// (実際には文字列内では改行できない)
"example/unreadMessages": msg(
  "{count, plural,
    =0 {You have no unread message.}
    one {You have # unread message.}
    other {You have # unread messages.}}"
),
```

### 残りを数える

決まった個数までリストアップし、残りを個数で表示するというユースケースはよくあります。これは offset 指定を使うことで実現できます。

```ts
// (実際には文字列内では改行できない)
"example/followers": msg(
  "{count, plural, offset:2
    =0 {No one follows you.}
    =1 {{name0} follows you.}
    =2 {{name0} and {name1} follow you.}
    one {{name0}, {name1}, and # other follow you.}
    other {{name0}, {name1}, and # others follow you.}}"
),
```

offset を指定すると、以下の挙動に影響があります。

- `#` で表示される数値が offset 分だけ小さくなります。そのため、offset を指定しているときは `#` と `{count, number}` の値は異なります。
- 複数形の名前による分岐 (zero, one, two, few, many) は、元の数値ではなく offset 分だけ小さい数値に基づいて判定されます。一方、イコールによる分岐は影響を受けないため注意が必要です。

### _序数詞のフォーマット (未実装)_

「○○ 番目」のような序数詞は、基数詞とは異なる変化規則を持つことがあります。このような分岐を扱うには plural のかわりに selectordinal を使います。 (未実装)

```ts
// (実際には文字列内では改行できない)
msg(
  "{counter, selectordinal,
    one {You are the #st visitor.}
    two {You are the #nd visitor.}
    few {You are the #rd visitor.}
    other {You are the #th visitor.}
  }"
),
```

## 日付時刻フォーマット

第二引数を time または date にすると日付時刻のフォーマットを行うことができます。

```ts
// 型定義
"example/held": Message<{ heldAt: Date }>;

// 定義
// 複数形の分岐については後で説明 (ここでは使ってない)
"example/held": msg("Will be held at {heldAt, date}"),
"example/held": msg("{heldAt, date}に開催予定"),

// 呼び出し (タイムゾーンを指定する必要がある)
t("example/held", { heldAt: new Date(), timeZone: "JST" })
<Translate book={book} id="example/held" heldAt={new Date()} timeZone="JST" />
```

日付時刻をフォーマットするときはタイムゾーンを指定する必要があります。

ブラウザの規定のタイムゾーンを使うための簡易的なヘルパー関数も用意しているので、タイムゾーンの適切な扱いを考える余裕がないときはこちらを使うことができます。

```ts
import { getDefaultTimeZone } from "@hi18n/core";

t("example/held", { heldAt: new Date(), timeZone: getDefaultTimeZone() });
```

### 既定のフォーマット

既定のフォーマットは 8 種類あります。short→medium→long→full と進むほどより多くの情報が補われて長い文字列が得られます。フィールドの順番や区切り文字などはロケールごとのデータに基づいて最適なものが使われます。

```ts
// 日付のみ
msg("{heldAt, date, short}"),
msg("{heldAt, date, medium}"), // {heldAt, date} と同じ
msg("{heldAt, date, long}"),
msg("{heldAt, date, full}"),

// 時刻のみ
msg("{heldAt, time, short}"),
msg("{heldAt, time, medium}"), // {heldAt, time} と同じ
msg("{heldAt, time, long}"),
msg("{heldAt, time, full}"),
```

### カスタムの日付時刻フォーマット (スケルトン)

表示するべきフィールドを明示的に指定することもできます。この場合でも、フィールドの順番や区切り文字などはロケールごとのデータに基づいて最適なものが使われます。

```ts
// 年 (y) 月 (MMMM) 日 (d) 時 (j) 分 (mm) を入れてフォーマットする
msg("{heldAt, date, ::yMMMMdjmm}"),

// 上と同じ (並び替えただけ)
msg("{heldAt, date, ::jmmdMMMMy}"),
```

現在以下のフィールドをサポートしています:

- 時代 (西暦なら紀元後、和暦なら昭和など): G (短い), GGGG (長い), GGGGG (省略形)
- 年: y (通常), yy (下 2 桁)
- 月: M (1 桁), MM (2 桁), MMM (短い単語), MMMM (長い単語), MMMMM (省略形)
- 日: d (1 桁), dd (2 桁)
- 曜日: E (短い), EEEE (長い), EEEEE (省略系)
- 午前/午後: a (短い), aaaa (長い), aaaaa (省略系)
  - 多くの言語では a, aaaa, aaaaa の区別がなく、常に長い形が使われるので注意
- 時: j (1 桁), jj (2 桁)。 ただし、12 時制/24 時制を強制したい場合は以下の亜種が使える:
  - h / hh ... 12 時間制、深夜と正午は 12 と表記
  - H / HH ... 24 時間制、深夜は 0 と表記
  - k / kk ... 24 時間制、深夜は 24 と表記
  - K / KK ... 12 時間制、深夜と正午は 0 と表記
- 分: m (1 桁), mm (2 桁)
- 秒: s (1 桁), ss (2 桁)
- 秒の小数点以下: S (1 桁), SS (2 桁), SSS (3 桁)
- タイムゾーン名: z (短い名前), zzzz (長い名前), O (短い時差表記), OOOO (長い時差表記), v (短い), vvvv (長い名前)
  - z/zzzz はサマータイムの区別がある (米国太平洋時間の例 → サマータイム期間中は PDT, サマータイム期間外は PST)
  - v/vvvv はサマータイムの区別がない (米国太平洋時間の例 → PT)

フィールドには曜日、年、月、日、午前/午後、時、分、秒、秒の小数点以下のうち少なくとも 1 つを含んでいる必要があります。たとえば、タイムゾーン名を単独でフォーマットすることはできません。 (これは裏側で呼んでいる Intl API の制約によるものです)

## 汎用の分岐 (未実装)

メッセージ中に登場する名詞の性別が動的に決まる場合などのために、文字列パラメーターによる汎用の分岐を書くことができます。 (未実装)

```ts
// It was broken. の翻訳例
// (実際には文字列内では改行できない)
msg(
  "{gender, select,
    male {Он был сломан.}
    female {Она была сломана.}
    other {Оно было сломано.}
  }"
)
```

## マークアップを含むメッセージの翻訳

翻訳メッセージ中には HTML タグのような記法でマークアップを含めることができます。マークアップの意味は、呼び出し側で指定されます。

React では `<Translate>` コンポーネントを使うことで、マークアップを含むメッセージの翻訳を呼び出せます。 (現時点では、これが唯一の使い方です)

```ts
// 型定義
"example/tos": Message<{ link: ComponentPlaceholder }>;

// 定義
"example/tos": msg("Agree to the <link>terms of services</link>"),
"example/tos": msg("<link>利用規約</link>を読んで同意"),

// 呼び出し
<Translate book={book} id="example/tos">
  <a key="link" href="https://example.com/tos" />
</Translate>
```

この例では、翻訳中の link タグは呼び出し側で指定した a 要素に置き換えられます。

### マークアップ引数の型

マークアップを使うときは ComponentPlaceholder という型が登場します。

実際に使うときは、UI ライブラリごとに適切な型 (React の場合は React.ReactElement) に変換されます。

ただし、TypeScript の JSX サポートの都合上、マークアップ引数の型検査は不完全です。これについては ESLint 等で検査を補う予定です。

要素を props 経由で渡す
上記の呼び出しコードは以下のように書くこともできます。

```ts
<Translate
  book={book}
  id="example/tos"
  link=<a href="https://example.com/tos" />
/>
```

つまり、 `<link>` のようなタグは実際には link という名前の翻訳パラメーターを参照するものとして解釈されています。LinguiJS と違い、コンポーネント引数は通常の引数 (文字列など) と名前空間を共有しているので注意が必要です。

### 番号を使う

通常の引数と同じく、識別子のかわりに番号で引数を参照することもできます。

```ts
// 型定義
"example/tos": Message<{ 0: ComponentPlaceholder }>;

// 定義
"example/tos": msg("Agree to the <0>terms of services</0>"),
"example/tos": msg("<0>利用規約</0>を読んで同意"),

// 呼び出し
<Translate book={book} id="example/tos">
  <a href="https://example.com/tos" />
</Translate>

// 以下のようにも書ける
<Translate
  book={book}
  id="example/tos"
  {...{ 0: <a href="https://example.com/tos" /> }}
/>
```

Translate 要素の子孫要素が key 属性を持たない場合は、開始タグの出現順に 0, 1, 2, ... と番号が振られます。そのため、上の例では a 要素は 0 番として扱われます。

### 自己閉じタグを使う

開始タグから終了タグまでの間にメッセージを埋め込む必要がない場合は、XML の自己閉じタグに近い記法を使うことができます。

```ts
// 型定義
"example/tagline": Message<{ br: ComponentPlaceholder }>;

// 定義
"example/tagline": msg("No code,<br/>no life."),
"example/tagline": msg("コードを書かなきゃ<br/>生きられない。"),

// 呼び出し
<Translate book={book} id="example/tagline">
  <br key="br" />
</Translate>
```

また上の例では、翻訳中のマークアップ引数の名前と、React 側から提供する要素の名前を一致させています。これにより翻訳が読みやすくなることが期待できますが、必ずそうしなければいけないわけではありません。

### マークアップのネスト

翻訳中のマークアップは HTML と同様、ネストさせることができます。

```ts
// 型定義
"example/correctContactsLink": Message<{
  strong: ComponentPlaceholder;
  link: ComponentPlaceholder;
}>;

// 定義
"example/correctContactsLink": msg("<strong>Click <link>here</link></strong> to correct your contact information."),
"example/correctContactsLink": msg("連絡先情報に誤りがあった場合は、<strong><link>こちら</link>から訂正</strong>してください。"),

// 呼び出し
<Translate book={book} id="example/correctContactsLink">
  <strong key="strong" />
  <a key="link" href="https://example.com/settings/contacts" />
</Translate>

// 以下のように、翻訳内での使い方に近い形で書いてもよい
<Translate book={book} id="example/correctContactsLink">
  <strong key="strong">
    <a key="link" href="https://example.com/settings/contacts" />
  </strong>
</Translate>
```

### 同じタグ名の複数回使用

同じタグ名の複数回使用は、現時点では難しいです。動作はしますが、React 上で key が重複することで警告が出てしまいます。
現行バージョンで同じタグを複数回使用したい場合は、同等の要素を別名で提供するのが無難です。

```ts
// 型定義
"example/pleaseSaveWarning": Message<{
  strong1: ComponentPlaceholder;
  strong2: ComponentPlaceholder;
}>;

// 定義
"example/pleaseSaveWarning": msg("<strong1>Please save it now</strong1> or <strong2>your changes will be lost!</strong2>"),
"example/pleaseSaveWarning": msg("<strong2>変更が失われるのを防ぐ</strong2>ために<strong1>今すぐ保存を実行してください!</strong1>"),

// 呼び出し
<Translate book={book} id="example/pleaseSaveWarning">
  <strong key="strong1" />
  <strong key="strong2" />
</Translate>
```

### テキストノード

React の場合、呼び出し側で用意したテキストノードは破棄されます。

```ts
// 呼び出し
<Translate book={book} id="example/correctContactsLink">
  <strong key="string">
    Click
    <a key="link" href="https://example.com/settings/contacts">
      here
    </a>
  </strong>
  to correct your contact information.
</Translate>

// これは以下と同じ
<Translate book={book} id="example/correctContactsLink">
  <strong key="string">
    <a key="link" href="https://example.com/settings/contacts" />
  </strong>
</Translate>
```

これは、コード中に特定言語での翻訳例を埋め込み、翻訳 ID と同期するというワークフローを想定した挙動になっていますが、そういったワークフローのための仕組みは未実装です。

## テキストとエスケープ

### テキスト

以下の文字には特別な意味があるため、場所によってはそのまま書くことができません。

- 開き波括弧 {
- 閉じ波括弧 }
- ハッシュ記号 #
- 小なり記号 <
- シングルクオート '

それ以外の文字は、テキストとしてそのまま書くことができます。

```ts
// > はそのまま解釈される (タグでないことは明らかなため)
msg("4 > 2");
```

### シングルクオートによるエスケープ

以下の文字には特別な意味があるため、場所によってはそのまま書くことができません。

- 開き波括弧 {
- 閉じ波括弧 }
- ハッシュ記号 #
- 小なり記号 <
- シングルクオート '
- シングルクオートを使うことでエスケープを行うことができます。

```ts
// 2 < 4 と表示される
msg("2 '<' 4"),
```

クオート内では、クオート以外の全ての文字はそのまま解釈されます。

### シングルクオートの制約

シングルクオートによるエスケープは、その次の文字が以下のいずれかのときだけ有効です。

- 開き波括弧 {
- 閉じ波括弧 }
- ハッシュ記号 #
- 小なり記号 <
- シングルクオート '
- 縦棒 |

縦棒は hi18n では特別な意味を持ちませんが、MessageFormat のレガシー構文のひとつである choice format に含まれるためここでのリストに含めています。

それ以外の位置では、シングルクオートは特別な意味を持ちません。これは以下のようなパターンが頻出するためです。

```ts
// ' をそのまま解釈してほしい
msg("I'm not a robot"),
```

ただし、このような場合には Unicode のアポストロフィー/閉じクオート ’ (U+2019) を使うほうがいいかもしれません。

クオートの終了時には上記のような条件はありません。

```ts
// 2 < 4 と表示される
msg("2 '< 4'"),
```

ただし、次に述べる「シングルクオート 2 つによるエスケープ」に該当する場合は、その解釈が優先されます。

### シングルクオート 2 つによるエスケープ

シングルクオートを 2 つ並べると、シングルクオートそのものを表します。

```ts
// I'm not a robot と解釈される
msg("I''m not a robot"),
```

この記法はシングルクオートで囲まれた区間でも有効です。

```ts
// Press the <<I'm not a robot>> button. と解釈される
msg("Press the '<<I''m not a robot>>' button."),
```

## TODO の使い方

### t.todo, Translate.Todo

コードを書くときに、 t のかわりに t.todo を使い、 Translate のかわりに Translate.Todo を使うようにします。

存在しない id を指定した場合、エラーを吐くようになっているため、
画面実装中に１個づつサンプル文言を追加していくと効率よくないので、
仮の id でもエラーを吐かないようにする応急処置になります。

```ts
t.todo("example/new");
<Translate.Todo book={book} id="example/new" />;
```

その後同期を行い、翻訳の中身を追加したら "TODO" を削除します。

### msg.todo

```ts
import { Catalog, msg } from "@hi18n/core";
import type { Vocabulary } from ".";

export default new Catalog<Vocabulary>({
  "example/greeting": msg.todo("Hello, {name}!"),
});
```

ここでの TODO は見た目には変わりがなく、辞書で翻訳が必要である旨を明示的に表す機能のみとなります。
