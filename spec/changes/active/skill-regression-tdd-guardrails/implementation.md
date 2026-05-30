# Implementation

## Shipped

- Added `spec/knowledge/reference/skill-regression-test-matrix.md`.
- Added `spec/knowledge/reference/skill-defect-taxonomy.md` to classify escaped Skill bugs by defect type before choosing concrete tests.
- Mapped the ten user-reported skill bugs to missed invariants, lowest effective test layers, and required regression test items.
- Updated `spec/rules/testing-standards.md` with Skill-specific TDD gates:
  - matrix lookup before skill bugfixes;
  - observable post-condition assertions instead of mock-only success;
  - required fixtures for custom Git/Gitea, symlink/copy installs, same-name variants, and nested file browsing.
- Updated `spec/workflow/04-verification/README.md` so Skill-risk changes must cite matrix coverage.
- Updated `spec/rules/README.md` to point to the matrix.

## Verification

- Reviewed representative existing skill tests:
  - `apps/desktop/tests/unit/main/skill-installer-remote.test.ts`
  - `apps/desktop/tests/unit/main/skill-installer-platform.test.ts`
  - `apps/desktop/tests/unit/main/skill-installer-repo.test.ts`
  - `apps/desktop/tests/unit/main/skill-safety-scan.test.ts`
  - `apps/desktop/tests/unit/services/skill-platform-sync.test.ts`
  - `apps/desktop/tests/unit/components/skill-projects-view.test.tsx`
  - `apps/desktop/tests/unit/components/skill-store-custom-sources.test.tsx`
  - `apps/desktop/tests/e2e/local-store-source.spec.ts`
- Ran documentation sanity checks with `rg` and `git diff --check`.
- No product tests were run because this change defines constraints and test items only.

## Synced Docs

- `spec/knowledge/reference/skill-regression-test-matrix.md`
- `spec/rules/testing-standards.md`
- `spec/workflow/04-verification/README.md`
- `spec/rules/README.md`

## Follow-ups

- Implement the matrix as failing regression tests before fixing the ten product bugs.
