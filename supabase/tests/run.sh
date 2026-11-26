#!/usr/bin/env bash
# Runs the migration and safety tests against a throwaway database.
# Usage: PGHOST=... PGUSER=postgres supabase/tests/run.sh
set -euo pipefail
cd "$(dirname "$0")/.."
DB=kidstagram_test
dropdb --if-exists "$DB"
createdb "$DB"
psql -q -v ON_ERROR_STOP=1 -d "$DB" -f tests/stub_supabase.sql
for f in migrations/*.sql; do psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$f"; done
psql -q -t -v ON_ERROR_STOP=1 -d "$DB" -f tests/rls_test.sql 2>&1 | grep -v "^\s*$" | grep -v "^ *[0-9a-f-]*$"
