import { beforeEach, describe, expect, it } from 'vitest';
import { runPipeline, pipelineResultToAppState } from '../pipeline';
import { _resetCounter as resetIntent } from '../intent';
import { _resetCounter as resetLayout } from '../layout';
import { _resetPartCounter as resetGeom } from '../geometry';
import { MATERIALS } from '../../../data/materials';
import type { ProjectIntent } from '../../knowledge/types';

function makeIntent(overrides: Partial<ProjectIntent> = {}): ProjectIntent {
  return {
    furniture_type: 'bibliotheque',
    material_key: 'cp_bouleau',
    space: {
      width_mm: 800,
      height_mm: 1800,
      depth_mm: 300,
      plinth_mm: 0,
      wall_type: 'concrete',
    },
    ...overrides,
  };
}

beforeEach(() => {
  resetIntent();
  resetLayout();
  resetGeom();
});

describe('pipelineResultToAppState bridge', () => {
  it('converts a simple bibliotheque into one legacy body with coherent cm dimensions', () => {
    const intent = makeIntent({
      zones: [
        { module_id: 'shelf_adjustable', height_mm: 1800, config: { type: 'shelf_adjustable', count: 4, spacing_mm: 300 } },
      ],
    });

    const result = runPipeline(intent);
    const appState = pipelineResultToAppState(result, 'cp_bouleau');

    expect(appState.bodies.length).toBe(1);
    expect(appState.bodies[0].pieces.length).toBeGreaterThan(0);
    expect(appState.bodies[0].width).toBe(80);
    expect(appState.bodies[0].depth).toBe(30);
    expect(appState.bodies[0].pieces.every((piece) => piece.type !== undefined)).toBe(true);
    expect(appState.intent).toEqual(result.intent);
  });

  it('maps doors into legacy doorConfig for a placard', () => {
    const intent: ProjectIntent = {
      furniture_type: 'placard',
      material_key: 'cp_bouleau',
      space: { width_mm: 1100, height_mm: 2000, depth_mm: 600, plinth_mm: 80, wall_type: 'concrete' },
    };

    const result = runPipeline(intent);
    const appState = pipelineResultToAppState(result, 'cp_bouleau');

    expect(appState.bodies[0].doorConfig).toBeDefined();
    expect(appState.bodies[0].doorConfig?.count).toBe(2);
    expect(appState.bodies[0].doorConfig?.poseType).toBe('demi-recouvrement');
    expect(appState.bodies[0].pieces.some((piece) => piece.type === 'porte')).toBe(true);
  });

  it('omits doorConfig and porte pieces when door_override is false', () => {
    const intent: ProjectIntent = {
      furniture_type: 'placard',
      material_key: 'cp_bouleau',
      space: { width_mm: 600, height_mm: 2000, depth_mm: 600, plinth_mm: 80, wall_type: 'concrete' },
      door_override: false,
    };

    const result = runPipeline(intent);
    const appState = pipelineResultToAppState(result, 'cp_bouleau');

    expect(appState.bodies[0].doorConfig).toBeUndefined();
    expect(appState.bodies[0].pieces.some((piece) => piece.type === 'porte')).toBe(false);
  });

  it('preserves wall mount hardware for a suspended wall shelf', () => {
    const intent: ProjectIntent = {
      furniture_type: 'etagere_murale',
      material_key: 'cp_bouleau',
      space: { width_mm: 800, height_mm: 400, depth_mm: 250, plinth_mm: 0, wall_type: 'concrete' },
    };

    const result = runPipeline(intent);
    const appState = pipelineResultToAppState(result, 'cp_bouleau');

    expect(appState.project.plinthHeight).toBe(0);
    expect(appState.hardwareList?.some((item) => item.category === 'wall_mount')).toBe(true);
  });

  it('creates multiple bodies when width exceeds material span and preserves total width', () => {
    const intent = makeIntent({
      space: { width_mm: 2500, height_mm: 1800, depth_mm: 300, plinth_mm: 0, wall_type: 'concrete' },
      zones: [
        { module_id: 'shelf_adjustable', height_mm: 1800, config: { type: 'shelf_adjustable', count: 4, spacing_mm: 300 } },
      ],
    });

    const result = runPipeline(intent);
    const appState = pipelineResultToAppState(result, 'melamine');
    const totalWidth = appState.bodies.reduce((sum, body) => sum + body.width, 0);

    expect(appState.bodies.length).toBeGreaterThan(1);
    expect(totalWidth).toBeCloseTo(250, 1);
  });

  it('preserves edge_banding on visible pieces and leaves fond without it', () => {
    const intent = makeIntent({
      zones: [
        { module_id: 'shelf_adjustable', height_mm: 1800, config: { type: 'shelf_adjustable', count: 4, spacing_mm: 300 } },
      ],
    });

    const result = runPipeline(intent);
    const appState = pipelineResultToAppState(result, 'cp_bouleau');
    const allPieces = appState.bodies.flatMap((body) => body.pieces);
    const joue = allPieces.find((piece) => piece.type === 'joue');
    const fond = allPieces.find((piece) => piece.type === 'fond');

    expect(joue?.edge_banding).toBeDefined();
    expect(joue?.edge_banding?.length).toBeGreaterThan(0);
    expect(fond?.edge_banding).toBeUndefined();
  });

  it('preserves drilling_count on side panels when adjustable shelves are present', () => {
    const intent = makeIntent({
      zones: [
        { module_id: 'shelf_adjustable', height_mm: 1800, config: { type: 'shelf_adjustable', count: 4, spacing_mm: 300 } },
      ],
    });

    const result = runPipeline(intent);
    const appState = pipelineResultToAppState(result, 'cp_bouleau');
    const joues = appState.bodies.flatMap((body) => body.pieces).filter((piece) => piece.type === 'joue');

    expect(joues.length).toBeGreaterThan(0);
    expect(joues.every((piece) => (piece.drilling_count ?? 0) > 0)).toBe(true);
  });

  it('keeps mm to cm conversion coherent for project width and panel thickness', () => {
    const intent = makeIntent();
    const result = runPipeline(intent);
    const appState = pipelineResultToAppState(result, 'cp_bouleau');

    expect(appState.project.wallWidth).toBe(intent.space.width_mm / 10);
    expect(appState.panel.thickness).toBe(MATERIALS.cp_bouleau.defaultThickness / 10);
  });
});
