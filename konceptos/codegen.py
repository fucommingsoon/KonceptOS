"""KonceptOS v2.1 — CodeGen: K → framework code → impl prompts → assembly.

This module is the BRIDGE between K structure and runnable code.
It generates:
  1. framework.js  — Channels types + ChannelStore runtime + ModuleImpl interface
  2. Per-module impl prompts with framework context injected
  3. Assembled HTML from framework + impls in topological order
"""
import re
from .util import safe_name, safe_contract_name

# ═══ Framework Generation ═══

def generate_framework_js(engine):
    """Generate framework.js from K. This is the SINGLE SOURCE OF TRUTH
    for channel types, contracts, and module interface.
    
    Every impl MUST reference this. Assemble includes it verbatim.
    """
    lines=[
        '// ═══ KonceptOS Framework (generated from K node: %s) ═══'%(engine.current_node or '?'),
        '// DO NOT EDIT — regenerated from K on every assemble',
        '',
        '// ── Channel Store Runtime ──',
        'const _channels = {};',
        'const state = {',
        '  read(ch) {',
        '    if (!(ch in _channels)) throw new Error("Channel not initialized: " + ch);',
        '    return _channels[ch];',
        '  },',
        '  write(ch, val) { _channels[ch] = val; },',
        '  has(ch) { return ch in _channels; }',
        '};',
        '',
    ]
    
    # ── Channel names as constants ──
    lines.append('// ── Channel Names ──')
    for aid in sorted(engine.attributes):
        an = engine.attributes[aid]['name']
        const_name = 'CH_' + safe_name(an).upper()
        lines.append("const %s = '%s';" % (const_name, an))
    lines.append('')
    
    # ── Channel schemas as JSDoc ──
    lines.append('// ── Channel Schemas ──')
    lines.append('// Each channel\'s expected data shape:')
    for aid in sorted(engine.attributes):
        an = engine.attributes[aid]['name']
        sch = engine.schemas.get(aid, 'any')
        lines.append('//   %s: %s' % (an, sch))
    lines.append('')
    
    # ── Contracts ──
    lines.append('// ── Module Contracts (from I matrix) ──')
    lines.append('// Each module can ONLY access the channels listed in its contract.')
    lines.append('const CONTRACTS = {')
    for oid in sorted(engine.objects):
        on = engine.objects[oid]['name']
        c = engine.contract_for(oid)
        lines.append("  '%s': { reads: %s, writes: %s }," % (
            on, _js_array(c['reads']), _js_array(c['writes'])))
    lines.append('};')
    lines.append('')
    
    # ── Tile encoding constants (from conventions) ──
    lines.append('// ── Tile Encoding (shared across all modules) ──')
    lines.append('const TILES = { EMPTY:0, WALL:1, LAVA:2, WATER:3, POISON:4,')
    lines.append('  RED_GEM:5, BLUE_GEM:6, FIRE_EXIT:7, WATER_EXIT:8, SWITCH:9 };')
    lines.append('')
    
    # ── Physics constants ──
    conv = engine.get_all_conventions()
    if conv:
        lines.append('// ── Conventions ──')
        for line in conv.strip().split('\n'):
            lines.append('// %s' % line)
        lines.append('')
    
    # ── ModuleImpl interface ──
    lines.append('// ── Module Interface ──')
    lines.append('// Every module MUST be: { name, init(state), update(state, dt), render(state, ctx) }')
    lines.append('// init: called once at level start. Write initial channel values.')
    lines.append('// update: called every frame. Read channels, compute, write channels.')
    lines.append('// render: called every frame after update. Read channels, draw to ctx.')
    lines.append('')
    
    # ── Channel initialization ──
    lines.append('// ── Channel Initialization ──')
    lines.append('function initChannels() {')
    for aid in sorted(engine.attributes):
        an = engine.attributes[aid]['name']
        sch = engine.schemas.get(aid, 'null')
        # Generate sensible defaults based on schema
        default = _default_for_schema(sch)
        lines.append("  _channels['%s'] = %s;" % (an, default))
    lines.append('}')
    lines.append('')
    
    return '\n'.join(lines)


