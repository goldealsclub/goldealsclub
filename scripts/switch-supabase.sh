#!/usr/bin/env bash
# Bascule le site, les scripts et les tests vers un autre projet Supabase.
# Usage : scripts/switch-supabase.sh <project_ref> <anon_key>
set -euo pipefail
NEW_REF="$1"; NEW_ANON="$2"
OLD_REF=$(grep -oP '^project_id = "\K[^"]+' supabase/config.toml)
OLD_ANON=$(grep -oP '^VITE_SUPABASE_PUBLISHABLE_KEY="?\K[^"\n]+' .env)
FILES=$(grep -rl --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=.git -e "$OLD_REF" -e "$OLD_ANON" . || true)
for f in $FILES; do
  sed -i "s/$OLD_REF/$NEW_REF/g; s/$OLD_ANON/$NEW_ANON/g" "$f"
  echo "mis à jour : $f"
done
