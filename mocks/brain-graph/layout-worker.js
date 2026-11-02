import { layout } from './layout.js';

self.onmessage = (event) => {
  const positions = layout(event.data.nodes, event.data.links);
  self.postMessage(positions, [positions.buffer]);
};
