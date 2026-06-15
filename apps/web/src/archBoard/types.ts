export type BoardNode = { id: string; type: string; x: number; y: number };
export type BoardEdge = { id: string; from: string; to: string };
export type ConnectDrag = { from: string; x: number; y: number; moved: boolean };
export type DragRef = { id: string; dx: number; dy: number; moved: boolean };

export type AugmentedScenario = {
  id: string;
  name: string;
  brief: string;
  budget: number;
  checks: object[];
  warnings?: object[];
  category?: string;
  custom?: boolean;
};

export type SavedBoard = {
  id?: string;
  title: string;
  scenarioId: string;
  nodes: BoardNode[];
  edges: BoardEdge[];
};
