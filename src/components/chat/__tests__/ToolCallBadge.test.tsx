import { test, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ToolCallBadge, getLabel } from "../ToolCallBadge";

afterEach(() => {
  cleanup();
});

// ── getLabel unit tests ──────────────────────────────────────────────────────

test("getLabel: str_replace_editor create", () => {
  expect(
    getLabel("str_replace_editor", { command: "create", path: "/src/Card.jsx" })
  ).toBe("Creating Card.jsx");
});

test("getLabel: str_replace_editor str_replace", () => {
  expect(
    getLabel("str_replace_editor", {
      command: "str_replace",
      path: "/src/App.jsx",
    })
  ).toBe("Editing App.jsx");
});

test("getLabel: str_replace_editor insert", () => {
  expect(
    getLabel("str_replace_editor", {
      command: "insert",
      path: "/utils/helpers.ts",
    })
  ).toBe("Editing helpers.ts");
});

test("getLabel: str_replace_editor view", () => {
  expect(
    getLabel("str_replace_editor", { command: "view", path: "/src/index.ts" })
  ).toBe("Reading index.ts");
});

test("getLabel: str_replace_editor undo_edit", () => {
  expect(
    getLabel("str_replace_editor", {
      command: "undo_edit",
      path: "/App.jsx",
    })
  ).toBe("Undoing edit in App.jsx");
});

test("getLabel: file_manager rename", () => {
  expect(
    getLabel("file_manager", {
      command: "rename",
      path: "/src/Old.jsx",
      new_path: "/src/New.jsx",
    })
  ).toBe("Renaming Old.jsx → New.jsx");
});

test("getLabel: file_manager delete", () => {
  expect(
    getLabel("file_manager", { command: "delete", path: "/src/Card.jsx" })
  ).toBe("Deleting Card.jsx");
});

test("getLabel: extracts filename from nested path", () => {
  expect(
    getLabel("str_replace_editor", {
      command: "create",
      path: "/src/components/ui/Button.tsx",
    })
  ).toBe("Creating Button.tsx");
});

test("getLabel: falls back to toolName for unknown tool", () => {
  expect(getLabel("unknown_tool", { command: "foo", path: "/foo.js" })).toBe(
    "unknown_tool"
  );
});

test("getLabel: falls back to toolName when path is missing", () => {
  expect(getLabel("str_replace_editor", { command: "create" })).toBe(
    "str_replace_editor"
  );
});

test("getLabel: falls back to toolName when args are empty", () => {
  expect(getLabel("str_replace_editor", {})).toBe("str_replace_editor");
});

// ── ToolCallBadge component tests ────────────────────────────────────────────

test("ToolCallBadge shows spinner when pending", () => {
  const { container } = render(
    <ToolCallBadge
      toolInvocation={{
        toolName: "str_replace_editor",
        args: { command: "create", path: "/App.jsx" },
        state: "call",
      }}
    />
  );
  expect(screen.getByText("Creating App.jsx")).toBeDefined();
  expect(container.querySelector(".animate-spin")).not.toBeNull();
  expect(container.querySelector(".bg-emerald-500")).toBeNull();
});

test("ToolCallBadge shows green dot when done", () => {
  const { container } = render(
    <ToolCallBadge
      toolInvocation={{
        toolName: "str_replace_editor",
        args: { command: "create", path: "/App.jsx" },
        state: "result",
        result: "ok",
      }}
    />
  );
  expect(screen.getByText("Creating App.jsx")).toBeDefined();
  expect(container.querySelector(".bg-emerald-500")).not.toBeNull();
  expect(container.querySelector(".animate-spin")).toBeNull();
});

test("ToolCallBadge shows spinner when state is result but result is null", () => {
  const { container } = render(
    <ToolCallBadge
      toolInvocation={{
        toolName: "str_replace_editor",
        args: { command: "create", path: "/App.jsx" },
        state: "result",
        result: null,
      }}
    />
  );
  expect(container.querySelector(".animate-spin")).not.toBeNull();
});

test("ToolCallBadge: str_replace shows Editing label", () => {
  render(
    <ToolCallBadge
      toolInvocation={{
        toolName: "str_replace_editor",
        args: { command: "str_replace", path: "/src/components/Button.tsx" },
        state: "result",
        result: "ok",
      }}
    />
  );
  expect(screen.getByText("Editing Button.tsx")).toBeDefined();
});

test("ToolCallBadge: file_manager rename shows arrow notation", () => {
  render(
    <ToolCallBadge
      toolInvocation={{
        toolName: "file_manager",
        args: { command: "rename", path: "/Old.jsx", new_path: "/New.jsx" },
        state: "result",
        result: "ok",
      }}
    />
  );
  expect(screen.getByText("Renaming Old.jsx → New.jsx")).toBeDefined();
});

test("ToolCallBadge: file_manager delete shows Deleting label", () => {
  render(
    <ToolCallBadge
      toolInvocation={{
        toolName: "file_manager",
        args: { command: "delete", path: "/src/Card.jsx" },
        state: "result",
        result: "ok",
      }}
    />
  );
  expect(screen.getByText("Deleting Card.jsx")).toBeDefined();
});

test("ToolCallBadge: unknown tool falls back to tool name", () => {
  render(
    <ToolCallBadge
      toolInvocation={{
        toolName: "some_tool",
        args: {},
        state: "result",
        result: "ok",
      }}
    />
  );
  expect(screen.getByText("some_tool")).toBeDefined();
});
