# Setka working notes

- Read README and docs/design before changing architecture or import semantics. DD-001/DD-002 describe the target; DD-004 records the actual first slice and known gaps.
- Preserve fixtures. The sample JSON is partial and contains a room differing from File.xlsx.
- Keep `src/domain/` pure. Store university series, personal fixed events, tasks and work sessions separately.
- Never infer odd/even from column width, row halves or color. Preserve uncertain source text and provenance. Unknown lesson type must not generate academic tasks.
- Test date/parity/free-window/task allocation and importer changes with `node --test tests/*.test.mjs`. For UI/import integration run the optional Playwright workflow in `tests/browser.mjs` against the running local server.
- Run npm ci and npm run build for the shared PWA/Android distribution. JSZip is vendored with its licence. Avoid adding a backend or an LLM feature without a product reason.
- The build generates a content-hashed service-worker cache version; rebuild after changing cached assets. Never overwrite user fixtures or browser data to make screenshots look populated; use the explicit import/example-task controls.
