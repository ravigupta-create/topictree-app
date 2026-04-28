# Contributing translations to TopicTree

TopicTree's UI ships in 12 languages. The strings live in
`src/translations/{locale}.json` (one file per locale) inside a
**private source repository**, so we can't accept code-level PRs from
the public — but we **welcome translation issues** with proposed
fixes, and a maintainer will land them for you. You'll be credited in
`humans.txt`.

The English file (`en.json`) is the source of truth; every other
locale contains the same keys with translated values. If a key is
missing from a non-English file, the UI falls back to English. So you
can suggest improvements one key at a time without breaking anything.

## How to suggest a translation fix

1. **Open a translation issue** at
   [github.com/ravigupta-create/topictree-app/issues/new?template=translation.yml](https://github.com/ravigupta-create/topictree-app/issues/new?template=translation.yml).

2. Fill in the form:
   - Pick the language
   - (Optional) The translation key, if you know it
   - The current translation as it appears
   - Your suggested translation
   - Why the current one is wrong

3. **One language per issue** keeps things easy. Multiple keys per
   issue are fine.

4. A maintainer will apply your fix to `src/translations/<locale>.json`
   in the source repo and re-deploy. Usually within a week.

## Quality guidance

- **Match the tone.** Keys under `action.*` are short imperatives
  (button labels). Keys under `feedback.*` are short emotional
  responses ("Correct!", "Not quite"). Keys under `settings.*` are
  longer explanatory sentences.

- **Prefer informal "you"** where the language has both. Most users
  are students.

- **Don't translate placeholders.** A value like `"Welcome, {name}"`
  must keep `{name}` exactly as-is.

- **Keep punctuation locale-appropriate.** French uses ` !`
  (non-breaking space before the exclamation); German capitalizes
  nouns; Spanish opens questions with `¿`. Use what's natural.

- **Math and code stay English.** TopicTree's mathematical content
  uses LaTeX (`$x^2$`) and code blocks. These are universal and don't
  need translation.

## Adding a new language

We currently support 12 locales. To request a new one, open a regular
GitHub issue describing which language and (ideally) including a
proposed translation of `en.json`. A maintainer will set up the locale
and seed the translations from your suggestion.

## Attribution

Every translator who lands a non-trivial set of fixes (≥10 keys) gets
attributed in `public/humans.txt` under the Translators section. Tell
us which name or handle you'd like in the issue.

## What we don't translate

- **Lesson content** (the prose inside courses) is auto-translated
  client-side via Chrome's built-in Translator API or MyMemory's free
  service. Each user's browser caches the result so each piece of
  content gets translated at most once per locale per device.
- **Proper nouns** like "TopicTree", "Khan Academy", or course names.
- **Math notation** in LaTeX form.

## Free tools that can help

- **DeepL Free** (https://www.deepl.com/translator) — 500K characters
  per month, no signup needed for the web UI. Good baseline quality.
- **Google Translate** — fastest baseline, often verbose. Edit before
  pasting.
- **Wiktionary / Linguee** — useful for picking the right word among
  several options, especially for domain terms.

We can't accept translations generated entirely by paid AI services
(OpenAI, etc.) without a human pass — too easy to ship hallucinations.
A human review is required for every change.

## Questions?

Open a [GitHub Discussion](https://github.com/ravigupta-create/topictree-app/discussions)
or an issue. Free, unmoderated, friendly.
