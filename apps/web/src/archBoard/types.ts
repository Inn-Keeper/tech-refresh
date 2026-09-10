export type BoardNode = {
  id: string;
  type: string;
  x: number;
  y: number;
  partitionKey?: string;
  replicas?: number;
};
export type BoardEdge = {
  id: string;
  from: string;
  to: string;
  mode?: "sync" | "async";
  protocol?: string;
};
export type ConnectDrag = { from: string; x: number; y: number; moved: boolean };
export type DragRef = { id: string; dx: number; dy: number; moved: boolean };

export type ScenarioScale = {
  dau: number;
  actionsPerUserPerDay: number;
  writesPerUserPerDay: number;
  payloadKb: number;
  retentionDays: number;
};

export type AugmentedScenario = {
  id: string;
  name: string;
  brief: string;
  budget: number;
  scale?: ScenarioScale;
  pushback?: string;
  checks: object[];
  warnings?: object[];
  category?: string;
  custom?: boolean;
};

export type TalkTrackData = { sections: Record<string, string>; rating: number | null };

/**
 * Everything undo restores and the dirty check compares. Built in exactly one
 * place — `snapshot()` in useArchBoard — so a new editable field only has to be
 * added here and there.
 */
export type BoardSnapshot = {
  scenarioId: string;
  nodes: BoardNode[];
  edges: BoardEdge[];
  talkSections: Record<string, string>;
  talkRating: number | null;
  talkGrade: number | null;
};

export type BoardHistory = {
  past: BoardSnapshot[];
  present: BoardSnapshot;
  future: BoardSnapshot[];
};

export type SavedBoard = {
  id?: string;
  title: string;
  scenarioId: string;
  nodes: BoardNode[];
  edges: BoardEdge[];
  talkTrack?: TalkTrackData;
  talkGrade?: number | null;
  shareToken?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type BoardSummary = Pick<SavedBoard, "id" | "title" | "scenarioId" | "shareToken"> & {
  id: string;
  createdAt: string;
  updatedAt: string;
};
