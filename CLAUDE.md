# PowerBI repo — instructions for Claude

This repo overrides the global "don't push unless asked" rule.

## Git: commit and push automatically
- After finishing and verifying a change (pages open, no console errors), commit with a conventional-commit message (`feat:`, `fix:`, `docs:`) and push without asking.
- Small fixes (typo, colour tweak, one card or link): commit to `main` and push. GitHub Pages serves from `main`, so this goes live.
- Larger changes (several pages, redesigns, new lessons, anything risky): work on a branch, push it and open a PR. Merge only when I say so.
- Before every commit, check `git diff` for secrets or real client data.
- Never force-push, rewrite history or delete branches. If a push is rejected (for example, the branch is behind origin), stop and tell me.
- Only stage files you changed. Leave untracked files you didn't create (such as `index-SRGHome.html`) alone.

## Site conventions
- Every page loads `assets/site.css` and `assets/site.js` (theme and lesson navigation).
- The lesson order lives in the `LESSONS` array in `assets/site.js`. Keep the matching card on `index.html` in sync when adding or reordering lessons.
- Use the theme tokens (`var(--ink)`, `rgb(var(--accent-rgb) / .2)`, etc.) instead of hard-coded colours, so light and dark both work.