def generate_impl_context(engine, oid):
    """Generate the framework excerpt that gets injected into an impl prompt.
    This ensures the LLM knows EXACTLY what interface to implement.
    """
    on = engine.objects[oid]['name']
    od = engine.objects[oid].get('desc', '')
    c = engine.contract_for(oid)
    
    lines = []
    lines.append('// ═══ FRAMEWORK CONTEXT (use these exactly) ═══')
    lines.append('')
    lines.append('// Channel store API:')
    lines.append('//   state.read(channelName)  → returns current value')
    lines.append('//   state.write(channelName, value)  → updates channel')
    lines.append('')
    
    # Show only relevant channel schemas
    lines.append('// Channels you can READ:')
    all_channels = c['reads'] + c['writes'] + c.get('readwrites', [])
    for ch in c['reads']:
        aid = _find_aid(engine, ch)
        sch = engine.schemas.get(aid, 'any') if aid else 'any'
        lines.append("//   '%s': %s" % (ch, sch))
    lines.append('// Channels you can READ + WRITE:')
    for ch in c['writes']:
        aid = _find_aid(engine, ch)
        sch = engine.schemas.get(aid, 'any') if aid else 'any'
        lines.append("//   '%s': %s" % (ch, sch))
    lines.append('')
    
    # Contract
    lines.append('// YOUR CONTRACT (do NOT access other channels):')
    lines.append("// reads: %s" % c['reads'])
    lines.append("// writes: %s" % c['writes'])
    lines.append('')
    
    # Required module shape
    lines.append('// YOUR MODULE MUST be this shape:')
    lines.append('const %s = {' % safe_name(on))
    lines.append("  name: '%s'," % on)
    lines.append('  init(state) { /* called once, initialize your write channels */ },')
    lines.append('  update(state, dt) { /* called every frame */ },')
    lines.append('  render(state, ctx) { /* draw to canvas context */ }')
    lines.append('};')
    
    return '\n'.join(lines)


def generate_contract_code(engine, oid):
    """Generate the contract declaration for one module."""
    on = engine.objects[oid]['name']
    c = engine.contract_for(oid)
    lines = [
        "// Contract for '%s'" % on,
        "// reads: %s" % _js_array(c['reads']),
        "// writes: %s" % _js_array(c['writes']),
    ]
    if c.get('readwrites'):
        lines.append("// readwrites (pending): %s" % _js_array(c['readwrites']))
    return '\n'.join(lines)


def assemble_html(engine, impl_selection=None):
    """Assemble K + framework + impls → runnable single-file HTML.
    
    impl_selection: {module_name: impl_index} or None (use latest)
    Returns: (html_string, issues_list)
    """
    order, has_cycle = engine.topo_sort()
    issues = []
    
    # Generate framework
    framework = generate_framework_js(engine)
    
    # Collect impls
    impl_code_blocks = []
    missing = []
    for oid in order:
        on = engine.objects[oid]['name']
        mod_impls = engine.impls.get(on, [])
        if not mod_impls:
            missing.append(on)
            impl_code_blocks.append(
                '\n// ═══ %s — NO IMPL ═══\n'
                'const mod_%s = { name:"%s", init(){}, update(){}, render(){} };'
                % (on, safe_name(on), on))
            continue
        idx = (impl_selection or {}).get(on, -1)
        impl = mod_impls[idx] if 0 <= idx < len(mod_impls) else mod_impls[-1]
        code = impl.get('code', '')
        # Strip TypeScript / module syntax
        code = _strip_ts_syntax(code)
        impl_code_blocks.append(
            '\n// ═══ %s (impl #%d: %s) ═══\n%s'
            % (on, mod_impls.index(impl), impl.get('comment', ''), code))
    
    if missing:
        issues.append('Missing impls: %s' % ', '.join(missing))
    if has_cycle:
        issues.append('Dependency cycle detected. All modules included but order may be suboptimal.')
    
    # Game loop
    loop_lines = _build_game_loop_js(engine, order)

    # Bootstrap
    boot = [
        '\n// ═══ Bootstrap ═══',
        'const canvas = document.getElementById("c");',
        'const ctx = canvas.getContext("2d");',
        'gameInit();',
        'let lastTime = performance.now();',
        'function mainLoop(now) {',
        '  const dt = (now - lastTime) / 16.67; // normalize to ~60fps',
        '  lastTime = now;',
        '  gameUpdate(dt);',
        '  ctx.clearRect(0, 0, canvas.width, canvas.height);',
        '  gameRender(ctx);',
        '  requestAnimationFrame(mainLoop);',
        '}',
        'requestAnimationFrame(mainLoop);',
    ]
    
    # Assemble HTML
    html = '<!DOCTYPE html>\n<html><head><meta charset="utf-8">'
    html += '<title>KonceptOS Assembly — %s</title>' % (engine.current_node or '?')
    html += '<style>body{margin:0;background:#111;display:flex;justify-content:center;align-items:center;height:100vh}'
    html += 'canvas{border:1px solid #333}</style>'
    html += '</head><body>\n'
    html += '<canvas id="c" width="800" height="600"></canvas>\n'
    html += '<script>\n'
    html += '// Assembled by KonceptOS v2.1\n'
    html += '// Node: %s | Modules: %d | Channels: %d\n\n' % (
        engine.current_node or '?', len(engine.objects), len(engine.attributes))
    html += framework + '\n'
    html += '\n'.join(impl_code_blocks) + '\n'
    html += '\n'.join(loop_lines) + '\n'
    html += '\n'.join(boot) + '\n'
    html += '</script></body></html>'
    
    return html, issues


