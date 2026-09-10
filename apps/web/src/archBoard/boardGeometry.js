const PADDING = 30;
const GAP_X = 23;
const GAP_Y = 41;

// Converts a pointer position to board coordinates.
export function pointerToBoard(client, rect, scroll) {
  return { x: client.x - rect.left + scroll.left, y: client.y - rect.top + scroll.top };
}

// Find a placement for a new node that does not overlap with existing nodes.
export function findPlacement(nodes, viewport, nodeSize) {
  const stepX = nodeSize.width + GAP_X;
  const stepY = nodeSize.height + GAP_Y;
  const columns = Math.max(1, Math.floor((viewport.width - PADDING * 2 + GAP_X) / stepX));
  for (let index = 0; ; index += 1) {
    const point = { x: PADDING + (index % columns) * stepX, y: PADDING + Math.floor(index / columns) * stepY };
    if (!nodes.some((node) => Math.abs(node.x - point.x) < nodeSize.width && Math.abs(node.y - point.y) < nodeSize.height)) return point;
  }
}

// Calculate the bounds of the content area based on the nodes and viewport size.
export function contentBounds(nodes, viewport, nodeSize) {
  return {
    width: Math.max(viewport.width, ...nodes.map((node) => node.x + nodeSize.width + PADDING)),
    height: Math.max(viewport.height, ...nodes.map((node) => node.y + nodeSize.height + PADDING)),
  };
}

