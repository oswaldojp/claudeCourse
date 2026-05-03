// @vitest-environment node

import { test, expect, vi, beforeEach } from "vitest";
import { jwtVerify, SignJWT } from "jose";

vi.mock("server-only", () => ({}));

const mockCookieSet = vi.hoisted(() => vi.fn());
const mockCookieGet = vi.hoisted(() => vi.fn());
vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({
    set: mockCookieSet,
    get: mockCookieGet,
    delete: vi.fn(),
  }),
}));

import { createSession, getSession } from "../auth";

const TEST_SECRET = new TextEncoder().encode("development-secret-key");
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

beforeEach(() => {
  vi.clearAllMocks();
});

test("createSession sets cookie named auth-token", async () => {
  await createSession("user-1", "user@example.com");
  expect(mockCookieSet.mock.calls[0][0]).toBe("auth-token");
});

test("createSession sets a valid JWT as the cookie value", async () => {
  await createSession("user-1", "user@example.com");
  const token = mockCookieSet.mock.calls[0][1] as string;
  await expect(jwtVerify(token, TEST_SECRET)).resolves.toBeDefined();
});

test("createSession JWT payload contains userId and email", async () => {
  await createSession("user-42", "hello@world.com");
  const token = mockCookieSet.mock.calls[0][1] as string;
  const { payload } = await jwtVerify(token, TEST_SECRET);
  expect(payload.userId).toBe("user-42");
  expect(payload.email).toBe("hello@world.com");
});

test("createSession sets httpOnly: true", async () => {
  await createSession("user-1", "user@example.com");
  const options = mockCookieSet.mock.calls[0][2];
  expect(options.httpOnly).toBe(true);
});

test("createSession sets sameSite: lax", async () => {
  await createSession("user-1", "user@example.com");
  const options = mockCookieSet.mock.calls[0][2];
  expect(options.sameSite).toBe("lax");
});

test("createSession sets path: /", async () => {
  await createSession("user-1", "user@example.com");
  const options = mockCookieSet.mock.calls[0][2];
  expect(options.path).toBe("/");
});

test("createSession sets secure: false outside production", async () => {
  await createSession("user-1", "user@example.com");
  const options = mockCookieSet.mock.calls[0][2];
  expect(options.secure).toBe(false);
});

test("createSession sets secure: true in production", async () => {
  vi.stubEnv("NODE_ENV", "production");
  await createSession("user-1", "user@example.com");
  const options = mockCookieSet.mock.calls[0][2];
  expect(options.secure).toBe(true);
  vi.unstubAllEnvs();
});

test("createSession sets cookie expiry ~7 days from now", async () => {
  const before = Date.now();
  await createSession("user-1", "user@example.com");
  const after = Date.now();

  const options = mockCookieSet.mock.calls[0][2];
  const expires: Date = options.expires;

  expect(expires.getTime()).toBeGreaterThanOrEqual(before + SEVEN_DAYS_MS - 1000);
  expect(expires.getTime()).toBeLessThanOrEqual(after + SEVEN_DAYS_MS + 1000);
});

// ── getSession ───────────────────────────────────────────────────────────────

async function signToken(
  payload: object,
  secret = TEST_SECRET,
  expiresIn = "7d"
) {
  return new SignJWT(payload as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(expiresIn)
    .setIssuedAt()
    .sign(secret);
}

test("getSession returns null when no cookie is present", async () => {
  mockCookieGet.mockReturnValue(undefined);
  expect(await getSession()).toBeNull();
});

test("getSession returns null when cookie value is empty", async () => {
  mockCookieGet.mockReturnValue({ value: "" });
  expect(await getSession()).toBeNull();
});

test("getSession returns null for a malformed token", async () => {
  mockCookieGet.mockReturnValue({ value: "not.a.jwt" });
  expect(await getSession()).toBeNull();
});

test("getSession returns null when token was signed with wrong secret", async () => {
  const wrongSecret = new TextEncoder().encode("wrong-secret");
  const token = await signToken({ userId: "u1", email: "a@b.com" }, wrongSecret);
  mockCookieGet.mockReturnValue({ value: token });
  expect(await getSession()).toBeNull();
});

test("getSession returns null for an expired token", async () => {
  const token = await signToken({ userId: "u1", email: "a@b.com" }, TEST_SECRET, "-1s");
  mockCookieGet.mockReturnValue({ value: token });
  expect(await getSession()).toBeNull();
});

test("getSession returns the session payload for a valid token", async () => {
  const token = await signToken({ userId: "user-99", email: "test@example.com" });
  mockCookieGet.mockReturnValue({ value: token });
  const session = await getSession();
  expect(session?.userId).toBe("user-99");
  expect(session?.email).toBe("test@example.com");
});

test("getSession reads the auth-token cookie by name", async () => {
  mockCookieGet.mockReturnValue(undefined);
  await getSession();
  expect(mockCookieGet).toHaveBeenCalledWith("auth-token");
});
