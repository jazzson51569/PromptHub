import { ipcMain } from 'electron';
import Database from '../database/sqlite';
import { IPC_CHANNELS } from '@prompthub/shared/constants';
import {
  getPlatformById,
  normalizeLegacySkillPathToRootTemplate,
} from '@prompthub/shared/constants/platforms';
import type { Settings } from '@prompthub/shared/types';
import { DEFAULT_SETTINGS } from '@prompthub/shared/types';
import {
  getMinimizeOnLaunchSetting,
  readGithubTokenSetting,
} from '../settings/settings-readers';
import { invalidateCustomPathsCache } from '../services/skill-installer-utils';

export {
  getMinimizeOnLaunchSetting,
  readGithubTokenSetting as getGithubTokenSetting,
} from '../settings/settings-readers';

function isTraeCnLikePath(value: string | undefined): boolean {
  if (typeof value !== 'string') {
    return false;
  }

  return /(?:^|[\\/])\.trae-cn(?:$|[\\/])/i.test(value.trim());
}

function migrateTraeCnPlatformState(settings: Settings): void {
  if (!settings.builtinAgentOverrides) {
    settings.builtinAgentOverrides = {};
  }

  if (!settings.customPlatformRootPaths) {
    settings.customPlatformRootPaths = {};
  }

  const traeBuiltinOverride = settings.builtinAgentOverrides.trae;
  const traeCnBuiltinOverride = settings.builtinAgentOverrides['trae-cn'];

  const traeRootOverride = settings.customPlatformRootPaths.trae;
  const traeCnRootOverride = settings.customPlatformRootPaths['trae-cn'];

  if (
    typeof traeBuiltinOverride?.rootPath === 'string' &&
    isTraeCnLikePath(traeBuiltinOverride.rootPath) &&
    !traeCnBuiltinOverride?.rootPath?.trim()
  ) {
    settings.builtinAgentOverrides['trae-cn'] = {
      ...traeBuiltinOverride,
      rootPath: traeBuiltinOverride.rootPath.trim(),
    };
    delete settings.builtinAgentOverrides.trae;
  }

  if (isTraeCnLikePath(traeRootOverride) && !traeCnRootOverride?.trim()) {
    settings.customPlatformRootPaths['trae-cn'] = traeRootOverride.trim();
    delete settings.customPlatformRootPaths.trae;
  }

  if (
    Array.isArray(settings.disabledPlatformIds) &&
    settings.disabledPlatformIds.includes('trae') &&
    !settings.disabledPlatformIds.includes('trae-cn')
  ) {
    settings.disabledPlatformIds = settings.disabledPlatformIds.map((platformId) =>
      platformId === 'trae' ? 'trae-cn' : platformId,
    );
  }

  if (
    Array.isArray(settings.skillPlatformOrder) &&
    settings.skillPlatformOrder.includes('trae') &&
    !settings.skillPlatformOrder.includes('trae-cn')
  ) {
    settings.skillPlatformOrder = settings.skillPlatformOrder.map((platformId) =>
      platformId === 'trae' ? 'trae-cn' : platformId,
    );
  }
}

/**
 * Register settings-related IPC handlers
 */
export function registerSettingsIPC(db: Database.Database): void {
  // Get settings
  ipcMain.handle(IPC_CHANNELS.SETTINGS_GET, async () => {
    const settings: Settings = { ...DEFAULT_SETTINGS };

    const stmt = db.prepare('SELECT key, value FROM settings');
    const rows = stmt.all() as { key: string; value: string }[];

    for (const row of rows) {
      try {
        (settings as any)[row.key] = JSON.parse(row.value);
      } catch {
        (settings as any)[row.key] = row.value;
      }
    }

    if (
      (!Array.isArray(settings.customAgents) || settings.customAgents.length === 0) &&
      (!Array.isArray(settings.customAgentRootPaths) ||
        settings.customAgentRootPaths.length === 0) &&
      Array.isArray((settings as Settings & { customSkillScanPaths?: string[] }).customSkillScanPaths) &&
      (settings as Settings & { customSkillScanPaths?: string[] }).customSkillScanPaths!.length > 0
    ) {
      settings.customAgentRootPaths = [
        ...new Set(
          (settings as Settings & { customSkillScanPaths?: string[] }).customSkillScanPaths!
            .filter((entry): entry is string => typeof entry === 'string')
            .map((entry) => entry.trim())
            .filter((entry) => entry.length > 0),
        ),
      ];
    }

    if (
      (!Array.isArray(settings.customAgents) || settings.customAgents.length === 0) &&
      Array.isArray(settings.customAgentRootPaths) &&
      settings.customAgentRootPaths.length > 0
    ) {
      settings.customAgents = settings.customAgentRootPaths.map((rootPath, index) => ({
        id: `migrated_agent_${index}`,
        name: `Custom Agent ${index + 1}`,
        rootPath,
      }));
    }

    if (
      (!settings.builtinAgentOverrides ||
        Object.keys(settings.builtinAgentOverrides).length === 0) &&
      settings.customPlatformRootPaths &&
      Object.keys(settings.customPlatformRootPaths).length > 0
    ) {
      settings.builtinAgentOverrides = Object.fromEntries(
        Object.entries(settings.customPlatformRootPaths).map(([platformId, rootPath]) => [
          platformId,
          { rootPath },
        ]),
      );
    }

    if (
      (!settings.customPlatformRootPaths ||
        Object.keys(settings.customPlatformRootPaths).length === 0) &&
      settings.customSkillPlatformPaths &&
      Object.keys(settings.customSkillPlatformPaths).length > 0
    ) {
      settings.customPlatformRootPaths = Object.fromEntries(
        Object.entries(settings.customSkillPlatformPaths).map(
          ([platformId, skillPath]) => {
            const platform = getPlatformById(platformId);
            if (!platform) {
              return [platformId, skillPath];
            }
            return [
              platformId,
              normalizeLegacySkillPathToRootTemplate(platform, skillPath),
            ];
          },
        ),
      );
    }

    settings.customPlatformRootPaths = Object.fromEntries(
      Object.entries(settings.builtinAgentOverrides ?? {}).flatMap(([platformId, override]) =>
        typeof override?.rootPath === 'string' && override.rootPath.trim()
          ? [[platformId, override.rootPath.trim()] as const]
          : [],
      ),
    );

    const legacyDisabledPlatformIds = (settings as Settings & {
      trackedRulePlatformIds?: string[];
    }).trackedRulePlatformIds;
    if (
      (!Array.isArray(settings.disabledPlatformIds) ||
        settings.disabledPlatformIds.length === 0) &&
      Array.isArray(legacyDisabledPlatformIds)
    ) {
      settings.disabledPlatformIds = legacyDisabledPlatformIds;
    }

    migrateTraeCnPlatformState(settings);

    return settings;
  });

  // Save settings
  ipcMain.handle(IPC_CHANNELS.SETTINGS_SET, async (_event, newSettings: Partial<Settings>) => {
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)
    `);

    const transaction = db.transaction(() => {
      for (const [key, value] of Object.entries(newSettings)) {
        stmt.run(key, JSON.stringify(value));
      }
    });

    transaction();
    if (
      Object.prototype.hasOwnProperty.call(newSettings, 'builtinAgentOverrides') ||
      Object.prototype.hasOwnProperty.call(newSettings, 'customPlatformRootPaths') ||
      Object.prototype.hasOwnProperty.call(newSettings, 'customSkillPlatformPaths')
    ) {
      invalidateCustomPathsCache();
    }
    return true;
  });
}
