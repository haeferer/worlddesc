# @worlddesc/world

TypeScript package for loading, validating and running `worlddesc` worlds.

It contains:

- world loaders and validation
- runtime creation
- player-facing view models
- asset loading
- narrative guide and guide-mix loading

CLI entry points:

- `npx @worlddesc/world@latest checkworld ./sample/test.world.yaml`
- `npx @worlddesc/world@latest checkasset ./sample/assets/safe.object-asset.yaml`

Published bin:

- `worlddesc`

Schema packaging:

- `schema/` in the repo root is the single source of truth
- `packages/world/schema/` is only the synchronized package copy
- `npm run prepare:schemas` refreshes the package copy before build and pack
