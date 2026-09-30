const fs = require('fs');
const path = require('path');
// Source inventory, not a localization completeness score or a candidate-count CI gate.
// Usage: node scripts/check-i18n-coverage.cjs [--output path/to/report.json]
// Relative output paths resolve from the working directory. The default is repo/tmp.
const ROOT = path.resolve(__dirname, '..').replaceAll('\\', '/');
function readOutputPath(args) {
  if (args.includes('--help') || args.includes('-h')) {
    console.log('Usage: node scripts/check-i18n-coverage.cjs [--output PATH | PATH]');
    console.log('Writes an AST inventory. Candidate counts never cause failure.');
    console.log('Parse errors or English/Chinese dictionary key mismatches exit 1.');
    process.exit(0);
  }
  if (args.length === 0) return path.join(ROOT, 'tmp', 'i18n-audit.json');
  if (args.length === 1 && !args[0].startsWith('-')) return path.resolve(args[0]);
  if (args.length === 2 && args[0] === '--output' && args[1]) return path.resolve(args[1]);
  throw new Error('Expected --output PATH or a single output path. Use --help for usage.');
}
function loadLocalParser() {
  // Prefer ordinary workspace resolution; pnpm may keep this transitive dependency
  // solely in its virtual store. Discover the installed package without a pinned version.
  const bases = [ROOT, path.join(ROOT, 'ui')];
  const store = path.join(ROOT, 'node_modules', '.pnpm');
  if (fs.existsSync(store)) {
    for (const entry of fs.readdirSync(store).filter(name => name.startsWith('@babel+parser@')).sort()) {
      bases.push(path.join(store, entry));
    }
  }
  for (const base of bases) {
    let resolved;
    try {
      resolved = require.resolve('@babel/parser', {
        paths: [base]
      });
    } catch (error) {
      if (error.code === 'MODULE_NOT_FOUND') continue;
      throw error;
    }
    if (!path.relative(ROOT, resolved).startsWith('..')) return require(resolved);
  }
  throw new Error('No local @babel/parser found. Use the existing installed workspace dependencies; this script does not install packages.');
}
const outputPath = readOutputPath(process.argv.slice(2));
const parser = loadLocalParser();
function walk(dir) {
  return fs.existsSync(dir) ? fs.readdirSync(dir, {
    withFileTypes: true
  }).flatMap(e => e.isDirectory() ? /^(node_modules|dist|build|\.git)$/.test(e.name) ? [] : walk(path.join(dir, e.name)) : [path.join(dir, e.name).replaceAll('\\', '/')]) : [];
}
const excluded = /(?:\.(?:test|spec|stories)\.|\/__tests__\/|\/tests\/|\/fixtures\/|\/examples\/|\/devtools\/|\/paperclip-plugin-fake-sandbox\/|\/i18n\/|(?:preview-main|UxLab|PerfHarness|LongThreadPerf|DesignGuide|TaskChatLab|task-chat-fixtures)\.)/i;
const allUI = walk(ROOT + '/ui/src').filter(f => /\.[cm]?[jt]sx?$/.test(f) && !f.endsWith('.d.ts'));
const pkgAll = walk(ROOT + '/packages').filter(f => /\.[cm]?[jt]sx?$/.test(f) && !f.endsWith('.d.ts'));
const pkgSelected = pkgAll.filter(f => /\.[jt]sx$|\/ui\/|\/manifest\.|\/ui-schema\.|\/config-schema\.|\/adapters\/[^/]+\/src\/(?:index|config|help)\.|\/shared\/src\/(?:constants|adapter|tool|search)/.test(f));
const files = [...allUI, ...pkgSelected].filter(f => !excluded.test(f));
const candidates = [],
  translated = [],
  formats = [],
  frozen = [],
  parseErrors = [],
  fileStats = [],
  routes = [],
  rawEnumDisplays = [];
