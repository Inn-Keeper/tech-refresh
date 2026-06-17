import { createPipelineApi, PipelineApiError } from "../pipeline.js";

function mockFetch(responses) {
  let callIndex = 0;
  return jest.fn(async () => {
    const entry = responses[callIndex++] ?? { status: 200, body: {} };
    const body = JSON.stringify(entry.body);
    return new Response(body, {
      status: entry.status,
      headers: { "Content-Type": "application/json", "Content-Length": String(body.length) },
    });
  });
}

describe("createPipelineApi", () => {
  const BASE = "http://localhost:8080";
  const TOKEN = "eyJhbGciOiJIUzI1NiJ9.test";

  afterEach(() => {
    global.fetch = undefined;
  });

  it("sends the bearer token", async () => {
    const fetch = mockFetch([{ status: 200, body: {} }]);
    global.fetch = fetch;

    const api = createPipelineApi(async () => TOKEN, BASE);
    await api.getVelocity();

    const request = fetch.mock.calls[0][0];
    expect(request.url).toContain("/api/pipeline/velocity");
    expect(request.headers.get("authorization")).toBe(`Bearer ${TOKEN}`);
  });

  it("throws a configuration error when baseUrl is missing", () => {
    expect(() => createPipelineApi(async () => TOKEN, "")).toThrow(PipelineApiError);
    expect(() => createPipelineApi(async () => TOKEN, "")).toThrow("baseUrl is required");
  });

  it("calls getToken each time (token may rotate)", async () => {
    const fetch = mockFetch([{ status: 200, body: {} }, { status: 200, body: {} }]);
    global.fetch = fetch;
    let call = 0;
    const getToken = jest.fn(async () => `token-${++call}`);
    const api = createPipelineApi(getToken, BASE);

    await api.getVelocity();
    await api.getVelocity();

    expect(getToken).toHaveBeenCalledTimes(2);
  });

  it("throws when there is no token", async () => {
    global.fetch = mockFetch([]);
    const api = createPipelineApi(async () => null, BASE);
    await expect(api.getVelocity()).rejects.toThrow("no auth token");
  });

  it("throws with response context on a non-2xx response", async () => {
    global.fetch = mockFetch([{ status: 401, body: {} }]);
    const api = createPipelineApi(async () => TOKEN, BASE);
    await expect(api.getVelocity()).rejects.toMatchObject({
      name: "PipelineApiError",
      status: 401,
      path: "/api/pipeline/velocity",
    });
  });

  it("resolves with the parsed velocity report", async () => {
    const body = {
      stages: [
        { fromStage: "APPLIED", toStage: "INTERVIEWING", avgDays: 5.2, transitions: 3 },
        { fromStage: "INTERVIEWING", toStage: "OFFER", avgDays: 12.0, transitions: 1 },
      ],
    };
    global.fetch = mockFetch([{ status: 200, body }]);
    const api = createPipelineApi(async () => TOKEN, BASE);
    await expect(api.getVelocity()).resolves.toEqual(body);
  });
});
