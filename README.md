# en_bsb &middot; [![GitHub license](https://img.shields.io/github/license/openbible-io/en_bsb?style=for-the-badge)](./LICENSE) ![npm version](https://img.shields.io/npm/v/@openbible/en_bsb.svg?style=for-the-badge)

Source control and normalization for [Berean Standard Bible](https://bereanbible.com/).

## Running
Download interlinear XLSX tables and per-book USFM using [CURL.](https://curl.se/)
These files are checked-in, so you need not run this unless you want to download the latest.
```sh
./download.sh
```

Transform downloaded files into a pipe-separated `dist/bibles/en_bsb.csv`.
```sh
npm install
node ./build.js
```

## Schema
- book
- chapter
- verse
- og_lang: original word's language as [iso639-2 code](https://www.loc.gov/standards/iso639-2/php/code_list.php)
- og_word: original word
- og_order: original word's absolute order
- og_parsing: original word's BSB Hebrew/Aramaic/Greek parsing
- og_strong: [Strong's concordance number](https://strongsconcordance.org/)
- before: [USFM tag](https://ubsicap.github.io/usfm/index.html) before this text if it's a paragraph, list, or poetry.
- text: translated text
- heading: goes before this word
- footnote: goes after this word

The following XLSX columns are purposefully excluded:
- BSB Sort: This is just the row number.
- Transliteration: A better version is included in amalgamated Hebrew/Greek sources.
- BDB/Thayers: More complete and deduped versions are available elsewhere.

## Continuous Integration
Downloads daily. If there's a difference will push, build, and publish a new CSV.
