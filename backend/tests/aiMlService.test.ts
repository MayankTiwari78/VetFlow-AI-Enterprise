import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Stage 1 symptom-model runner tests (aiMlService).
 *
 * The Python subprocess is mocked at node:child_process level in CALLBACK
 * style (the service wraps execFile with promisify, so the mock must invoke
 * the node-style callback). These tests pin the production-hardened invocation
 * contract: execFile with an argv array (no shell), structured error
 * surfacing (never a bare "Command failed"), timeout + interpreter fallback.
 */

vi.hoisted(() => {
  const defaults: Record<string, string> = {
    NODE_ENV: "test",
    PORT: "4102",
    MONGODB_URI: "mongodb://127.0.0.1:27017/medflow-ml-test",
    JWT_SECRET: "test-jwt-secret-with-enough-length",
    ACCESS_TOKEN_EXPIRES_IN: "15m",
    REFRESH_TOKEN_EXPIRES_IN: "30d",
    CLIENT_URL: "http://localhost:5173",
    ADMIN_URL: "http://localhost:5174",
    ADMIN_EMAIL: "admin@example.com",
    ADMIN_PASSWORD: "Password123",
    RAZORPAY_KEY_ID: "rzp_test",
    RAZORPAY_KEY_SECRET: "rzp_secret",
    STRIPE_SECRET_KEY: "sk_test_secret",
    LOG_LEVEL: "silent",
    // Read by env.ts at import time; keeps the override-first ordering testable.
    STAGE1_PYTHON_PATH: "C:/venvs/stage1/python.exe"
  };
  for (const [key, value] of Object.entries(defaults)) {
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
});

const execFileMock = vi.hoisted(() => vi.fn());

vi.mock("node:child_process", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:child_process")>();
  return { ...actual, execFile: execFileMock };
});

import { AppError } from "../src/utils/AppError.js";
import { pythonCandidateCommands, runPythonPrediction } from "../src/services/aiMlService.js";

const SYMPTOMS = { Fever: 2, Cough: 1, Diarrhea: 0, Lethargy: 1, Loss_of_Appetite: 1 };
const MODEL_OK = {
  assessmentType: "PRELIMINARY_AI_ASSESSMENT",
  predictedCondition: "Kennel_Cough",
  modelProbability: 0.42,
  confidenceLevel: "Moderate",
  topPredictions: [{ condition: "Kennel_Cough", probability: 0.42 }],
  probabilities: { Kennel_Cough: 0.42 },
  modelVersion: "vetflow-ml-v1.1.0-dev",
  veterinarianReviewRequired: true,
  disclaimer: "Preliminary AI assessment and NOT a clinical diagnosis."
};

type ExecCallback = (error: unknown, result?: { stdout: string }) => void;

/** Success: resolve through the node-style callback (promisify-compatible). */
const mockStdout = (stdout: string): void => {
  execFileMock.mockImplementation(
    ((_cmd: string, _args: string[], _opts: unknown, cb: ExecCallback) => {
      cb(null, { stdout });
    }) as unknown as (...args: unknown[]) => unknown
  );
};

/** Failure: hand promisify an error object carrying stdout/code/killed. */
const mockFailure = (overrides: Record<string, unknown> = {}): void => {
  execFileMock.mockImplementation(
    ((_cmd: string, _args: string[], _opts: unknown, cb: ExecCallback) => {
      const error = new Error("Command failed") as Error & Record<string, unknown>;
      Object.assign(error, { code: 1, stdout: "", stderr: "", killed: false, ...overrides });
      cb(error);
    }) as unknown as (...args: unknown[]) => unknown
  );
};

describe("pythonCandidateCommands", () => {
  it("prefers the configured interpreter override", () => {
    expect(pythonCandidateCommands()[0]).toBe("C:/venvs/stage1/python.exe");
  });

  it("lists platform fallbacks that contain no shell wrapper/whitespace", () => {
    const candidates = pythonCandidateCommands();
    expect(candidates.length).toBeGreaterThan(1);
    expect(candidates).not.toContain("cmd.exe");
    expect(candidates.every((c) => !/\s/.test(c))).toBe(true);
  });
});



describe("runPythonPrediction", () => {
  beforeEach(() => {
    execFileMock.mockReset();
  });

  it("invokes the model via execFile with the JSON payload as ONE argv element (no shell)", async () => {
    mockStdout(JSON.stringify({ success: true, data: MODEL_OK }));

    const result = await runPythonPrediction(SYMPTOMS);

    expect(execFileMock).toHaveBeenCalledTimes(1);
    const [, args, options] = execFileMock.mock.calls[0] as unknown as [
      string,
      string[],
      Record<string, unknown>
    ];
    // args = [script, json] — a single argv element, never an escaped shell string.
    expect(Array.isArray(args)).toBe(true);
    expect(args).toHaveLength(2);
    expect(args[1]).toBe(JSON.stringify({ symptoms: SYMPTOMS }));
    expect(options).toMatchObject({ timeout: expect.any(Number), cwd: expect.any(String) });
    expect(result.predictedCondition).toBe("Kennel_Cough");
  });

  it("surfaces the real model error instead of a generic Command failed wrapper", async () => {
    mockFailure({ stdout: JSON.stringify({ success: false, error: "Missing required symptoms: Fever" }) });

    await expect(runPythonPrediction(SYMPTOMS)).rejects.toMatchObject({
      statusCode: 422,
      message: "Missing required symptoms: Fever"
    });
  });

  it("maps malformed model output to a structured 502", async () => {
    mockFailure({ stdout: "Traceback (most recent call last): ..." });

    await expect(runPythonPrediction(SYMPTOMS)).rejects.toMatchObject({ statusCode: 502 });
  });

  it("maps a killed child (timeout) to 504", async () => {
    mockFailure({ killed: true, code: null });

    await expect(runPythonPrediction(SYMPTOMS)).rejects.toMatchObject({ statusCode: 504 });
  });

  it("tries the next interpreter on ENOENT and fails with 503 when all are missing", async () => {
    mockFailure({ code: "ENOENT" });

    await expect(runPythonPrediction(SYMPTOMS)).rejects.toMatchObject({ statusCode: 503 });
    expect(execFileMock.mock.calls.length).toBeGreaterThan(1);
  });

  it("parses stdout even when the process exits non-zero (model JSON error contract)", async () => {
    mockFailure({ code: 1, stdout: JSON.stringify({ success: true, data: MODEL_OK }) });

    const result = await runPythonPrediction(SYMPTOMS);
    expect(result.predictedCondition).toBe("Kennel_Cough");
  });

  it("propagates AppError verbatim (no re-wrapping, no path leakage)", async () => {
    mockFailure({ stdout: JSON.stringify({ success: false, error: "Symptom 'Fever' must be an integer" }) });

    const error = await runPythonPrediction(SYMPTOMS).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(AppError);
    expect((error as AppError).message).not.toMatch(/\.py|C:\\|\/tmp|python/i);
  });
});
