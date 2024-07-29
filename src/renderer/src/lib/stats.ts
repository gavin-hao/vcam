import Stats from 'stats.js';
/**
var stats = new Stats();
stats.showPanel(1); // 0: fps, 1: ms, 2: mb, 3+: custom
document.body.appendChild(stats.dom);
 */
export function setupStats(label: string) {
  const stats = new Stats();
  stats.customFpsPanel = stats.addPanel(new Stats.Panel(label, '#0ff', '#002'));
  stats.showPanel(stats.domElement.children.length - 1);
  document.body.appendChild(stats.dom);

  return stats;
}
