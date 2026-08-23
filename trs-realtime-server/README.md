# Mongoose 9 native ESM runtime fix

Replace the four matching files under `src/models/`.

Why: the realtime server runs through native ESM (`tsx` + `"type": "module"`). In this runtime, `models` is not exposed as a reliable named ESM export by Mongoose, even though Next.js bundling may accept the same syntax in the main app.

The fixed files use the Mongoose default export for all runtime values:

```ts
import mongoose, { type InferSchemaType, type Model } from "mongoose";
const { Schema } = mongoose;
```

Then run:

```powershell
npm run check
npm run dev
```
