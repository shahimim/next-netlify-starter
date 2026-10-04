# Fitroom — your digital wardrobe

Scan your clothes, capture a 360° turn of yourself, and get outfit combinations
previewed on a spinnable version of you. Built with Next.js and deployable as a
static site on Netlify.

## How it works

1. **Scan** (`/scan`) — take or upload garment photos. The background is removed
   with an edge flood-fill, the garment is cropped to its bounding box and its
   dominant colour is extracted. Fix the name/category and save.
2. **Wardrobe** (`/wardrobe`) — browse, filter by category, favourite and delete.
3. **Body** (`/body`) — upload a short video of a slow turn (or a series of
   photos). Frames are extracted into a drag-to-rotate 360° viewer. Adjust the
   "fit zones" so garments land on the right part of your body.
4. **Outfits** (`/outfits`) — combinations are generated from your wardrobe and
   ranked by colour harmony. Pick one to see it layered on your 360° avatar.
   Shuffle for fresh ideas and save the ones you like.

Everything runs in the browser. Images and frames are stored in IndexedDB, so
nothing is uploaded anywhere.

## Develop

```bash
npm install
npm run dev     # http://localhost:3000
npm run build   # static export to ./out (what Netlify publishes)
```

## Project layout

```
pages/        index, scan, wardrobe, body, outfits
components/   Layout, SpinViewer, OutfitAvatar, GarmentCard
lib/          db (IndexedDB), image (cut-out, crop, frames), color, outfits (engine), hooks
```

## Roadmap ideas

- ML segmentation (e.g. an on-device model) for cleaner cut-outs on busy backgrounds
- True 3D body mesh from the capture instead of a frame-based spin
- Weather / occasion aware suggestions and a "worn" log
- Optional cloud sync with accounts
