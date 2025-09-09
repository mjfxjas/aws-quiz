#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ASSETS="$ROOT/assets"
OUT="$ASSETS/exams.json"

# small helper to JSON-escape with python (ships on macOS)
j() { python3 - <<'PY' "$1"
import json,sys; print(json.dumps(sys.argv[1]))
PY
}

echo "Building $(basename "$OUT") …"

# Collect .md files (top level of /assets only)
FILES=()
for f in "$ASSETS"/*.md; do
  [ -f "$f" ] || continue
  FILES+=("$f")
done

# Build JSON array
{
  echo "["
  first=1
  for f in "${FILES[@]}"; do
    rel="assets/$(basename "$f")"
    # title = first H1 line if present, else filename
    if title_line=$(grep -m1 -E '^[[:space:]]*# ' "$f"); then
      title="${title_line#\# }"
    else
      title="$(basename "$f")"
    fi
    label="$(basename "$f")"

    if [ $first -eq 0 ]; then
      echo ","
    fi
    first=0

    printf '  {"label": %s, "title": %s, "path": %s}' \
      "$(j "$label")" \
      "$(j "$title")" \
      "$(j "$rel")"
  done
  echo
  echo "]"
} > "$OUT"

echo "Wrote $OUT"