import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  MARKER_FILE,
  SIDEBAR_CHOICES,
  colorize,
  formatChoice,
  getPostinstallSkipReason,
  getSetupExitCode,
  cleanupSetupFiles,
  promptChoice,
  runSetup,
  shouldCleanupSetup,
} from "./setup-ui.mjs";

const stripAnsi = (value) => value.replace(/\u001b\[[0-9;]*m/g, "");

test("No Sidebar is the first sidebar choice", () => {
  assert.equal(SIDEBAR_CHOICES[0].id, "none");
  assert.equal(SIDEBAR_CHOICES[0].label, "No Sidebar");
});

test("postinstall skips in non-interactive environments", () => {
  const reason = getPostinstallSkipReason({
    isPostinstall: true,
    env: { CI: "1" },
    stdin: { isTTY: true },
    stdout: { isTTY: true },
  });

  assert.equal(reason, "non-interactive environment");
});

test("postinstall can use a fallback tty when pnpm captures lifecycle stdio", () => {
  const reason = getPostinstallSkipReason({
    isPostinstall: true,
    env: {},
    stdin: { isTTY: false },
    stdout: { isTTY: false },
    hasFallbackTty: true,
  });

  assert.equal(reason, null);
});

test("selected choices are colored when colors are supported", () => {
  const output = {
    isTTY: true,
    getColorDepth: () => 8,
  };

  const rendered = formatChoice(SIDEBAR_CHOICES[0], true, {
    env: {},
    output,
  });

  assert.match(rendered, /\u001b\[/);
  assert.match(stripAnsi(rendered), /> No Sidebar/);
});

test("colors are disabled when NO_COLOR is set", () => {
  const output = {
    isTTY: true,
    getColorDepth: () => 8,
  };

  assert.equal(
    colorize("green", "No Sidebar", { env: { NO_COLOR: "1" }, output }),
    "No Sidebar",
  );
});

test("successful setup statuses exit with code 0", () => {
  assert.equal(getSetupExitCode({ status: "skipped" }), 0);
  assert.equal(getSetupExitCode({ status: "installed" }), 0);
  assert.equal(getSetupExitCode({ status: "already-completed" }), 0);
});

test("failed and cancelled setup statuses exit non-zero", () => {
  assert.equal(getSetupExitCode({ status: "failed" }), 1);
  assert.equal(getSetupExitCode({ status: "cancelled" }), 130);
});

test("completed manual setup should clean up setup files", () => {
  assert.equal(
    shouldCleanupSetup({
      isPostinstall: false,
      result: { status: "installed", choice: "sidebar-01" },
    }),
    true,
  );

  assert.equal(
    shouldCleanupSetup({
      isPostinstall: false,
      result: { status: "skipped", choice: "none" },
    }),
    true,
  );
});

test("skipped non-interactive postinstall should keep setup fallback", () => {
  assert.equal(
    shouldCleanupSetup({
      isPostinstall: true,
      result: { status: "skipped", reason: "non-interactive terminal" },
    }),
    false,
  );
});

test("selecting a prompt choice always pauses stdin", async () => {
  const listeners = new Map();
  const input = {
    isRaw: false,
    isTTY: true,
    isPaused: () => false,
    pauseCount: 0,
    resume() {},
    pause() {
      this.pauseCount += 1;
    },
    setRawMode(value) {
      this.isRaw = value;
    },
    on(event, listener) {
      listeners.set(event, listener);
    },
    off(event) {
      listeners.delete(event);
    },
    listenerCount(event) {
      return listeners.has(event) ? 1 : 0;
    },
  };
  const output = {
    isTTY: true,
    getColorDepth: () => 1,
    write() {},
  };

  const choicePromise = promptChoice({
    input,
    output,
    choices: SIDEBAR_CHOICES,
  });

  listeners.get("keypress")("", { name: "return" });
  const choice = await choicePromise;

  assert.equal(choice.id, "none");
  assert.equal(input.pauseCount, 1);
  assert.equal(input.isRaw, false);
});

test("selecting No Sidebar writes a marker and does not run shadcn", async () => {
  const cwd = await mkdtemp(path.join(tmpdir(), "supanextcn-setup-"));
  const commands = [];

  try {
    const result = await runSetup({
      cwd,
      env: {},
      stdin: { isTTY: true },
      stdout: { isTTY: true, write() {} },
      stderr: { write() {} },
      isPostinstall: false,
      promptChoice: async () => SIDEBAR_CHOICES[0],
      runCommand: async (...command) => {
        commands.push(command);
        return { status: 0 };
      },
    });

    assert.equal(result.status, "skipped");
    assert.equal(result.choice, "none");
    assert.deepEqual(commands, []);

    const marker = JSON.parse(
      await readFile(path.join(cwd, MARKER_FILE), "utf8"),
    );
    assert.equal(marker.sidebar, "none");
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
});

test("selecting a sidebar runs shadcn add for that block", async () => {
  const cwd = await mkdtemp(path.join(tmpdir(), "supanextcn-setup-"));
  const commands = [];

  try {
    const result = await runSetup({
      cwd,
      env: {},
      stdin: { isTTY: true },
      stdout: { isTTY: true, write() {} },
      stderr: { write() {} },
      isPostinstall: false,
      promptChoice: async () =>
        SIDEBAR_CHOICES.find((choice) => choice.id === "sidebar-01"),
      runCommand: async (...command) => {
        commands.push(command);
        return { status: 0 };
      },
    });

    assert.equal(result.status, "installed");
    assert.equal(result.choice, "sidebar-01");
    assert.deepEqual(commands, [
      [
        "pnpm",
        ["dlx", "shadcn@latest", "add", "sidebar-01", "--yes"],
        { cwd },
      ],
    ]);
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
});

test("postinstall cleanup removes setup scripts and package hooks", async () => {
  const cwd = await mkdtemp(path.join(tmpdir(), "supanextcn-setup-"));
  const scriptsDir = path.join(cwd, "scripts");

  try {
    await mkdir(scriptsDir);
    await writeFile(
      path.join(cwd, "package.json"),
      `${JSON.stringify(
        {
          private: true,
          scripts: {
            postinstall: "node scripts/setup-ui.mjs --postinstall",
            "setup:ui": "node scripts/setup-ui.mjs",
            dev: "next dev",
            test: "node --test",
          },
        },
        null,
        2,
      )}\n`,
      "utf8",
    );
    await writeFile(path.join(scriptsDir, "setup-ui.mjs"), "", "utf8");
    await writeFile(path.join(scriptsDir, "setup-ui.test.mjs"), "", "utf8");

    await cleanupSetupFiles({ cwd, removeTestScript: true });

    const packageJson = JSON.parse(
      await readFile(path.join(cwd, "package.json"), "utf8"),
    );

    assert.deepEqual(packageJson.scripts, { dev: "next dev" });
    await assert.rejects(readFile(path.join(scriptsDir, "setup-ui.mjs")));
    await assert.rejects(readFile(path.join(scriptsDir, "setup-ui.test.mjs")));
    await assert.rejects(readFile(scriptsDir));
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
});

test("existing setup marker is ignored when force is true", async () => {
  const cwd = await mkdtemp(path.join(tmpdir(), "supanextcn-setup-"));

  try {
    await runSetup({
      cwd,
      env: {},
      stdin: { isTTY: true },
      stdout: { isTTY: true, write() {} },
      stderr: { write() {} },
      isPostinstall: false,
      promptChoice: async () => SIDEBAR_CHOICES[0],
    });

    const result = await runSetup({
      cwd,
      env: {},
      stdin: { isTTY: true },
      stdout: { isTTY: true, write() {} },
      stderr: { write() {} },
      isPostinstall: false,
      force: true,
      promptChoice: async () =>
        SIDEBAR_CHOICES.find((choice) => choice.id === "sidebar-02"),
      runCommand: async () => ({ status: 0 }),
    });

    assert.equal(result.status, "installed");
    assert.equal(result.choice, "sidebar-02");
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
});
