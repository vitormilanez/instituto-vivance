// Run the existing TypeScript sources with Node's test runner, without another dependency.
import { registerHooks } from 'node:module';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import ts from 'typescript';

const root = new URL('../', import.meta.url);
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === 'next/headers') return nextResolve('next/headers.js', context);
    // Only the Cloudflare binding is replaced. Tests execute the production SQL/services.
    if (specifier === '@/db') return { url: new URL('tests/helpers/d1.ts', root).href, shortCircuit: true };
    if (specifier.startsWith('@/') || specifier.startsWith('.')) {
      const base = specifier.startsWith('@/') ? new URL(specifier.slice(2), root) : new URL(specifier, context.parentURL);
      for (const suffix of ['', '.ts', '.tsx']) {
        const path = `${fileURLToPath(base)}${suffix}`;
        if (/\.(ts|tsx)$/u.test(path) && existsSync(path)) return { url: pathToFileURL(path).href, shortCircuit: true };
      }
    }
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (/\.(ts|tsx)$/u.test(url)) return {
      format: 'module', shortCircuit: true,
      source: ts.transpileModule(readFileSync(new URL(url), 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ESNext, jsx: ts.JsxEmit.ReactJSX },
      }).outputText,
    };
    return nextLoad(url, context);
  },
});
