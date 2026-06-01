import { beforeEach, describe, expect, it } from 'vitest';
import { getRuntimeCapabilities } from '../../../desktop/src/renderer/runtime';

describe('web desktop runtime capability parity', () => {
  beforeEach(() => {
    Reflect.set(window, '__PROMPTHUB_WEB__', true);
  });

  it('hides local desktop-only skill surfaces in web runtime', () => {
    expect(getRuntimeCapabilities()).toMatchObject({
      appUpdate: false,
      dataRecovery: false,
      desktopWindowControls: false,
      skillDistribution: false,
      skillFileEditing: false,
      skillLocalScan: false,
      skillPlatformIntegration: false,
      skillStore: false,
    });
  });
});
