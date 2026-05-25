import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const changeLanguageMock = vi.fn();

vi.mock("../../../src/renderer/i18n", () => ({
  __esModule: true,
  default: { language: "en" },
  changeLanguage: changeLanguageMock,
}));

describe("settings store -> rules sync", () => {
  beforeEach(() => {
    changeLanguageMock.mockReset();
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("force rescans rules after changing a custom platform root path", async () => {
    vi.resetModules();
    const settingsSetMock = vi.fn().mockResolvedValue(undefined);
    const loadFilesMock = vi.fn().mockResolvedValue(undefined);
    vi.doMock("../../../src/renderer/stores/rules.store", () => ({
      useRulesStore: {
        getState: () => ({
          loadFiles: loadFilesMock,
        }),
      },
    }));

    window.api = {
      ...(window.api ?? {}),
      settings: {
        ...(window.api?.settings ?? {}),
        get: vi.fn().mockResolvedValue({ customPlatformRootPaths: {} }),
        set: settingsSetMock,
      },
    };

    const { useSettingsStore } = await import(
      "../../../src/renderer/stores/settings.store"
    );

    useSettingsStore.getState().setCustomPlatformRootPath(
      "opencode",
      "/tmp/opencode-root",
    );
    await vi.dynamicImportSettled();

    expect(loadFilesMock).toHaveBeenCalledWith({ force: true });
    expect(settingsSetMock).toHaveBeenLastCalledWith({
      builtinAgentOverrides: { opencode: { rootPath: "/tmp/opencode-root" } },
      customPlatformRootPaths: { opencode: "/tmp/opencode-root" },
    });
  });
});
