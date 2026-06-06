import * as fs from 'fs';
import * as path from 'path';

let logFileHandle: fs.WriteStream | null = null;
let logFilePath: string = '';
// 日志开关：false 时禁用文件日志写入
const LOG_ENABLED = false;

export function initLogger(): void {
  // Get the directory where the executable is located
  const exePath = process.execPath;
  const exeDir = path.dirname(exePath);
  
  logFilePath = path.join(exeDir, 'debug.log');
  
  console.log(`[LOGGER] Initializing logger, log file: ${logFilePath}`);
  
  if (!LOG_ENABLED) {
    console.log('[LOGGER] File logging disabled');
    return;
  }
  
  // Rotate log file if it's too big (>1MB)
  try {
    const stats = fs.statSync(logFilePath);
    if (stats.size > 1024 * 1024) {
      fs.renameSync(logFilePath, `${logFilePath}.old`);
    }
  } catch {
    // File doesn't exist, ignore
  }
  
  logFileHandle = fs.createWriteStream(logFilePath, { 
    flags: 'a',
    encoding: 'utf-8'
  });
  
  log('Logger initialized');
}

export function log(message: string, level: 'info' | 'warn' | 'error' = 'info'): void {
  const timestamp = new Date().toISOString();
  const logLine = `[${timestamp}] [${level.toUpperCase()}] ${message}\n`;
  
  // Write to console
  console.log(logLine.trim());
  
  // Write to file (only when enabled)
  if (LOG_ENABLED && logFileHandle) {
    logFileHandle.write(logLine);
  }
}

export function logHierarchyOperation(operation: string, promptId: string, parentId: string | null, order: number): void {
  // 禁用层级操作日志
}

export function getLogFilePath(): string {
  return logFilePath;
}