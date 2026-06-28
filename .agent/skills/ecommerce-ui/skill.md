# UI Skills Protocol

Follow this protocol to build, refine, or audit user interfaces:

1. **Identify the UI category/goal** (e.g., Dashboard Layout, Typography, Accessibility, Motion, Performance).
2. **Inspect skills via the CLI**:
   - `npx ui-skills categories` to see available groups
   - `npx ui-skills list --category <name>` to view skills in a category
   - `npx ui-skills get <slug>` to retrieve details for a specific skill (e.g., `baseline-ui`, `fixing-accessibility`, `fixing-motion-performance`, `fixing-metadata`)
3. **Load 1–3 of the smallest useful skills** that apply to the current task.
4. **Implement UI updates** strictly following these loaded skills constraints.

## Current Active Skills for Admin UI Redesign
- **`baseline-ui`**: Spacing, typography (tabular-nums, text-balance), shadows, and core design principles.
- **`fixing-accessibility`**: ARIA labels, native elements, keyboard navigation, focus management.
- **`fixing-motion-performance`**: Compositor animations, duration constraints, IntersectionObserver, scroll boundaries.
- **`fixing-metadata`**: Page title, SEO metadata, social cards.