# ═══ Helpers ═══

def _js_array(lst):
    return '[%s]' % ', '.join("'%s'" % x for x in lst)

def _find_aid(engine, channel_name):
    for aid in engine.attributes:
        if engine.attributes[aid]['name'] == channel_name:
            return aid
    return None

def _default_for_schema(schema):
    """Generate a JS default value from a TypeScript schema string."""
    s = schema.strip()
    if s in ('any', 'null', '-', ''): return 'null'
    if s == 'number': return '0'
    if s == 'boolean': return 'false'
    if s == 'string': return "''"
    if s.startswith('{'): return '{}'
    if s.startswith('['): return '[]'
    if 'Record<' in s: return '{}'
    if 'Set<' in s: return 'new Set()'
    if s.startswith("'"): return s.split("'")[1] if "'" in s else "''"
    return '{}'

def _strip_ts_syntax(code):
    """Remove TypeScript-specific syntax from impl code for browser compatibility."""
    lines = code.split('\n')
    out = []
    for line in lines:
        stripped = line.strip()
        # Remove import statements
        if stripped.startswith('import ') and ' from ' in stripped: continue
        # Remove export default
        if stripped.startswith('export default '): 
            out.append(line.replace('export default ', '// exported: '))
            continue
        if stripped == 'export default': continue
        # Remove TypeScript type annotations (basic)
        line = re.sub(r':\s*(string|number|boolean|void|any|never)\b', '', line)
        line = re.sub(r':\s*\{[^}]*\}\s*(?=[,\)\{])', '', line)
        line = re.sub(r'<[A-Z]\w*(?:Contract|Type|State)>', '', line)
        line = re.sub(r' as \w+', '', line)
        line = re.sub(r'interface \w+ \{', '// interface {', line)
        # Remove module.exports
        if stripped.startswith('module.exports'): continue
        if stripped.startswith('return MODULE_IMPL'): continue
        out.append(line)
    return '\n'.join(out)


# ═══ Multi-File Assembly ═══

def generate_index_html(engine, module_names):
    """Generate index.html that references framework.js, style.css, and module files."""
    node_info = engine.current_node or '?'
    lines = [
        '<!DOCTYPE html>',
        '<html lang="en">',
        '<head>',
        '  <meta charset="utf-8">',
        '  <title>KonceptOS — %s</title>' % node_info,
        '  <link rel="stylesheet" href="style.css">',
        '</head>',
        '<body>',
        '  <canvas id="c" width="800" height="600"></canvas>',
        '  <script src="framework.js"></script>',
    ]
    for mn in module_names:
        lines.append('  <script src="modules/%s.js"></script>' % safe_name(mn))
    boot = [
        '  <script>',
        '    const canvas = document.getElementById("c");',
        '    const ctx = canvas.getContext("2d");',
        '    gameInit();',
        '    let lastTime = performance.now();',
        '    function mainLoop(now) {',
        '      const dt = (now - lastTime) / 16.67;',
        '      lastTime = now;',
        '      gameUpdate(dt);',
        '      ctx.clearRect(0, 0, canvas.width, canvas.height);',
        '      gameRender(ctx);',
        '      requestAnimationFrame(mainLoop);',
        '    }',
        '    requestAnimationFrame(mainLoop);',
        '  </script>',
        '</body>',
        '</html>',
    ]
    lines.extend(boot)
    return '\n'.join(lines)


