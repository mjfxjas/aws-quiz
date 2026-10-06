# AWS Study Quiz

Static quiz reader for AWS Cloud Practitioner and SAA practice exams. Loads Markdown questions and answer keys in the browser.

## Features

- Client-side HTML, CSS, and JavaScript; no build step.
- Markdown exam files and a JSON index are separate from the renderer.
- Support answer keys, multi-select questions, and spoiler blocks without additional plugins.

## Project Structure

| Path | Purpose |
| --- | --- |
| `index.html` | Markup scaffold and dropdown for choosing an exam. |
| `app.js` | Core logic: loads JSON config, fetches Markdown, and renders it to the DOM. |
| `style.css` | Minimal theming inspired by AWS training docs. |
| `assets/` | Markdown exams, hero images, and JSON index. |
| `scripts/` | Helpers for converting existing notes into Markdown (optional). |

## Running Locally

```bash
cd aws-quiz
python3 -m http.server 4173
# visit http://localhost:4173
```

The dropdown is populated by `assets/exams.json`. Each entry is a relative path to a Markdown file.

## Adding Exams

1. Drop your Markdown file under `assets/` (keep filenames lowercase and hyphenated).
2. Update `assets/exams.json` with the new path.
3. Refresh the page and pick the new exam from the dropdown. No build step needed.

Supported Markdown helpers:

- Bullet choices (`- A) ...`).
- `<details>` tags for hiding answers until you’re ready.
- Multi-answer keys using comma-separated values (`B, E`).

## Deploying to S3/CloudFront

1. Sync the folder to an S3 bucket with static website hosting enabled.
2. Set `Cache-Control: public, max-age=60` on `index.html` so updates appear quickly.
3. Point a CloudFront distribution at the bucket if you need HTTPS and caching at the edge.
4. Optionally add basic auth via CloudFront Functions if you’re sharing with teammates.