const fileMap = new Map();
const visibleProps = /^(?:label|title|description|placeholder|aria-label|aria-description|alt|tooltip|help|helperText|emptyText|emptyMessage|loadingText|errorMessage|successMessage|confirmText|cancelText|message|summary|caption|text|hint|heading|subtitle|buttonText|content|displayName)$/;
const technicalProps = /^(?:className|style|key|id|name|value|type|variant|size|href|to|src|path|method|target|rel|role|icon|testId|data-testid|format|accept|pattern|language|code|command|prompt|systemPrompt|model|status|data-state)$/;
const brands = new Set(['Paperclip', 'GitHub', 'GitLab', 'OpenAI', 'Anthropic', 'Claude', 'Codex', 'Cursor', 'Gemini', 'Grok', 'Kimi', 'Hermes', 'Slack', 'Discord', 'Telegram', 'WhatsApp', 'Google', 'Microsoft', 'Notion', 'Linear', 'Vercel', 'Railway', 'Docker', 'MCP', 'API', 'JSON', 'HTTP', 'HTTPS', 'URL', 'URI', 'OAuth', 'OAuth2', 'SSE', 'STDIO', 'CSV', 'PDF', 'HTML', 'CSS', 'SQL', 'SSH', 'CLI', 'ID', 'USD', 'CPU', 'RAM', 'GB', 'MB', 'KB', 'ms', 'px', 'vCPU', 'OpenClaw', 'OpenCode', 'Pi', 'npm', 'pnpm', 'uv', 'npx']);
function human(s) {
  s = s.trim();
  return /[A-Za-z\u4e00-\u9fff]/.test(s) && !brands.has(s) && !/^(?:https?:|file:|data:|\/|@|\.\/|\.\.\/)/.test(s) && !/^[\w.-]+\.[a-z]{2,5}(?:\/.*)?$/i.test(s) && !/^[a-z]+(?:[._][a-z0-9]+)+$/.test(s) && !/^[A-Z][A-Z0-9_]{2,}$/.test(s) && !/[{}<>]/.test(s) && !/(?:^|\s)(?:text-|bg-|border-|rounded-|font-|dark:|hover:|whitespace-|items-|justify-|min-w-|max-w-|select-none|pointer-events-|animate-|data-\[)/.test(s) && !/^\*+\w+\*+$/.test(s) && !/^(?:--|\$|import |export |SELECT |INSERT |curl |npm |pnpm |npx |git |python |node |\w+\s*=)/.test(s);
}
function callee(n) {
  return n?.type === 'Identifier' ? n.name : n?.type === 'MemberExpression' ? callee(n.object) + '.' + callee(n.property) : '';
}
function isT(n) {
  return /^(?:t|i18n\.t|i18next\.t)$/.test(callee(n));
}
function prop(n) {
  return n?.name ?? n?.value ?? '';
}
function traverse(n, ancestors, fn) {
  if (!n || typeof n !== 'object' || !n.type) return;
  fn(n, ancestors);
  for (const [k, v] of Object.entries(n)) {
    if (['loc', 'start', 'end', 'extra', 'comments', 'leadingComments', 'trailingComments', 'innerComments'].includes(k)) continue;
    if (Array.isArray(v)) v.forEach(c => traverse(c, [...ancestors, n], fn));else if (v && typeof v === 'object') traverse(v, [...ancestors, n], fn);
  }
}
for (const abs of files) {
  const file = path.relative(ROOT, abs).replaceAll('\\', '/'),
    src = fs.readFileSync(abs, 'utf8');
  let ast;
  try {
    ast = parser.parse(src, {
      sourceType: 'unambiguous',
      plugins: ['typescript', ...(/\.[jt]sx$/.test(file) ? ['jsx'] : [])],
      errorRecovery: true
    });
  } catch (e) {
    parseErrors.push({
      file,
      error: e.message
    });
    continue;
  }
  for (const error of ast.errors ?? []) parseErrors.push({
    file,
    error: error.message,
    recovered: true
  });
  const stat = {
    file,
    lines: src.split('\n').length,
    translationHook: /\buseTranslation\s*\(/.test(src),
    translationImport: /from\s+["'][^"']*(?:i18n|react-i18next)["']/.test(src),
    candidates: 0,
    translatedCalls: 0,
    imports: [],
    module: file.startsWith('ui/src/') ? file.split('/').slice(2, 4).join('/') : file.split('/').slice(0, 4).join('/')
  };
  const imports = {};
  const localSeen = new Set();
  traverse(ast, [], (n, a) => {
    if (n.type === 'ImportDeclaration') {
      stat.imports.push(n.source.value);
      for (const s of n.specifiers) imports[s.local.name] = n.source.value;
    }
    if (n.type === 'CallExpression' && n.callee.type === 'Import' && n.arguments[0]?.type === 'StringLiteral') {
      stat.imports.push(n.arguments[0].value);
      const v = [...a].reverse().find(x => x.type === 'VariableDeclarator');
      if (v?.id?.name) imports[v.id.name] = n.arguments[0].value;
    }
    if (n.type === 'JSXExpressionContainer' && !a.some(x => x.type === 'JSXAttribute') && /^(?:Identifier|MemberExpression)$/.test(n.expression.type) && /(?:status|priority|severity|state|kind)$/i.test(callee(n.expression))) {
      rawEnumDisplays.push({
        file,
        line: n.loc.start.line,
        expression: src.slice(n.expression.start, n.expression.end),
        status: 'requires-dataflow-review'
      });
    }
    if ((n.type === 'CallExpression' || n.type === 'NewExpression') && /^(?:.*\.)?(?:toLocaleString|toLocaleDateString|toLocaleTimeString)$|^Intl\.(?:DateTimeFormat|NumberFormat|RelativeTimeFormat|ListFormat|PluralRules)$/.test(callee(n.callee))) {
      formats.push({
        file,
        line: n.loc.start.line,
        expression: src.slice(n.start, n.end),
        localeArgument: n.arguments[0] ? src.slice(n.arguments[0].start, n.arguments[0].end) : null,
        status: !n.arguments[0] || n.arguments[0].name === 'undefined' ? 'browser-locale' : n.arguments[0].type === 'StringLiteral' ? 'fixed-locale' : 'dynamic-review'
      });
    }
    if (n.type === 'CallExpression' && isT(n.callee)) {
      stat.translatedCalls++;
      const key = n.arguments[0]?.value;
      translated.push({
        file,
        line: n.loc.start.line,
        key: key ?? null,
        dynamic: typeof key !== 'string'
      });
      const fn = a.find(x => /Function|Method/.test(x.type));
      if (!fn) frozen.push({
        file,
        line: n.loc.start.line,
        kind: 'module-level-t',
        expression: src.slice(n.start, n.end)
      });
      const memo = [...a].reverse().find(x => x.type === 'CallExpression' && /^(?:React\.)?useMemo$/.test(callee(x.callee)));
      if (memo) {
        const deps = memo.arguments[1];
        if (deps?.type === 'ArrayExpression' && !deps.elements.some(x => x && /\bt\b|i18n|locale|language/.test(src.slice(x.start, x.end)))) frozen.push({
          file,
          line: n.loc.start.line,
          kind: 'memo-deps-review',
          expression: src.slice(memo.start, memo.end).slice(-200)
        });
      }
    }
    if (n.type === 'JSXOpeningElement' && n.name?.name === 'Route') {
      const attr = n.attributes.find(x => x.name?.name === 'path');
      const el = n.attributes.find(x => x.name?.name === 'element');
      const names = [];
      if (el) traverse(el, [], x => {
        if (x.type === 'JSXOpeningElement' && x.name.type === 'JSXIdentifier') names.push(x.name.name);
      });
      routes.push({
        source: file,
        line: n.loc.start.line,
        path: attr?.value?.value ?? (attr?.value ? src.slice(attr.value.start, attr.value.end) : '(index/layout)'),
        components: [...new Set(names)],
        componentImports: []
      });
    }
    let textValue,
      kind,
      confidence = 'high';
    if (n.type === 'JSXText') {
      if (a.some(x => x.type === 'JSXElement' && ['code', 'pre'].includes(x.openingElement.name?.name))) return;
      textValue = n.value.replace(/\s+/g, ' ').trim();
      kind = 'jsx-text';
    }
    if (['StringLiteral', 'TemplateLiteral'].includes(n.type)) {
      textValue = n.type === 'StringLiteral' ? n.value : n.quasis.map(x => x.value.cooked ?? '').join('…');
      if (a.some(x => x.type === 'CallExpression' && isT(x.callee))) return;
      if (a.some(x => x.type === 'CallExpression' && /^console\./.test(callee(x.callee)))) return;
      if (a.some(x => ['ImportDeclaration', 'ExportNamedDeclaration', 'TSLiteralType', 'TSImportType'].includes(x.type))) {
        if (a.some(x => x.type === 'ImportDeclaration' || x.type === 'TSLiteralType' || x.type === 'TSImportType')) return;
      }
      const parent = a.at(-1),
        attr = [...a].reverse().find(x => x.type === 'JSXAttribute');
      if (parent?.type === 'ObjectProperty' && parent.key === n) return;
      if (a.some(x => x.type === 'BinaryExpression' || x.type === 'ConditionalExpression' && x.test.start <= n.start && x.test.end >= n.end || x.type === 'MemberExpression' && x.property === n)) return;
      if (a.some(x => x.type === 'JSXElement' && ['code', 'pre'].includes(x.openingElement.name?.name))) return;
      const objprop = [...a].reverse().find(x => x.type === 'ObjectProperty' && x.value.start <= n.start && x.value.end >= n.end);
      const call = [...a].reverse().find(x => ['CallExpression', 'NewExpression'].includes(x.type));
      const fn = [...a].reverse().find(x => /Function|Method/.test(x.type));
      const fnName = fn?.id?.name ?? '';
      const jsx = a.some(x => x.type === 'JSXExpressionContainer');
      if (attr && technicalProps.test(prop(attr.name))) return;
      if (attr && visibleProps.test(prop(attr.name))) kind = 'jsx-prop:' + prop(attr.name);else if (objprop && visibleProps.test(prop(objprop.key))) {
        kind = 'object-copy:' + prop(objprop.key);
        confidence = 'medium';
      } else if (call && /setBreadcrumbs|setError|toast|notify|alert|confirm|Error$/.test(callee(call.callee)) && !/console\./.test(callee(call.callee))) {
        kind = /Breadcrumb/.test(callee(call.callee)) ? 'breadcrumb' : 'notification-or-error';
        confidence = 'medium';
      } else if (jsx && !attr && !a.some(x => /Function|Method/.test(x.type) && x.start > a.find(x => x.type === 'JSXExpressionContainer').start) && !a.some(x => x.type === 'CallExpression' && x.start > a.find(x => x.type === 'JSXExpressionContainer').start) && parent?.type !== 'MemberExpression' && !(objprop && technicalProps.test(prop(objprop.key)))) kind = 'jsx-expression';else if (!jsx && !attr && !a.some(x => x.type === 'JSXElement') && a.some(x => x.type === 'ReturnStatement') && /(?:\.tsx$|utils|format|label|status|display|summary|relative|cron-readable|activity|i18n)/i.test(file) && !a.some(x => x.type === 'CallExpression' && /^(?:cn|clsx|cva)$/.test(callee(x.callee)))) {
        kind = 'helper-return';
        confidence = 'medium';
      } else if (/(?:DisplayName|Label|relativeTime|formatDate|formatDuration)/.test(fnName) && objprop) {
        kind = 'helper-label-map';
        confidence = 'medium';
      } else if (a.some(x => x.type === 'VariableDeclarator' && /LABEL|TITLE|DESCRIPTION|MESSAGE|EMPTY|STATUS|COPY|TEXT|LABELS|WHIMSY/i.test(x.id?.name ?? '')) && /\s/.test(textValue)) {
        kind = 'named-copy-constant';
        confidence = 'medium';
      } else return;
    }
    if (!kind || !human(textValue ?? '')) return;
    if (kind === 'jsx-expression' && n.type === 'StringLiteral' && /^[a-z][a-z0-9_-]*$/.test(textValue)) confidence = 'medium';
    const id = n.start + ':' + kind;
    if (localSeen.has(id)) return;
    localSeen.add(id);
    const line = n.loc.start.line,
      context = src.split('\n').slice(Math.max(0, line - 2), line + 1).join('\n').trim();
    const scope = a.some(x => /Function|Method/.test(x.type)) ? 'function' : 'module';
    candidates.push({
      file,
      line,
      column: n.loc.start.column + 1,
      kind,
      confidence,
      text: textValue,
      scope,
      context
    });
    stat.candidates++;
  });
  for (const r of routes.filter(r => r.source === file)) r.componentImports = r.components.map(c => ({
    name: c,
    import: imports[c] ?? null
  }));
  fileStats.push(stat);
  fileMap.set(file, stat);
}
function resolve(from, imp) {
  if (!imp) return null;
  let stem = imp.startsWith('@/') ? 'ui/src/' + imp.slice(2) : imp.startsWith('.') ? path.posix.normalize(path.posix.join(path.posix.dirname(from), imp)) : null;
  if (!stem) return null;
  for (const x of [stem, stem + '.tsx', stem + '.ts', stem + '/index.tsx', stem + '/index.ts']) if (fileMap.has(x)) return x;
  return null;
}
function reachable(start, seen = new Set()) {
  if (!start || seen.has(start)) return seen;
  seen.add(start);
  for (const imp of fileMap.get(start)?.imports ?? []) reachable(resolve(start, imp), seen);
  return seen;
}
for (const r of routes) {
  r.directFiles = r.componentImports.map(x => resolve(r.source, x.import)).filter(Boolean);
  r.directCandidateCount = r.directFiles.reduce((n, f) => n + (fileMap.get(f)?.candidates ?? 0), 0);
  r.directTranslationCalls = r.directFiles.reduce((n, f) => n + (fileMap.get(f)?.translatedCalls ?? 0), 0);
  r.directStatus = !r.directFiles.length ? 'wrapper/redirect/local-component' : r.directCandidateCount ? 'has-hardcoded-candidates' : r.directTranslationCalls ? 'translation-used-no-direct-candidate' : 'no-direct-evidence';
  const deps = new Set();
  r.directFiles.forEach(f => reachable(f).forEach(x => deps.add(x)));
  r.reachableFileCount = deps.size;
  r.reachableCandidateCount = [...deps].reduce((n, f) => n + (fileMap.get(f)?.candidates ?? 0), 0);
}
function flatten(v, p = '', out = {}) {
  for (const [k, x] of Object.entries(v)) {
    const key = p ? p + '.' + k : k;
    if (typeof x === 'string') out[key] = x;else if (x && typeof x === 'object') flatten(x, key, out);
  }
  return out;
}
const en = flatten(JSON.parse(fs.readFileSync(ROOT + '/ui/src/i18n/locales/en.json', 'utf8'))),
  zh = flatten(JSON.parse(fs.readFileSync(ROOT + '/ui/src/i18n/locales/zh-CN.json', 'utf8')));
const missingZh = Object.keys(en).filter(k => !(k in zh)),
  extraZh = Object.keys(zh).filter(k => !(k in en)),
  sameZh = Object.keys(en).filter(k => zh[k] === en[k] && human(en[k]));
const usedKeys = [...new Set(translated.filter(x => x.key).map(x => x.key))];
const missingUsedEn = usedKeys.filter(k => !(k in en) && !(k + '_one' in en) && !(k + '_other' in en)),
  missingUsedZh = usedKeys.filter(k => !(k in zh) && !(k + '_one' in zh) && !(k + '_other' in zh));
const countBy = (arr, key) => Object.entries(arr.reduce((m, x) => (m[key(x)] = (m[key(x)] ?? 0) + 1, m), {})).sort((a, b) => b[1] - a[1]).map(([name, count]) => ({
  name,
  count
}));
const result = {
  generatedAt: new Date().toISOString(),
  root: ROOT,
  method: 'Babel TypeScript/JSX AST, contextual candidate extraction; not a proof of complete runtime localization',
  scope: {
    allUiSourceFiles: allUI.length,
    selectedPackageFiles: pkgSelected.length,
    scannedFiles: files.length,
    excludedUiFiles: allUI.filter(f => excluded.test(f)).length,
    packageFiles: pkgSelected.filter(f => !excluded.test(f)).map(f => f.slice(ROOT.length + 1)),
    exclusionPattern: excluded.source
  },
  summary: {
    parsedFiles: fileStats.length,
    parseErrors: parseErrors.length,
    candidateCount: candidates.length,
    candidateFiles: fileStats.filter(f => f.candidates).length,
    highConfidenceCount: candidates.filter(c => c.confidence === 'high').length,
    translationCallCount: translated.length,
    translationFiles: fileStats.filter(f => f.translatedCalls).length,
    routeDeclarations: routes.length,
    formatCalls: formats.length,
    frozenCandidates: frozen.length
  },
  categories: countBy(candidates, x => x.kind),
  moduleRanking: countBy(candidates, x => fileMap.get(x.file).module),
  fileRanking: fileStats.filter(f => f.candidates).sort((a, b) => b.candidates - a.candidates).map(({
    file,
    candidates,
    translatedCalls,
    translationHook
  }) => ({
    file,
    candidates,
    translatedCalls,
    translationHook
  })),
  dictionary: {
    enKeys: Object.keys(en).length,
    zhKeys: Object.keys(zh).length,
    missingZh,
    extraZh,
    sameZh: sameZh.map(key => ({
      key,
      value: en[key]
    })),
    missingUsedEn,
    missingUsedZh,
    dynamicCalls: translated.filter(x => x.dynamic)
  },
  parseErrors,
  fileStats,
  routes,
  formats,
  frozen,
  rawEnumDisplays,
  candidates,
  translated
};
fs.mkdirSync(path.dirname(outputPath), {
  recursive: true
});
fs.writeFileSync(outputPath, JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({
  outputPath,
  summary: result.summary,
  scope: {
    ...result.scope,
    packageFiles: result.scope.packageFiles.length
  },
  categories: result.categories,
  modules: result.moduleRanking.slice(0, 20),
  files: result.fileRanking.slice(0, 30),
  dictionary: {
    enKeys: result.dictionary.enKeys,
    zhKeys: result.dictionary.zhKeys,
    missingZh: missingZh.length,
    sameZh: sameZh.length,
    missingUsedEn: missingUsedEn.length,
    missingUsedZh: missingUsedZh.length
  },
  parseErrors
}, null, 2));

// Literal UI copy and missing static t() keys remain review candidates: a key may
// intentionally use defaultValue or a runtime resource. Structural failures are errors.
if (missingUsedEn.length || missingUsedZh.length) {
  console.warn('Review static translation calls missing from the checked dictionaries:', missingUsedEn.length, 'en;', missingUsedZh.length, 'zh-CN.');
}
if (parseErrors.length || missingZh.length || extraZh.length) {
  console.error('Inventory contains parse errors or mismatched English/Chinese dictionary keys. Inspect the JSON diagnostics.');
  process.exitCode = 1;
}
