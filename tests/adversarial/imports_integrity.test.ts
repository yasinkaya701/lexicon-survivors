import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import ts from 'typescript';

const SRC_DIR = path.resolve(__dirname, '../../src');

function getAllSourceFiles(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...getAllSourceFiles(fullPath));
    } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
      files.push(fullPath);
    }
  }
  return files;
}

function resolveModulePath(sourceFile: string, specifier: string): string | null {
  let resolvedBase: string;
  if (specifier.startsWith('@/')) {
    resolvedBase = path.join(SRC_DIR, specifier.slice(2));
  } else if (specifier.startsWith('./') || specifier.startsWith('../')) {
    resolvedBase = path.resolve(path.dirname(sourceFile), specifier);
  } else {
    // External package like 'react', 'lucide-react', etc.
    return null;
  }

  const candidates = [
    resolvedBase,
    resolvedBase + '.ts',
    resolvedBase + '.tsx',
    resolvedBase + '.d.ts',
    path.join(resolvedBase, 'index.ts'),
    path.join(resolvedBase, 'index.tsx'),
    path.join(resolvedBase, 'page.tsx'),
    path.join(resolvedBase, 'page.ts'),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return candidate;
    }
  }

  return resolvedBase; // Return unresolved candidate for error reporting
}

function getExportedIdentifiers(filePath: string, visitedFiles = new Set<string>()): Set<string> {
  if (visitedFiles.has(filePath)) {
    return new Set();
  }
  visitedFiles.add(filePath);

  const content = fs.readFileSync(filePath, 'utf-8');
  const sourceFile = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true);
  const exports = new Set<string>();

  function visit(node: ts.Node) {
    const modifiers = ts.canHaveModifiers(node) ? ts.getModifiers(node) : undefined;
    const isExported = modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
    const isDefault = modifiers?.some((m) => m.kind === ts.SyntaxKind.DefaultKeyword);

    if (isDefault) {
      exports.add('default');
    }

    if (isExported) {
      if (ts.isFunctionDeclaration(node) && node.name) {
        exports.add(node.name.text);
      } else if (ts.isClassDeclaration(node) && node.name) {
        exports.add(node.name.text);
      } else if (ts.isVariableStatement(node)) {
        for (const decl of node.declarationList.declarations) {
          if (ts.isIdentifier(decl.name)) {
            exports.add(decl.name.text);
          }
        }
      } else if (ts.isTypeAliasDeclaration(node)) {
        exports.add(node.name.text);
      } else if (ts.isInterfaceDeclaration(node)) {
        exports.add(node.name.text);
      } else if (ts.isEnumDeclaration(node)) {
        exports.add(node.name.text);
      }
    }

    if (ts.isExportDeclaration(node)) {
      if (node.exportClause && ts.isNamedExports(node.exportClause)) {
        for (const element of node.exportClause.elements) {
          exports.add(element.name.text);
        }
      } else if (!node.exportClause && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
        const reExportPath = resolveModulePath(filePath, node.moduleSpecifier.text);
        if (reExportPath && fs.existsSync(reExportPath) && fs.statSync(reExportPath).isFile()) {
          const reExports = getExportedIdentifiers(reExportPath, visitedFiles);
          for (const item of reExports) {
            exports.add(item);
          }
        }
      }
    }

    if (ts.isExportAssignment(node)) {
      exports.add('default');
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return exports;
}

interface ImportInfo {
  sourceFile: string;
  specifier: string;
  resolvedPath: string | null;
  namedImports: string[];
  hasDefaultImport: boolean;
  isExternal: boolean;
}

function analyzeImports(filePath: string): ImportInfo[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const sourceFile = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true);
  const imports: ImportInfo[] = [];

  function visit(node: ts.Node) {
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
      const specifier = node.moduleSpecifier.text;
      const isInternal = specifier.startsWith('@/') || specifier.startsWith('./') || specifier.startsWith('../');
      const resolved = isInternal ? resolveModulePath(filePath, specifier) : null;
      const namedImports: string[] = [];
      let hasDefaultImport = false;

      if (node.importClause) {
        if (node.importClause.name) {
          hasDefaultImport = true;
        }
        if (node.importClause.namedBindings) {
          if (ts.isNamedImports(node.importClause.namedBindings)) {
            for (const elem of node.importClause.namedBindings.elements) {
              const name = elem.propertyName ? elem.propertyName.text : elem.name.text;
              namedImports.push(name);
            }
          }
        }
      }

      imports.push({
        sourceFile: filePath,
        specifier,
        resolvedPath: resolved,
        namedImports,
        hasDefaultImport,
        isExternal: !isInternal,
      });
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return imports;
}

describe('Adversarial Codebase Integrity & Import Stress Tests', () => {
  const allSourceFiles = getAllSourceFiles(SRC_DIR);

  it('found all expected source files in src/', () => {
    expect(allSourceFiles.length).toBeGreaterThanOrEqual(14);
    expect(allSourceFiles.some((f) => f.endsWith('src/app/page.tsx'))).toBe(true);
    expect(allSourceFiles.some((f) => f.endsWith('src/app/legacy/page.tsx'))).toBe(true);
    expect(allSourceFiles.some((f) => f.endsWith('src/legacy/LegacyApp.tsx'))).toBe(true);
    expect(allSourceFiles.some((f) => f.endsWith('src/types/brotato.ts'))).toBe(true);
  });

  it('has zero unresolved internal imports across all src files', () => {
    const unresolvable: { file: string; specifier: string; candidate: string | null }[] = [];

    for (const file of allSourceFiles) {
      const imports = analyzeImports(file);
      for (const imp of imports) {
        if (!imp.isExternal) {
          if (!imp.resolvedPath || !fs.existsSync(imp.resolvedPath)) {
            unresolvable.push({
              file: path.relative(SRC_DIR, file),
              specifier: imp.specifier,
              candidate: imp.resolvedPath,
            });
          }
        }
      }
    }

    expect(unresolvable).toEqual([]);
  });

  it('has zero unexported named import references across all internal modules', () => {
    const brokenImports: {
      file: string;
      target: string;
      missing: string[];
      available: string[];
    }[] = [];

    const exportsCache = new Map<string, Set<string>>();

    for (const file of allSourceFiles) {
      const imports = analyzeImports(file);
      for (const imp of imports) {
        if (!imp.isExternal && imp.resolvedPath && fs.existsSync(imp.resolvedPath)) {
          if (!exportsCache.has(imp.resolvedPath)) {
            exportsCache.set(imp.resolvedPath, getExportedIdentifiers(imp.resolvedPath));
          }
          const available = exportsCache.get(imp.resolvedPath)!;

          const missing: string[] = [];
          for (const name of imp.namedImports) {
            if (!available.has(name)) {
              missing.push(name);
            }
          }

          if (imp.hasDefaultImport && !available.has('default')) {
            missing.push('default');
          }

          if (missing.length > 0) {
            brokenImports.push({
              file: path.relative(SRC_DIR, file),
              target: path.relative(SRC_DIR, imp.resolvedPath),
              missing,
              available: Array.from(available),
            });
          }
        }
      }
    }

    expect(brokenImports).toEqual([]);
  });

  it('has zero circular dependencies across internal modules (DAG verification)', () => {
    // Build adjacency list
    const adj = new Map<string, Set<string>>();
    for (const file of allSourceFiles) {
      adj.set(file, new Set());
    }

    for (const file of allSourceFiles) {
      const imports = analyzeImports(file);
      for (const imp of imports) {
        if (!imp.isExternal && imp.resolvedPath && fs.existsSync(imp.resolvedPath)) {
          adj.get(file)?.add(imp.resolvedPath);
        }
      }
    }

    // Cycle detection via DFS
    const visited = new Map<string, 0 | 1 | 2>(); // 0: unvisited, 1: visiting, 2: visited
    for (const file of allSourceFiles) {
      visited.set(file, 0);
    }

    const detectedCycles: string[][] = [];

    function dfs(node: string, currentPath: string[]) {
      visited.set(node, 1);
      currentPath.push(node);

      const neighbors = adj.get(node) || new Set();
      for (const neighbor of neighbors) {
        const state = visited.get(neighbor) || 0;
        if (state === 1) {
          // Found cycle
          const cycleStart = currentPath.indexOf(neighbor);
          const cycle = currentPath.slice(cycleStart).map((p) => path.relative(SRC_DIR, p));
          cycle.push(path.relative(SRC_DIR, neighbor));
          detectedCycles.push(cycle);
        } else if (state === 0) {
          dfs(neighbor, currentPath);
        }
      }

      currentPath.pop();
      visited.set(node, 2);
    }

    for (const file of allSourceFiles) {
      if (visited.get(file) === 0) {
        dfs(file, []);
      }
    }

    expect(detectedCycles).toEqual([]);
  });

  it('verifies no legacy components exist in src/components and all files are valid Brotato UI components', () => {
    const componentsDir = path.join(SRC_DIR, 'components');
    if (fs.existsSync(componentsDir)) {
      const files = fs.readdirSync(componentsDir).filter((f) => !f.startsWith('.'));

      const legacyComponents = [
        'BattleArena.tsx',
        'JuryGodModeBar.tsx',
        'CharacterSelect.tsx',
        'GameEngine.tsx',
        'HeroSelect.tsx',
        'QuestionModal.tsx',
        'StatsDisplay.tsx',
        'UpgradeModal.tsx',
        'KilyosDetective.tsx',
        'RoomSimulator.tsx',
        'SpikeDefuseSim.tsx',
        'SurvivorsArena.tsx',
        'VictoryScene.tsx',
      ];

      for (const comp of legacyComponents) {
        expect(files, `Legacy component ${comp} must not exist in src/components`).not.toContain(comp);
      }

      const validBrotatoComponents = new Set([
        'GameCanvas.tsx',
        'HUD.tsx',
        'ShopModal.tsx',
        'StudyBuffModal.tsx',
        'TacticalFreezeModal.tsx',
        'TelemetryModal.tsx',
        'MistakeNotebookModal.tsx',
        'MasteryRadarChart.tsx',
        'WeaponInventoryBar.tsx',
        'GameOverModal.tsx',
        'VictoryModal.tsx',
      ]);

      for (const file of files) {
        expect(
          validBrotatoComponents.has(file),
          `Found invalid or unexpected component in src/components: ${file}`
        ).toBe(true);
      }
    }
  });

  it('verifies all 8 legacy components exist in src/legacy/components', () => {
    const legacyDir = path.join(SRC_DIR, 'legacy/components');
    expect(fs.existsSync(legacyDir)).toBe(true);

    const requiredComponents = [
      'BattleArena.tsx',
      'JuryGodModeBar.tsx',
      'KilyosDetective.tsx',
      'RoomSimulator.tsx',
      'SpikeDefuseSim.tsx',
      'SurvivorsArena.tsx',
      'TelemetryModal.tsx',
      'VictoryScene.tsx',
    ];

    for (const comp of requiredComponents) {
      const compPath = path.join(legacyDir, comp);
      expect(fs.existsSync(compPath), `Expected ${comp} to exist in src/legacy/components`).toBe(true);
    }
  });
});
