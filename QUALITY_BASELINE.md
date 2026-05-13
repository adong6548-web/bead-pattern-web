# QUALITY_BASELINE.md

## 1. Purpose
This document defines the baseline for evaluating image-to-bead-pattern generation quality before future engine changes.

Phase 4 is now focused on output quality, not smart recommendation UI. Future changes should be compared against this baseline so the project does not improve one image type while accidentally regressing another.

This is a documentation baseline only. It does not change the algorithm, export behavior, autosave, offline app shell, or UI.

## 2. Current Pipeline Summary

### Upload / Validation / Safe ImageData Creation
- `ImageUploader` receives a local image file in the browser.
- `PatternTool` calls `validateImageFile` before processing.
- `imageFileToSafeImageData` decodes the image into a canvas and reads `ImageData`.
- Guardrails currently include:
  - image MIME type check
  - 12MB file size limit
  - zero-dimension / decode failure handling
  - source pixel limit of 16,000,000 pixels
  - processing pixel limit of 4,000,000 pixels
  - proportional downscale before `getImageData` when needed
  - extreme aspect ratio warning

### Background Trim
- `generatePattern` uses `getTrimmedBounds` when `trimWhiteBackground` is enabled.
- White detection is currently simple: `r > 245 && g > 245 && b > 245`.
- Transparent pixels are composited over white by `readCompositedPixel`.
- Trim keeps a small margin through `trimMargin`.

### Contain-Fit Into Target Grid
- The trimmed source bounds are fitted into the output grid with contain logic.
- The source aspect ratio is preserved.
- Remaining cells outside the fitted area are marked as ignored background.
- Ignored background cells do not count as beads.

### Cell Sampling
- `pixel-art`, `illustration`, and `anime-lineart` use dominant sampling.
  - Each bead cell samples a 5x5 point grid from the source region.
  - Near-white samples are ignored for dominant color selection.
  - Colors are bucketed in RGB buckets, and the dominant bucket is selected.
- `pet-photo` and `portrait-photo` use average sampling.
  - Every pixel in the source region for the bead cell is averaged.
  - Near-white pixels are counted for background detection but still contribute to the average.

### Color Quantization
- Drawable cells are separated into dark-line cells and normal cells.
- Normal cells are grouped by hue family.
- Each group is quantized with a simple K-means-like RGB clustering function in `quantizeColors`.
- The selected color centers are mapped to the fixed `commonPalette`.

### Palette Mapping
- All final bead colors come from the current common palette.
- Dark lines prefer black / deep gray candidates.
- Hue protection restricts candidates for non-photo modes.
- Several guardrails try to avoid red pollution and muddy warm / neutral matches.

### Noise Cleanup
- Rare color cleanup replaces very low-frequency non-dark-line colors with surrounding colors.
- Isolated-cell smoothing replaces cells when surrounding neighbors strongly agree.
- Similar rare colors can be merged into larger nearby colors.
- Final color count is enforced against the selected `colorLimit`.

### Dark Line Handling
- Modes define different dark-line thresholds and maximum dark-line ratios.
- Candidate dark-line cells are refined using neighborhood boundary checks.
- Interior dark masses can be demoted to normal cells.
- Dark-line cells are excluded from some cleanup passes to preserve outlines.

### Result / Export Boundary
- `generatePattern` returns a `PatternResult`.
- Preview, color stats, autosave snapshots, FocusMode code, and PNG export consume `PatternResult`.
- `exportPatternImage` redraws from `PatternResult`; it does not screenshot the page.
- Future quality work should preserve the `PatternResult` shape unless a separate migration is explicitly approved.

## 3. Known Quality Problems

### Ordinary Photos Contain Too Much Detail For Small Grids
Most photos contain faces, fur, shadows, texture, background clutter, and lighting gradients. When compressed into 40x40, 60x60, or 80x80 grids, important features can collapse or compete with noise.

### Photo Average Sampling Can Create Muddy Colors
Photo modes average all pixels in a bead cell source region. Mixed fur, shadow, white background, and object edges can average into gray, brown, or dirty neutral colors that do not look like intentional bead colors.

### Sparse Sampling Can Alias Complex Images
Dominant sampling uses a 5x5 sample grid. This helps pixel art and flat illustrations, but can miss thin details or misrepresent complex photos.

### No Dedicated Pre-Simplification Before Shrinking
There is no photo-oriented simplification stage before reducing the image to bead cells. Texture and noise are simplified only after cell colors have already been chosen.

### RGB Color Distance Is Not Perceptual
Quantization and nearest matching mostly use RGB distance. This can behave poorly for skin, fur, warm neutrals, dark gradients, and low-saturation colors.

### Size Recommendation Ignores Image Complexity
`recommendPatternPlans` currently uses aspect ratio only. A simple icon and a complex portrait with the same aspect ratio can receive the same size plans.

### White Background Removal Is Limited
Background trimming and ignore logic are based on near-white thresholds. This works for clean white backgrounds but is weak for real photo backgrounds, off-white shadows, colored backgrounds, or textured backgrounds.

