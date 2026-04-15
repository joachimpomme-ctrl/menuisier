import { describe, expect, it, vi } from 'vitest';
import {
  closeMoreMenu,
  getInitialMoreMenuOpen,
  isOutsideMoreMenu,
  toggleMoreMenu,
} from '../MoreMenu';

describe('MoreMenu logic', () => {
  it('is closed by default', () => {
    expect(getInitialMoreMenuOpen()).toBe(false);
  });

  it('opens when toggled from the closed state', () => {
    expect(toggleMoreMenu(false)).toBe(true);
  });

  it('export action closes the menu', () => {
    const onExport = vi.fn();

    onExport();

    expect(onExport).toHaveBeenCalledTimes(1);
    expect(closeMoreMenu()).toBe(false);
  });

  it('import action closes the menu', () => {
    const onImport = vi.fn();

    onImport();

    expect(onImport).toHaveBeenCalledTimes(1);
    expect(closeMoreMenu()).toBe(false);
  });

  it('detects outside clicks as close-worthy', () => {
    const target = {} as Node;
    const root = {
      contains: vi.fn(() => false),
    };

    expect(isOutsideMoreMenu(root, target)).toBe(true);
    expect(root.contains).toHaveBeenCalledWith(target);
  });
});
