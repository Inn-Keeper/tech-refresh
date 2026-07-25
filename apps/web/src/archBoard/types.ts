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

export type SavedBoard = {
  id?: string;
  title: string;
  scenarioId: string;
  nodes: BoardNode[];
  edges: BoardEdge[];
  talkTrack?: TalkTrackData;
  shareToken?: string | null;
};
