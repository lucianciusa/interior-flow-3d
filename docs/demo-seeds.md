# Demo seeds

Known-good seed values for repeatable stage demos. Re-use them by appending `?seed=<value>` to `/app`, e.g. `https://app.example.com/app?seed=12345`.

The wizard auto-fills the seed; the user only needs to pick dimensions, style, and preferences (or use the defaults below).

> Refresh this list whenever the catalog, slot enum, or system prompt changes — seeds are not stable across schema changes.

| Style | Seed | Dimensions (W×L×H) | Preferences | Notes |
|-------|------|---------------------|-------------|-------|
| scandinavian | 10101 | 5 × 6 × 2.6 | more_seating | Sofa anchors south wall, rug + coffee table center, plant in NE corner |
| scandinavian | 20202 | 4 × 7 × 2.6 | more_open_space | Long, airy room — minimal furniture along south wall |
| scandinavian | 30303 | 6 × 6 × 2.7 | more_storage | Bookshelf on east wall, sofa centered on south wall |
| minimal | 40404 | 5 × 6 × 2.6 | (none) | Three-piece anchor: sofa + coffee table + tv stand |
| minimal | 50505 | 4 × 5 × 2.6 | more_open_space | Tight room, walls clear, single sofa + lamp |
| minimal | 60606 | 6 × 7 × 2.8 | more_seating | Two-seat + accent armchair flank coffee table |
| industrial | 70707 | 5 × 6 × 2.6 | more_seating | Leather sofa south, side chair NE corner, floor lamp NW |
| industrial | 80808 | 6 × 8 × 2.8 | more_storage | Bookshelf east wall, console north wall, rug + coffee table center |
| industrial | 90909 | 4 × 5 × 2.6 | more_open_space | Sparse, gritty palette, sofa on south wall only |

## Refresh procedure

1. Run the stack locally (`backend` on :8000, `frontend` on :3000).
2. Generate each combination above; if a layout is broken or has dropped items in `warnings`, swap the seed for one that produces a clean result.
3. Update the table.
