/**
 * HTML Generator - 生成 HTML 入口文件
 */
export function generateHTML(projectName) {
  const lines = [
    '<!DOCTYPE html>',
    '<html lang="zh-CN">',
    '<head>',
    '  <meta charset="UTF-8">',
    '  <meta name="viewport" content="width=device-width, initial-scale=1.0">',
    `  <title>${projectName}</title>`,
    '  <link rel="stylesheet" href="src/css/style.css">',
    '</head>',
    '<body>',
    '  <div id="game-container">',
    '    <canvas id="game" width="800" height="600"></canvas>',
    '  </div>',
    '',
    '  <div id="debug-panel">',
    '    <h3>Debug</h3>',
    '    <div id="fps">FPS: 0</div>',
    '    <div id="state-info"></div>',
    '  </div>',
    '',
    '  <script type="module" src="src/js/main.js"></script>',
    '</body>',
    '</html>'
  ];

  return lines.join('\n');
}