### Modes Share Much Of The Same Pipeline
Modes currently adjust thresholds and choose dominant vs average sampling. They are meaningful, but not separate enough for very different sources such as pixel art, flat illustration, pet photo, and human portrait.

## 4. Manual QA Image Categories
Do not add actual image files in this task. Future QA should use representative local images in these fixed categories:

1. Simple pixel icon with white background
   - A small, clean icon or sprite on a white background.
   - Should test white trimming, flat colors, and outline stability.

2. Simple pixel icon with transparent background
   - A sprite or icon PNG with alpha transparency.
   - Should test transparent pixel compositing and ignored background behavior.

3. Flat cartoon / logo
   - Clear vector-like art, bold shapes, limited colors.
   - Should test clean color blocks and lack of muddy colors.

4. Colorful illustration
   - Multi-color illustration with clear subject and moderate detail.
   - Should test color relationships and controlled color count.

5. Anime lineart portrait
   - Face or bust with visible lineart, eyes, hair, and flat color regions.
   - Should test line preservation and small facial features.

6. White / light pet photo
   - Cat or dog with light fur and visible eyes / nose.
   - Should test fur simplification, light gray preservation, and dark detail protection.

7. Dark pet photo
   - Cat or dog with dark fur or strong shadow.
   - Should test whether dark regions retain form without turning into large black masses.

8. Human portrait, experimental
   - Human face photo with skin tones and hair.
   - Should remain marked experimental; do not optimize the whole engine around this category first.

9. Busy background photo
   - Subject with a cluttered or textured background.
   - Should test whether background dominates the bead result.

10. Transparent PNG with subject
    - Non-icon subject with alpha background.
    - Should test transparency handling outside simple pixel icons.

11. Extreme wide image
    - Very wide subject or multiple subjects in a row.
    - Should test contain-fit, horizontal plans, and detail loss.

12. Extreme tall image
    - Tall subject or portrait-like vertical crop.
    - Should test contain-fit, vertical plans, and detail loss.

## 5. Visual Quality Checklist
For each future algorithm change, manually check:

- Subject remains recognizable at the selected size.
- Important small features survive.
- Eyes / nose / mouth or key icon details remain visible.
- Background does not dominate the pattern.
- White background handling still ignores clean white areas.
- Transparent PNG handling still leaves background empty.
- Large flat areas stay clean.
- Photo textures do not become noisy speckles.
- Colors do not become muddy gray / brown unless the source actually needs those colors.
- Outlines are not broken, too thick, or over-darkened.
- Dark detail protection does not swallow large interior regions.
- Selected color count is respected.
- Color stats match the visible pattern.
- Exported PNG matches the preview.

## 6. Non-Regression Checklist
Future quality changes must not regress:

- Pixel / icon outputs.
- White background ignore behavior.
- Transparent PNG handling.
- Multi-size plan generation and switching.
- Pattern preview shape / non-distortion behavior.
- PNG export.
- Autosave restore.
- Offline app shell.
- Upload guardrail messages below the upload card.
- Restored draft note below the upload card.
- FocusMode remains hidden.

## 7. Before / After Comparison Protocol
For each future algorithm task:

1. Use the same image categories before and after.
2. Compare the same selected size, image type, color count, color style, and background setting.
3. Capture screenshots or exported PNGs manually.
4. Record each category as:
   - improved
   - unchanged
   - regressed
5. Note which visible feature changed, not only whether it “looks better.”
6. Avoid tuning based on only one reference image.
7. Avoid accepting a change that improves photos but ruins pixel icons.
8. Avoid accepting a change that improves one pet photo but makes light backgrounds worse.
9. Keep exported PNG comparison in the loop because export is the current primary delivery format.

## 8. Recommended Next Phase 4B Scope
The first engine change should be small and isolated:

**Phase 4B: improve photo-mode sampling / preprocessing only.**

Recommended boundaries:
- Focus on `pet-photo` and `portrait-photo`.
- Keep `pixel-art`, `illustration`, and `anime-lineart` behavior unchanged initially.
- Preserve `PatternResult`.
- Preserve PNG export behavior.
- Preserve autosave behavior.
- Preserve offline app shell behavior.

Possible Phase 4B ideas:
- Replace raw average sampling for photo modes with more robust per-cell color sampling.
- Ignore near-white pixels more carefully during photo average sampling when background ignore is enabled.
- Add light smoothing / simplification before quantization for photo modes.
- Protect important dark details conservatively without expanding dark regions into large black masses.
- Evaluate whether photo mode should use a dominant/median-like color instead of pure average when a cell contains mixed subject and background.

## 9. Explicitly Deferred Work
Do not do these yet:

- Smart recommendation.
- Full mode-specific pipeline rewrite.
- Full perceptual color quantization rewrite.
- AI API / ML image classification.
- Web Worker.
- UI redesign.
- PNG export redesign.
- Autosave schema changes.
- Offline / PWA expansion.
- FocusMode restoration.
