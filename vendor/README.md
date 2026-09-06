Vendored libraries are included so workbook import works offline.

- JSZip: see `JSZip-LICENSE.md`.
- SheetJS Community Edition 0.20.3: `xlsx.mjs` and `cpexcel.full.mjs`, downloaded from the official versioned distribution at https://cdn.sheetjs.com/xlsx-0.20.3/package/. See `SheetJS-LICENSE.txt` (Apache 2.0). The codepage table preserves Cyrillic in older XLS files.

The XLS reader only reads saved values, formulas and styles. It does not execute workbook formulas or macros.