def generate_style_css(engine):
    """Generate style.css with basic layout."""
    return """/* KonceptOS Framework Styles */
* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  background: #111;
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  overflow: hidden;
}

canvas {
  border: 1px solid #333;
  background: #000;
}

/* Channel debug panel (optional) */
#debug {
  position: fixed;
  top: 8px;
  left: 8px;
  color: #0f0;
  font-family: monospace;
  font-size: 11px;
  pointer-events: none;
  line-height: 1.4;
}
"""


def generate_module_js(engine, oid, impl):
    """Generate a .js file for one module from its impl.

    impl: dict with keys {code, comment, ts}
    Returns: string of JS code
    """
    on = engine.objects[oid]['name']
    sn = safe_name(on)
    code = impl.get('code', '')
    code = _strip_ts_syntax(code)
    header = (
        '// ═══ %s (impl #%d) ═══\n'
        '// %s\n\n'
    ) % (on, engine.impls.get(on, []).index(impl), impl.get('comment', ''))
    return header + code


def assemble_dir(engine, output_dir='./output', impl_selection=None):
    """Assemble K → multi-file project directory.

    Creates:
      output_dir/
        index.html
        framework.js
        style.css
        modules/
          ModuleA.js
          ModuleB.js

    Returns: (output_dir, issues_list)
    """
    import os

    order, has_cycle = engine.topo_sort()
    issues = []
    missing = []

    # Prepare modules directory
    modules_dir = os.path.join(output_dir, 'modules')
    os.makedirs(modules_dir, exist_ok=True)

    # Write framework.js
    framework = generate_framework_js(engine)
    game_loop = _build_game_loop_js(engine, order)
    with open(os.path.join(output_dir, 'framework.js'), 'w', encoding='utf-8') as f:
        f.write('// Assembled by KonceptOS v2.1 | Node: %s\n\n' % (engine.current_node or '?'))
        f.write(framework)
        f.write('\n\n')
        f.write(game_loop)

    # Write style.css
    with open(os.path.join(output_dir, 'style.css'), 'w', encoding='utf-8') as f:
        f.write(generate_style_css(engine))

    # Write module JS files
    module_names = []
    for oid in order:
        on = engine.objects[oid]['name']
        sn = safe_name(on)
        module_names.append(sn)
        mod_impls = engine.impls.get(on, [])
        if not mod_impls:
            missing.append(on)
            stub = (
                '// ═══ %s — NO IMPL ═══\n'
                'const mod_%s = { name:"%s", init(){}, update(){}, render(){} };\n'
            ) % (on, sn, on)
            with open(os.path.join(modules_dir, '%s.js' % sn), 'w', encoding='utf-8') as f:
                f.write(stub)
            continue
        idx = (impl_selection or {}).get(on, -1)
        impl = mod_impls[idx] if 0 <= idx < len(mod_impls) else mod_impls[-1]
        code = generate_module_js(engine, oid, impl)
        with open(os.path.join(modules_dir, '%s.js' % sn), 'w', encoding='utf-8') as f:
            f.write(code)

    # Write index.html
    html = generate_index_html(engine, module_names)
    with open(os.path.join(output_dir, 'index.html'), 'w', encoding='utf-8') as f:
        f.write(html)

    if missing:
        issues.append('Missing impls: %s' % ', '.join(missing))
    if has_cycle:
        issues.append('Dependency cycle detected. All modules included but order may be suboptimal.')

    return output_dir, issues


def _build_game_loop_js(engine, order):
    """Build the game loop JS string (shared between assemble_html and assemble_dir)."""
    loop_lines = ['// ═══ Game Loop (topological order) ═══']
    loop_lines.append('const ALL_MODULES = [')
    for oid in order:
        on = engine.objects[oid]['name']
        sn = safe_name(on)
        loop_lines.append(
            "  typeof mod_%s !== 'undefined' ? mod_%s : {name:'%s',init(){},update(){},render(){}},"
            % (sn, sn, on)
        )
    loop_lines.append('];')
    loop_lines.extend([
        '',
        'function gameInit() {',
        '  initChannels();',
        '  ALL_MODULES.forEach(m => { if(m.init) m.init(state); });',
        '}',
        '',
        'function gameUpdate(dt) {',
        '  ALL_MODULES.forEach(m => { if(m.update) m.update(state, dt); });',
        '}',
        '',
        'function gameRender(ctx) {',
        '  ALL_MODULES.forEach(m => { if(m.render) m.render(state, ctx); });',
        '}',
    ])
    return '\n'.join(loop_lines)


