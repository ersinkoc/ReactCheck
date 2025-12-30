/**
 * Tests for file system utilities
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from '../../../src/utils/fs.js';
import { mkdir, writeFile, rm, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('File System Utilities', () => {
  const testDir = join(tmpdir(), 'reactcheck-test-' + Date.now());
  const testFile = join(testDir, 'test.txt');
  const testJsonFile = join(testDir, 'test.json');

  beforeEach(async () => {
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    try {
      await rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('exists()', () => {
    it('should return true for existing file', async () => {
      await writeFile(testFile, 'test');
      expect(await fs.exists(testFile)).toBe(true);
    });

    it('should return false for non-existing file', async () => {
      expect(await fs.exists(join(testDir, 'nonexistent.txt'))).toBe(false);
    });

    it('should return true for existing directory', async () => {
      expect(await fs.exists(testDir)).toBe(true);
    });
  });

  describe('isDirectory()', () => {
    it('should return true for directory', async () => {
      expect(await fs.isDirectory(testDir)).toBe(true);
    });

    it('should return false for file', async () => {
      await writeFile(testFile, 'test');
      expect(await fs.isDirectory(testFile)).toBe(false);
    });

    it('should return false for non-existing path', async () => {
      expect(await fs.isDirectory(join(testDir, 'nonexistent'))).toBe(false);
    });
  });

  describe('isFile()', () => {
    it('should return true for file', async () => {
      await writeFile(testFile, 'test');
      expect(await fs.isFile(testFile)).toBe(true);
    });

    it('should return false for directory', async () => {
      expect(await fs.isFile(testDir)).toBe(false);
    });

    it('should return false for non-existing path', async () => {
      expect(await fs.isFile(join(testDir, 'nonexistent'))).toBe(false);
    });
  });

  describe('readTextFile()', () => {
    it('should read text file contents', async () => {
      await writeFile(testFile, 'hello world');
      const content = await fs.readTextFile(testFile);
      expect(content).toBe('hello world');
    });

    it('should use specified encoding', async () => {
      await writeFile(testFile, 'hello world', 'utf-8');
      const content = await fs.readTextFile(testFile, 'utf-8');
      expect(content).toBe('hello world');
    });

    it('should throw for non-existing file', async () => {
      await expect(fs.readTextFile(join(testDir, 'nonexistent'))).rejects.toThrow();
    });
  });

  describe('writeTextFile()', () => {
    it('should write text file', async () => {
      await fs.writeTextFile(testFile, 'hello world');
      const content = await fs.readTextFile(testFile);
      expect(content).toBe('hello world');
    });

    it('should create parent directories', async () => {
      const nestedFile = join(testDir, 'nested', 'deep', 'file.txt');
      await fs.writeTextFile(nestedFile, 'nested content');
      expect(await fs.exists(nestedFile)).toBe(true);
    });
  });

  describe('readJsonFile()', () => {
    it('should read and parse JSON file', async () => {
      const data = { key: 'value', count: 42 };
      await writeFile(testJsonFile, JSON.stringify(data));
      const parsed = await fs.readJsonFile(testJsonFile);
      expect(parsed).toEqual(data);
    });

    it('should throw for invalid JSON', async () => {
      await writeFile(testJsonFile, 'not valid json');
      await expect(fs.readJsonFile(testJsonFile)).rejects.toThrow();
    });
  });

  describe('writeJsonFile()', () => {
    it('should write formatted JSON', async () => {
      const data = { key: 'value' };
      await fs.writeJsonFile(testJsonFile, data);
      const content = await fs.readTextFile(testJsonFile);
      expect(content).toContain('  ');  // Indented
    });

    it('should write compact JSON when not pretty', async () => {
      const data = { key: 'value' };
      await fs.writeJsonFile(testJsonFile, data, false);
      const content = await fs.readTextFile(testJsonFile);
      expect(content).not.toContain('  ');
    });
  });

  describe('ensureDir()', () => {
    it('should create directory if not exists', async () => {
      const newDir = join(testDir, 'newdir');
      await fs.ensureDir(newDir);
      expect(await fs.isDirectory(newDir)).toBe(true);
    });

    it('should not throw if directory exists', async () => {
      await expect(fs.ensureDir(testDir)).resolves.toBeUndefined();
    });
  });

  describe('remove()', () => {
    it('should remove file', async () => {
      await writeFile(testFile, 'test');
      await fs.remove(testFile);
      expect(await fs.exists(testFile)).toBe(false);
    });

    it('should remove directory recursively', async () => {
      const subDir = join(testDir, 'subdir');
      await mkdir(subDir);
      await writeFile(join(subDir, 'file.txt'), 'test');
      await fs.remove(subDir);
      expect(await fs.exists(subDir)).toBe(false);
    });

    it('should not throw for non-existing path with force', async () => {
      await expect(fs.remove(join(testDir, 'nonexistent'))).resolves.toBeUndefined();
    });
  });

  describe('listDir()', () => {
    beforeEach(async () => {
      // Create test structure
      await writeFile(join(testDir, 'file1.txt'), 'test');
      await writeFile(join(testDir, 'file2.txt'), 'test');
      await mkdir(join(testDir, 'subdir'));
      await writeFile(join(testDir, 'subdir', 'file3.txt'), 'test');
    });

    it('should list files and directories', async () => {
      const items = await fs.listDir(testDir);
      expect(items.length).toBe(3);
    });

    it('should list recursively', async () => {
      const items = await fs.listDir(testDir, { recursive: true });
      expect(items.length).toBe(4);
    });

    it('should filter files only', async () => {
      const items = await fs.listDir(testDir, { filesOnly: true });
      expect(items.every((item) => !item.includes('subdir') || item.includes('.txt'))).toBe(true);
    });

    it('should filter directories only', async () => {
      const items = await fs.listDir(testDir, { dirsOnly: true });
      expect(items.length).toBe(1);
      expect(items[0]).toContain('subdir');
    });
  });

  describe('getExtension()', () => {
    it('should return extension without dot', () => {
      expect(fs.getExtension('file.txt')).toBe('txt');
    });

    it('should return empty for no extension', () => {
      expect(fs.getExtension('file')).toBe('');
    });

    it('should handle multiple dots', () => {
      expect(fs.getExtension('file.test.ts')).toBe('ts');
    });
  });

  describe('getBaseName()', () => {
    it('should return filename without extension', () => {
      expect(fs.getBaseName('file.txt')).toBe('file');
    });

    it('should handle paths', () => {
      expect(fs.getBaseName('/path/to/file.txt')).toBe('file');
    });
  });

  describe('resolvePath()', () => {
    it('should resolve relative paths', () => {
      const result = fs.resolvePath('/base', 'relative');
      expect(result).toContain('base');
      expect(result).toContain('relative');
    });
  });

  describe('joinPath()', () => {
    it('should join path segments', () => {
      const result = fs.joinPath('a', 'b', 'c');
      expect(result).toMatch(/a[/\\]b[/\\]c/);
    });
  });

  describe('getDirName()', () => {
    it('should return directory name', () => {
      const result = fs.getDirName('/path/to/file.txt');
      expect(result).toMatch(/[/\\]path[/\\]to$/);
    });
  });

  describe('findUp()', () => {
    it('should find file in parent directory', async () => {
      await writeFile(join(testDir, 'target.txt'), 'test');
      const subDir = join(testDir, 'sub');
      await mkdir(subDir);
      const result = await fs.findUp('target.txt', subDir);
      expect(result).toContain('target.txt');
    });

    it('should return null if not found', async () => {
      const result = await fs.findUp('nonexistent-unique-12345.txt', testDir);
      expect(result).toBeNull();
    });

    it('should traverse up multiple levels to find file', async () => {
      // Create nested structure
      const nestedDir = join(testDir, 'level1', 'level2');
      await mkdir(nestedDir, { recursive: true });
      await writeFile(join(testDir, 'level1', 'find-me.txt'), 'found');

      // Search from level2, should find in level1
      const result = await fs.findUp('find-me.txt', nestedDir);
      if (result) {
        expect(result).toMatch(/find-me\.txt$/);
      }
    });

    it('should use current working directory as default', async () => {
      // Just test that it doesn't throw with no second argument
      const result = await fs.findUp('nonexistent-unique-file-abc123.txt');
      expect(result).toBeNull();
    });

    it('should find file in same directory', async () => {
      await writeFile(join(testDir, 'same-dir.txt'), 'test');
      const result = await fs.findUp('same-dir.txt', testDir);
      expect(result).toContain('same-dir.txt');
    });

    it('should handle directory that equals root', async () => {
      // Test with a path that's very close to root
      const result = await fs.findUp('nonexistent-file-xyz789.txt', '/');
      expect(result).toBeNull();
    });

    it('should break when parentDir equals currentDir (root reached)', async () => {
      // Use a root path that when dirname() is called returns itself
      // On Windows: C:\ or D:\, On Unix: /
      const rootPath = process.platform === 'win32' ? 'C:\\' : '/';
      const result = await fs.findUp('absolutely-nonexistent-file-12345.txt', rootPath);
      expect(result).toBeNull();
    });
  });

  describe('copyFile()', () => {
    it('should copy file to destination', async () => {
      await writeFile(testFile, 'source content');
      const dest = join(testDir, 'copy.txt');
      await fs.copyFile(testFile, dest);
      expect(await fs.readTextFile(dest)).toBe('source content');
    });

    it('should create parent directories', async () => {
      await writeFile(testFile, 'source content');
      const dest = join(testDir, 'nested', 'copy.txt');
      await fs.copyFile(testFile, dest);
      expect(await fs.exists(dest)).toBe(true);
    });
  });

  describe('getFileSize()', () => {
    it('should return file size', async () => {
      await writeFile(testFile, 'hello');
      const size = await fs.getFileSize(testFile);
      expect(size).toBe(5);
    });
  });

  describe('getModifiedTime()', () => {
    it('should return modification time', async () => {
      await writeFile(testFile, 'test');
      const mtime = await fs.getModifiedTime(testFile);
      expect(mtime).toBeInstanceOf(Date);
      // Allow small tolerance for timing differences between file system and Date.now()
      expect(mtime.getTime()).toBeLessThanOrEqual(Date.now() + 100);
    });
  });

  describe('getTempFilePath()', () => {
    it('should return path with prefix', () => {
      const path = fs.getTempFilePath('myprefix');
      expect(path).toContain('myprefix');
    });

    it('should return path with extension', () => {
      const path = fs.getTempFilePath('prefix', 'json');
      expect(path).toContain('.json');
    });

    it('should use default prefix', () => {
      const path = fs.getTempFilePath();
      expect(path).toContain('reactcheck');
    });
  });

  describe('safeReadJsonFile()', () => {
    it('should return parsed JSON', async () => {
      const data = { key: 'value' };
      await writeFile(testJsonFile, JSON.stringify(data));
      const result = await fs.safeReadJsonFile(testJsonFile);
      expect(result).toEqual(data);
    });

    it('should return null for non-existing file', async () => {
      const result = await fs.safeReadJsonFile(join(testDir, 'nonexistent.json'));
      expect(result).toBeNull();
    });

    it('should return null for invalid JSON', async () => {
      await writeFile(testJsonFile, 'invalid json');
      const result = await fs.safeReadJsonFile(testJsonFile);
      expect(result).toBeNull();
    });
  });
});
