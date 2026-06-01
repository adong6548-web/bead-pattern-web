# bead-pattern-web

A browser-based tool for converting images into bead-pattern previews.

The project is designed for creators who want to turn pet photos, portraits, or simple images into bead-art style pattern drafts directly in the browser. It focuses on local image processing, pattern preview, color statistics, export-ready PNG output, and a practical cleanup workflow for improving generated drafts.

## Current features

- Upload an image and generate a bead-pattern preview locally in the browser
- Generate multiple pattern sizes while preserving the source image ratio
- Preview bead grids with zoom-friendly visual output
- Show color and material statistics
- Export high-resolution PNG pattern images
- Configure image type, color count, and color style
- Edit generated patterns by marking selected colors as ignored background
- Merge selected colors into another existing color
- Undo the latest cleanup edit
- Keep preview, material statistics, and PNG export aligned with the edited pattern
- Analyze transparent PNG input quality and show upload notices when transparent backgrounds may contain retained opaque residue

## Project status

This is an active MVP. The current product direction is not to promise perfect automatic conversion from every image. Instead, the project aims to produce a usable first draft and give users simple cleanup tools to improve the result.

Recent maintenance work has focused on:

- Background handling for pet-photo inputs
- Transparent PNG quality detection
- Cleanup-edit consistency between preview, material statistics, and export
- Avoiding unsafe heuristic tuning that improves one image while regressing another
- Keeping the engine stable while testing conversion-quality experiments separately

## Why this project exists

Most simple image-to-pattern tools either hide too much of the conversion process or produce drafts that are hard to repair. This project explores a more practical workflow:

image upload -> local conversion -> readable preview -> color/material summary -> lightweight cleanup -> export.

The goal is to support hobby creators, bead-art makers, and visual craft workflows without requiring server-side processing or account-based cloud tools.

## Tech stack

- Next.js
- React
- TypeScript
- Tailwind CSS
- Browser Canvas / ImageData processing

## Local development

```bash
npm install
npm run dev
```

Open:

```text
http://localhost:3000
```

Production build:

```bash
npm run build
npm run start
```

Lint:

```bash
npm run lint
```

## Current non-goals

The project currently does not include:

- Backend services
- Login or user accounts
- Cloud sync
- PDF export
- ZIP batch export
- Community features
- Full pixel editor tools such as brush/eraser painting
- Server-side AI image processing

## Maintenance notes

This repository is maintained as an open-source creative-tooling project. Experiments that fail quality checks are intentionally not integrated into the product path. Project state and maintenance decisions are tracked in `PROJECT_STATE.md`.

## License

MIT