# ═══ Artifact Code Generators (template-based, no LLM needed) ═══

def generate_channel_schema_code(engine, channel_name):
    """Generate TypeScript interface for a channel based on its schema and usage context."""
    aid = None
    for a in engine.attributes:
        if engine.attributes[a]['name'] == channel_name:
            aid = a
            break
    if not aid:
        return f'// Channel "{channel_name}" not found'

    schema = engine.schemas.get(aid, 'any')

    # Infer TypeScript type from schema or usage
    if schema and schema != 'any':
        type_str = _schema_to_ts(schema)
    else:
        # Try to infer from which modules read/write this channel
        readers = engine.readers_of(aid)
        writers = engine.writers_of(aid)
        if readers or writers:
            type_str = _infer_channel_type(channel_name, readers, writers, engine)
        else:
            type_str = 'any'

    lines = [
        f'// Channel schema: {channel_name}',
        f'// Generated from K artifact (sig: {engine.compute_artifact_sig("channel_schema_" + channel_name)})',
        f'interface {safe_name(channel_name)} {{',
    ]

    # Add known fields based on channel semantics
    if channel_name == 'entity_positions':
        lines.extend([
            '  fireboy: Entity;',
            '  watergirl: Entity;',
            '}'
        ])
    elif channel_name == 'velocity_vectors':
        lines.extend([
            '  fireboy: Vec2;',
            '  watergirl: Vec2;',
            '}'
        ])
    elif channel_name == 'input_keys':
        lines.extend([
            '  fireboy: InputState;',
            '  watergirl: InputState;',
            '}'
        ])
    elif channel_name == 'tile_layout':
        lines.extend([
            '  tiles: number[][];',
            '  width: number;',
            '  height: number;',
            '  tileSize: number;',
            '}'
        ])
    elif channel_name == 'hazard_zones':
        lines.extend([
            '  lava: Hazard[];',
            '  water: Hazard[];',
            '  goo: Hazard[];',
            '}'
        ])
    elif channel_name == 'gem_collection':
        lines.extend([
            '  collected: string[];',
            '  total: number;',
            '  gems: Gem[];',
            '}'
        ])
    elif channel_name == 'game_state':
        lines.extend([
            '  status: "loading" | "playing" | "paused" | "lost" | "won" | "level_complete";',
            '  currentLevel: number;',
            '  totalLevels: number;',
            '  message: string;',
            '  deaths: number;',
            '  paused: boolean;',
            '}'
        ])
    elif channel_name == 'level_config':
        lines.extend([
            '  level: number;',
            '  width: number;',
            '  height: number;',
            '  gemCount: number;',
            '  restartCount: number;',
            '}'
        ])
    elif channel_name == 'mechanism_state':
        lines.extend([
            '  levers: Lever[];',
            '  doors: Door[];',
            '  buttons: Button[];',
            '  platforms: Platform[];',
            '}'
        ])
    elif channel_name == 'player_state':
        lines.extend([
            '  level: number;',
            '  score: number;',
            '  lives: number;',
            '  levelStartTime: number;',
            '}'
        ])
    else:
        lines.extend([
            '  // TODO: define fields based on schema: ' + schema,
            '  [key: string]: any;',
            '}'
        ])

    return '\n'.join(lines)


def generate_tiles_constants_code(engine):
    """Generate TILES constants from conventions or default."""
    conventions = engine.get_all_conventions() or ''

    # Try to parse TILES from conventions
    import re
    tiles_match = re.search(r'TILES\s*=\s*\{([^}]+)\}', conventions)
    if tiles_match:
        content = tiles_match.group(1)
        lines = ['// TILES constants (from conventions)']
        for line in content.split(','):
            line = line.strip()
            if ':' in line:
                name_val = line.split(':')
                if len(name_val) == 2:
                    name = name_val[0].strip()
                    val = name_val[1].strip().rstrip(',')
                    lines.append(f'const {name} = {val};')
        return '\n'.join(lines)

    # Default TILES
    return '''// TILES constants (default)
const TILES = {
  EMPTY: 0, WALL: 1, LAVA: 2, WATER: 3, POISON: 4,
  RED_GEM: 5, BLUE_GEM: 6, FIRE_EXIT: 7, WATER_EXIT: 8, SWITCH: 9
};'''


