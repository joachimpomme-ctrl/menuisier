# Shared Boundary Refactor Plan

## Objective

Make shared side panels (`joues communes`) behave like a real fused physical piece in the legacy editor, including:

- correct geometry when two adjacent bodies share one panel
- correct adaptation when bodies have different depths
- correct adaptation when bodies have different heights or segmented side panels
- correct recalculation when users resize, duplicate, remove, or reconfigure bodies
- consistent UX across structure, plan, montage, and dimension views

## Current Problems

### 1. Shared side is simulated, not modeled

Current logic in `src/lib/domain/body.ts`:

- increases each adjacent body width by `thickness / 2`
- removes left side panels from the right body
- renames right side panels of the left body with `(commune)`

This does not create a real fused panel. The model remains name-based and heuristic-driven.

### 2. Asymmetric bodies are not structurally supported

When adjacent bodies have:

- different heights
- split side panels on one side only
- alcoves or stepped heights

the current logic cannot compute the true shared geometry. It assumes one side can be copied or removed in bulk.

### 3. Disable path reconstructs geometry heuristically

On unsharing, the code may recreate left panels using hardcoded values like:

- `basHeight = 180`
- `hautHeight = ceilingHeight - basHeight`

This is not reversible and is wrong for many user-defined bodies.

### 4. Neighbor recalculation is incomplete

Changing width/depth on a body that participates in a shared boundary should also update the neighbor that owns or depends on the shared panel.

Current `updateBody()` only recalculates the edited body.

### 5. Remove/duplicate flows are not boundary-safe

Removing or duplicating a body should preserve a valid shared-boundary model.

Current flows mainly update `sharedBoundaries` and body arrays, but do not normalize shared-side geometry first.

### 6. UX explains a stronger guarantee than the model really provides

Views such as:

- `BodyCard`
- `WallSurveyDiagram`
- `PlanTab`
- `MontageTab`

display a coherent shared-side story, but they depend on approximations rather than a physically explicit piece model.

## Target Model

### Principle

A shared side should be treated as one physical panel located on the boundary between two bodies.

That panel must be derived from the actual geometry of both neighbors:

- effective depth = `max(left.depth, right.depth)`
- effective height/segments = union of the visible/structural side coverage required by both bodies

### Ownership

Pick one clear ownership rule for the fused panel:

- recommended: the shared panel belongs to the left body only

The right body should then explicitly depend on that panel but not duplicate it.

This ownership rule must be reflected consistently in:

- piece lists
- dimensions
- plan rendering
- montage rendering
- counts and derived calculations

## Refactor Steps

### Step 1. Add characterization tests first

Before changing behavior, add executable tests that describe:

- current valid cases that must keep working
- broken asymmetric cases that the future refactor must fix

### Step 2. Isolate side-panel extraction and fusion

Introduce pure helpers in `src/lib/domain/body.ts` or a dedicated module:

- find left-side segments of a body
- find right-side segments of a body
- build fused shared-side segments from two neighboring bodies
- remove or restore boundary-side segments deterministically

These helpers should not rely on names alone when avoidable.

### Step 3. Replace heuristic enable/disable logic

`applySharedBoundary()` should:

- compute the shared panel explicitly
- write it once on the owner body
- remove duplicate boundary panels from the dependent body
- preserve non-boundary panels untouched

Disable should:

- reconstruct each body’s own side from the explicit shared geometry, not from hardcoded heights

### Step 4. Recalculate both neighbors on edits

When a body participating in a shared boundary changes:

- width
- depth
- relevant height-driving structure

the adjacent body must also be updated if the shared panel geometry depends on it.

### Step 5. Normalize destructive flows

Before or during:

- remove body
- duplicate body
- insert body between shared bodies

normalize boundaries so no orphan shared-side state survives.

### Step 6. Align UI with the explicit model

Once the model is explicit, update:

- `BodyCard`
- `WallSurveyDiagram`
- `PlanTab`
- `MontageTab`

so they render the actual shared piece rather than inferring it from flags.

## Acceptance Criteria

- shared side thickness/ownership is explicit in model behavior
- adjacent bodies of different depths compute a correct shared depth
- asymmetric heights and segmented side panels produce stable, reversible sharing
- toggling sharing on/off is reversible without hardcoded reconstruction artifacts
- removing or duplicating a shared body keeps geometry coherent
- all editor views display the same shared-side reality

## Suggested Test Matrix

- two equal bodies, equal depth, equal side segmentation
- two equal bodies, different depth
- left body split side panels, right body full-height side
- three bodies with center body sharing left and right
- enable share, resize left depth, verify neighbor coherence
- enable share, resize right depth, verify owner coherence
- enable share, remove left body
- enable share, remove right body
- enable share, duplicate left body
- enable share, add doors before and after sharing
- enable share, add shelves/separators after sharing
