# en_bsb
[![GitHub license](https://img.shields.io/github/license/openbible-io/en_bsb?style=for-the-badge)](./LICENSE)
[![npm version](https://img.shields.io/npm/v/@openbible/en_bsb.svg?style=for-the-badge)](https://www.npmjs.com/package/@openbible/en_bsb)

Source control and normalization for the [Berean Standard Bible](https://bereanbible.com/).

## Schema
- book
- chapter
- verse
- original: untranslated word
- lang: original word's language as [iso639-2 code](https://www.loc.gov/standards/iso639-2/php/code_list.php)
- strong: original word's [Strong's concordance number](https://strongsconcordance.org/)
- order: original word's absolute order per-book
- parsing: original word's BSB Hebrew/Aramaic/Greek parsing
- en_transliteration
- en: english translation
- before: [USFM tag](https://ubsicap.github.io/usfm/index.html) before this text if it's a paragraph, list, or poetry.
- heading: goes before this word
- footnote: goes after this word

The following XLSX columns are purposefully excluded:
- BSB Sort: This is just the row number.
- BDB/Thayers: Greatly increases file size. More complete and deduped versions are available elsewhere.

## Running
Optionally download the latest interlinear XLSX tables and per-book USFM.
```sh
./pull.sh
```

Transform downloaded files into  `dist/en_bsb.csv`.
```sh
npm install
npm run build
```

## Continuous Integration
Downloads daily. If there's a difference will push to master, but won't build or release until
reviewed.
