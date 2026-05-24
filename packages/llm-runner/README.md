# @worlddesc/llm-runner

Console REPL runner for `worlddesc`, built on top of `@worlddesc/world`.

It provides:

- OpenAI-backed Adventure companion REPL
- tool-based world interaction
- optional narrative guide mix injection
- token usage tracking
- `chat` and `responses` API modes

Example:

```bash
npx @worlddesc/llm-runner --debug --character warm-guide --narrative-guide-mix ./sample/test.narrative-guide-mix.yaml
```
