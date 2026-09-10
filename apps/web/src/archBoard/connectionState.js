export function activateConnection(sourceId, targetId) {
  if (!sourceId) return { sourceId: targetId, edge: null };
  if (sourceId === targetId) return { sourceId: null, edge: null };
  return { sourceId: null, edge: { from: sourceId, to: targetId } };
}
