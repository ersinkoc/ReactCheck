/**
 * File system utilities
 * @packageDocumentation
 */

import { readFile, writeFile, mkdir, stat, access, readdir, rm } from 'node:fs/promises';
import { constants } from 'node:fs';
import { dirname, join, resolve, extname, basename } from 'node:path';

/**
 * Check if a file or directory exists
 * @param path - Path to check
 * @returns true if exists
 */
export async function exists(path: string): Promise<boolean> {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if a path is a directory
 * @param path - Path to check
 * @returns true if directory
 */
export async function isDirectory(path: string): Promise<boolean> {
  try {
    const stats = await stat(path);
    return stats.isDirectory();
  } catch {
    return false;
  }
}

/**
 * Check if a path is a file
 * @param path - Path to check
 * @returns true if file
 */
export async function isFile(path: string): Promise<boolean> {
  try {
    const stats = await stat(path);
    return stats.isFile();
  } catch {
    return false;
  }
}

/**
 * Read a text file
 * @param path - File path
 * @param encoding - Text encoding
 * @returns File contents
 */
export async function readTextFile(path: string, encoding: BufferEncoding = 'utf-8'): Promise<string> {
  return readFile(path, { encoding });
}

/**
 * Write a text file
 * @param path - File path
 * @param content - File contents
 * @param encoding - Text encoding
 */
export async function writeTextFile(
  path: string,
  content: string,
  encoding: BufferEncoding = 'utf-8'
): Promise<void> {
  const dir = dirname(path);
  await ensureDir(dir);
  await writeFile(path, content, { encoding });
}

/**
 * Read a JSON file
 * @param path - File path
 * @returns Parsed JSON
 */
export async function readJsonFile<T = unknown>(path: string): Promise<T> {
  const content = await readTextFile(path);
  return JSON.parse(content) as T;
}

/**
 * Write a JSON file
 * @param path - File path
 * @param data - Data to write
 * @param pretty - Whether to format with indentation
 */
export async function writeJsonFile(path: string, data: unknown, pretty: boolean = true): Promise<void> {
  const content = pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data);
  await writeTextFile(path, content);
}

/**
 * Ensure a directory exists, creating it if necessary
 * @param path - Directory path
 */
export async function ensureDir(path: string): Promise<void> {
  if (!(await exists(path))) {
    await mkdir(path, { recursive: true });
  }
}

/**
 * Remove a file or directory
 * @param path - Path to remove
 * @param options - Removal options
 */
export async function remove(
  path: string,
  options: { recursive?: boolean; force?: boolean } = {}
): Promise<void> {
  const { recursive = true, force = true } = options;
  await rm(path, { recursive, force });
}

/**
 * List files in a directory
 * @param path - Directory path
 * @param options - List options
 * @returns Array of file/directory names
 */
export async function listDir(
  path: string,
  options: { recursive?: boolean; filesOnly?: boolean; dirsOnly?: boolean } = {}
): Promise<string[]> {
  const { recursive = false, filesOnly = false, dirsOnly = false } = options;

  const entries = await readdir(path, { withFileTypes: true });
  const results: string[] = [];

  for (const entry of entries) {
    const fullPath = join(path, entry.name);

    if (entry.isDirectory()) {
      if (!filesOnly) {
        results.push(fullPath);
      }
      if (recursive) {
        const subEntries = await listDir(fullPath, options);
        results.push(...subEntries);
      }
    } else if (entry.isFile()) {
      if (!dirsOnly) {
        results.push(fullPath);
      }
    }
  }

  return results;
}

/**
 * Get file extension
 * @param path - File path
 * @returns Extension without dot
 */
export function getExtension(path: string): string {
  return extname(path).slice(1);
}

/**
 * Get file name without extension
 * @param path - File path
 * @returns Filename without extension
 */
export function getBaseName(path: string): string {
  const ext = extname(path);
  return basename(path, ext);
}

/**
 * Resolve a path relative to a base
 * @param base - Base path
 * @param paths - Path segments
 * @returns Resolved path
 */
export function resolvePath(base: string, ...paths: string[]): string {
  return resolve(base, ...paths);
}

/**
 * Join path segments
 * @param paths - Path segments
 * @returns Joined path
 */
export function joinPath(...paths: string[]): string {
  return join(...paths);
}

/**
 * Get directory name
 * @param path - File path
 * @returns Directory name
 */
export function getDirName(path: string): string {
  return dirname(path);
}

/**
 * Find a file by walking up the directory tree
 * @param filename - File to find
 * @param startDir - Starting directory
 * @returns File path if found, null otherwise
 */
export async function findUp(filename: string, startDir: string = process.cwd()): Promise<string | null> {
  let currentDir = resolve(startDir);
  const root = dirname(currentDir);

  while (currentDir !== root) {
    const filePath = join(currentDir, filename);
    if (await exists(filePath)) {
      return filePath;
    }
    const parentDir = dirname(currentDir);
    if (parentDir === currentDir) {
      break;
    }
    currentDir = parentDir;
  }

  // Check root
  const rootFilePath = join(currentDir, filename);
  if (await exists(rootFilePath)) {
    return rootFilePath;
  }

  return null;
}

/**
 * Copy a file
 * @param src - Source path
 * @param dest - Destination path
 */
export async function copyFile(src: string, dest: string): Promise<void> {
  const content = await readFile(src);
  await ensureDir(dirname(dest));
  await writeFile(dest, content);
}

/**
 * Get file size in bytes
 * @param path - File path
 * @returns File size
 */
export async function getFileSize(path: string): Promise<number> {
  const stats = await stat(path);
  return stats.size;
}

/**
 * Get file modification time
 * @param path - File path
 * @returns Modification time
 */
export async function getModifiedTime(path: string): Promise<Date> {
  const stats = await stat(path);
  return stats.mtime;
}

/**
 * Create a temporary file path
 * @param prefix - Filename prefix
 * @param ext - File extension
 * @returns Temporary file path
 */
export function getTempFilePath(prefix: string = 'reactcheck', ext: string = 'tmp'): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).slice(2, 8);
  const filename = `${prefix}-${timestamp}-${random}.${ext}`;

  // Use OS temp directory
  const tmpDir = process.env['TMPDIR'] ?? process.env['TMP'] ?? process.env['TEMP'] ?? '/tmp';
  return join(tmpDir, filename);
}

/**
 * Safely parse a JSON file, returning null on error
 * @param path - File path
 * @returns Parsed JSON or null
 */
export async function safeReadJsonFile<T = unknown>(path: string): Promise<T | null> {
  try {
    return await readJsonFile<T>(path);
  } catch {
    return null;
  }
}

/**
 * Watch options for file watching (placeholder for future implementation)
 */
export interface WatchOptions {
  /** Watch recursively */
  recursive?: boolean;
  /** Debounce delay in ms */
  debounce?: number;
  /** File patterns to include */
  include?: string[];
  /** File patterns to exclude */
  exclude?: string[];
}
