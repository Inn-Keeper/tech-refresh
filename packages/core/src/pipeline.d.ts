import type { components } from "./pipeline-types.d.ts";

export type VelocityReport = components["schemas"]["VelocityReport"];

export class PipelineApiError extends Error {
  readonly status?: number;
  readonly statusText?: string;
  readonly path?: string;
}

export function createPipelineApi(
  getToken: () => Promise<string | null | undefined>,
  baseUrl: string
): {
  getVelocity(): Promise<VelocityReport>;
};