def generate_module_skeleton_code(engine, module_name):
    """Generate a module skeleton with type hints based on contract."""
    oid = None
    for o in engine.objects:
        if engine.objects[o]['name'] == module_name:
            oid = o
            break
    if not oid:
        return f'// Module "{module_name}" not found'

    contract = engine.contract_for(oid)
    sn = safe_name(module_name)

    lines = [
        f'// Module skeleton: {module_name}',
        f'// Contract: reads={contract["reads"]}, writes={contract["writes"]}',
        f'// Generated from K artifact (sig: {engine.compute_artifact_sig("module_skeleton_" + module_name)})',
        '',
        f'const {sn} = {{',
        f"  name: '{module_name}',",
        '',
        '  init(state) {',
    ]

    # Initialize write channels
    for ch in contract['writes']:
        default = _channel_default(ch)
        lines.append(f"    state.write('{ch}', {default});")
    for ch in contract.get('readwrites', []):
        default = _channel_default(ch)
        lines.append(f"    state.write('{ch}', {default});")

    lines.extend([
        '  },',
        '',
        '  update(state, dt) {',
        '    // dt: normalized time step (~1.0 at 60fps)',
    ])

    # Read channels with type hints
    for ch in contract['reads']:
        lines.append(f"    const {_safe_var(ch)} = state.read('{ch}');")
    for ch in contract.get('readwrites', []):
        lines.append(f"    const {_safe_var(ch)} = state.read('{ch}');")

    lines.extend([
        '  },',
        '',
        '  render(state, ctx) {',
        f"    const canvas = ctx.canvas;",
        '    // Draw using state.read() channels',
        '  }',
        '};'
    ])

    return '\n'.join(lines)


def _schema_to_ts(schema):
    """Convert a schema string to TypeScript type."""
    s = schema.strip()
    if s in ('number', 'Number'): return 'number'
    if s in ('string', 'String'): return 'string'
    if s in ('boolean', 'Boolean'): return 'boolean'
    if s == 'any': return 'any'
    if s.startswith('{'): return 'Record<string, any>'
    if s.startswith('['): return 'any[]'
    if 'Record<' in s: return 'Record<string, any>'
    if 'Vec2' in s: return 'Vec2'
    if 'Entity' in s: return 'Entity'
    return 'any'


def _infer_channel_type(channel_name, readers, writers, engine):
    """Infer TypeScript type for a channel based on its usage."""
    # Default fallback
    return 'any'


def _channel_default(channel_name):
    """Get a sensible JS default value for a channel."""
    defaults = {
        'entity_positions': '{ fireboy: {x:100,y:400,vx:0,vy:0}, watergirl: {x:150,y:400,vx:0,vy:0} }',
        'velocity_vectors': '{ fireboy: {vx:0,vy:0}, watergirl: {vx:0,vy:0} }',
        'input_keys': '{ fireboy:{left:false,right:false,jump:false}, watergirl:{left:false,right:false,jump:false} }',
        'tile_layout': '{ tiles:[], width:800, height:480, tileSize:32 }',
        'hazard_zones': '{ lava:[], water:[], goo:[] }',
        'gem_collection': '{ collected:[], total:0, gems:[] }',
        'game_state': '{ status:"playing", currentLevel:1, totalLevels:5, message:"", deaths:0, paused:false }',
        'level_config': '{ level:1, width:800, height:600, gemCount:10, restartCount:0 }',
        'mechanism_state': '{ levers:[], doors:[], buttons:[], platforms:[] }',
        'player_state': '{ level:1, score:0, lives:3, levelStartTime:Date.now() }',
    }
    return defaults.get(channel_name, 'null')


def _safe_var(channel_name):
    """Convert channel name to safe JS variable name."""
    return channel_name.replace('_', '').lower() + 'Val'
