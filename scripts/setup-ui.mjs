import { spawn } from "node:child_process";
import { constants as fsConstants, openSync } from "node:fs";
import {
  access,
  readFile,
  readdir,
  rmdir,
  unlink,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import readline from "node:readline";
import { ReadStream, WriteStream } from "node:tty";
import { fileURLToPath } from "node:url";

export const MARKER_FILE = ".supanextcn-setup.json";
const SETUP_SCRIPT = "scripts/setup-ui.mjs";
const SETUP_TEST_SCRIPT = "scripts/setup-ui.test.mjs";

export const SIDEBAR_CHOICES = [
  {
    id: "none",
    label: "No Sidebar",
    description: "Keep the starter homepage without adding a sidebar block.",
  },
  {
    id: "sidebar-01",
    label: "sidebar-01",
    description: "A simple sidebar with navigation grouped by section.",
  },
  {
    id: "sidebar-02",
    label: "sidebar-02",
    description: "A sidebar with collapsible sections.",
  },
  {
    id: "sidebar-03",
    label: "sidebar-03",
    description: "A sidebar with submenus.",
  },
  {
    id: "sidebar-04",
    label: "sidebar-04",
    description: "A floating sidebar with submenus.",
  },
  {
    id: "sidebar-05",
    label: "sidebar-05",
    description: "A sidebar with collapsible submenus.",
  },
  {
    id: "sidebar-06",
    label: "sidebar-06",
    description: "A sidebar with submenus as dropdowns.",
  },
  {
    id: "sidebar-07",
    label: "sidebar-07",
    description: "A sidebar that collapses to icons.",
  },
  {
    id: "sidebar-08",
    label: "sidebar-08",
    description: "An inset sidebar with secondary navigation.",
  },
  {
    id: "sidebar-09",
    label: "sidebar-09",
    description: "Collapsible nested sidebars.",
  },
  {
    id: "sidebar-10",
    label: "sidebar-10",
    description: "A sidebar in a popover.",
  },
  {
    id: "sidebar-11",
    label: "sidebar-11",
    description: "A sidebar with a collapsible file tree.",
  },
  {
    id: "sidebar-12",
    label: "sidebar-12",
    description: "A sidebar with a calendar.",
  },
  {
    id: "sidebar-13",
    label: "sidebar-13",
    description: "A sidebar in a dialog.",
  },
  {
    id: "sidebar-14",
    label: "sidebar-14",
    description: "A sidebar on the right.",
  },
  {
    id: "sidebar-15",
    label: "sidebar-15",
    description: "A left and right sidebar.",
  },
  {
    id: "sidebar-16",
    label: "sidebar-16",
    description: "A sidebar with a sticky site header.",
  },
];

export function getPostinstallSkipReason({
  isPostinstall,
  env,
  stdin,
  stdout,
  hasFallbackTty = false,
}) {
  if (!isPostinstall) {
    return null;
  }

  if (env.CI || env.CONTINUOUS_INTEGRATION) {
    return "non-interactive environment";
  }

  if ((!stdin.isTTY || !stdout.isTTY) && !hasFallbackTty) {
    return "non-interactive terminal";
  }

  return null;
}

function openFallbackTty() {
  if (process.platform === "win32") {
    return null;
  }

  try {
    const input = new ReadStream(openSync("/dev/tty", "r"));
    const output = new WriteStream(openSync("/dev/tty", "w"));

    return {
      input,
      output,
      isFallback: true,
      close() {
        input.destroy();
        output.destroy();
      },
    };
  } catch {
    return null;
  }
}

function getPromptTerminal({ isPostinstall, stdin, stdout }) {
  if (stdin.isTTY && stdout.isTTY) {
    return {
      input: stdin,
      output: stdout,
      isFallback: false,
      close() {},
    };
  }

  if (!isPostinstall) {
    return null;
  }

  return openFallbackTty();
}

async function fileExists(filePath) {
  try {
    await access(filePath, fsConstants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function removeFileIfExists(filePath) {
  try {
    await unlink(filePath);
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
  }
}

async function removeDirectoryIfEmpty(directoryPath) {
  try {
    const entries = await readdir(directoryPath);

    if (entries.length === 0) {
      await rmdir(directoryPath);
    }
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
  }
}

async function removePackageScript(cwd, scriptName) {
  const packageJsonPath = path.join(cwd, "package.json");
  const packageJson = JSON.parse(await readFile(packageJsonPath, "utf8"));

  if (!packageJson.scripts?.[scriptName]) {
    return false;
  }

  delete packageJson.scripts[scriptName];

  if (Object.keys(packageJson.scripts).length === 0) {
    delete packageJson.scripts;
  }

  await writeFile(
    packageJsonPath,
    `${JSON.stringify(packageJson, null, 2)}\n`,
    "utf8",
  );

  return true;
}

export async function cleanupSetupFiles({
  cwd = process.cwd(),
  removeTestScript = false,
} = {}) {
  await removePackageScript(cwd, "postinstall");
  await removePackageScript(cwd, "setup:ui");

  if (removeTestScript) {
    await removePackageScript(cwd, "test");
  }

  await removeFileIfExists(path.join(cwd, SETUP_TEST_SCRIPT));
  await removeFileIfExists(path.join(cwd, SETUP_SCRIPT));
  await removeDirectoryIfEmpty(path.join(cwd, "scripts"));
}

async function writeMarker(cwd, choice) {
  const marker = {
    sidebar: choice.id,
    completedAt: new Date().toISOString(),
  };

  await writeFile(
    path.join(cwd, MARKER_FILE),
    `${JSON.stringify(marker, null, 2)}\n`,
    "utf8",
  );
}

function supportsColor({ env = process.env, output = process.stdout } = {}) {
  if (env.NO_COLOR) {
    return false;
  }

  if (env.FORCE_COLOR && env.FORCE_COLOR !== "0") {
    return true;
  }

  return Boolean(output.isTTY && output.getColorDepth?.() > 1);
}

export function colorize(color, value, options = {}) {
  if (!supportsColor(options)) {
    return value;
  }

  const colors = {
    bold: ["\u001b[1m", "\u001b[22m"],
    cyan: ["\u001b[36m", "\u001b[39m"],
    dim: ["\u001b[2m", "\u001b[22m"],
    green: ["\u001b[32m", "\u001b[39m"],
    gray: ["\u001b[90m", "\u001b[39m"],
  };

  const [open, close] = colors[color] ?? ["", ""];
  return `${open}${value}${close}`;
}

export function formatChoice(choice, isSelected, options = {}) {
  const prefix = isSelected ? "> " : "  ";
  const labelColor = choice.id === "none" ? "green" : "cyan";
  const label = isSelected
    ? colorize(labelColor, choice.label, options)
    : choice.label;
  const description = colorize("dim", `(${choice.description})`, options);

  return `${prefix}${label} ${description}`;
}

function renderChoice(output, choice, isSelected) {
  output.write(`${formatChoice(choice, isSelected, { output })}\n`);
}

function clearMenu(output, lineCount) {
  for (let index = 0; index < lineCount; index += 1) {
    readline.moveCursor(output, 0, -1);
    readline.clearLine(output, 0);
  }
}

function confirmChoice(output, choice) {
  output.write(
    `${colorize("green", "Selected:", { output })} ${choice.label}\n`,
  );
}

export async function promptChoice({
  input = process.stdin,
  output = process.stdout,
  choices = SIDEBAR_CHOICES,
} = {}) {
  if (!input.isTTY || !output.isTTY) {
    return choices[0];
  }

  readline.emitKeypressEvents(input);
  const wasRaw = input.isRaw;
  input.resume();
  input.setRawMode(true);

  let selectedIndex = 0;
  const lineCount = choices.length + 2;

  const draw = () => {
    output.write(
      `${colorize("bold", "Do you want to include a sidebar?", { output })} ${colorize("gray", "Reference: https://ui.shadcn.com/blocks/sidebar", { output })}\n`,
    );
    output.write(
      `${colorize("gray", "Use up/down arrows to select, return to choose.", { output })}\n`,
    );
    choices.forEach((choice, index) => {
      renderChoice(output, choice, index === selectedIndex);
    });
  };

  draw();

  return await new Promise((resolve) => {
    let onKeypress;
    const cleanup = () => {
      input.off("keypress", onKeypress);
      input.setRawMode(wasRaw);
    };

    onKeypress = (_value, key) => {
      if (key.name === "up") {
        selectedIndex =
          selectedIndex === 0 ? choices.length - 1 : selectedIndex - 1;
        clearMenu(output, lineCount);
        draw();
        return;
      }

      if (key.name === "down") {
        selectedIndex = (selectedIndex + 1) % choices.length;
        clearMenu(output, lineCount);
        draw();
        return;
      }

      if (key.name === "return") {
        const choice = choices[selectedIndex];
        cleanup();
        clearMenu(output, lineCount);
        confirmChoice(output, choice);
        resolve(choice);
        return;
      }

      if (key.ctrl && key.name === "c") {
        cleanup();
        output.write("\n");
        process.exitCode = 130;
        resolve(null);
      }
    };

    input.on("keypress", onKeypress);
  });
}

export function getSetupExitCode(result) {
  if (result.status === "failed") {
    return 1;
  }

  if (result.status === "cancelled") {
    return 130;
  }

  return 0;
}

export function shouldCleanupSetup({ result }) {
  return (
    ["already-completed", "installed"].includes(result.status) ||
    (result.status === "skipped" && result.choice === "none")
  );
}

async function runCommand(command, args, { cwd, stdio = "inherit" }) {
  return await new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd,
      shell: process.platform === "win32",
      stdio,
    });

    child.on("close", (status) => resolve({ status }));
  });
}

export async function runSetup({
  cwd = process.cwd(),
  env = process.env,
  stdin = process.stdin,
  stdout = process.stdout,
  stderr = process.stderr,
  isPostinstall = false,
  force = false,
  promptChoice: chooseSidebar = promptChoice,
  runCommand: executeCommand = runCommand,
} = {}) {
  const markerPath = path.join(cwd, MARKER_FILE);

  if (!force && (await fileExists(markerPath))) {
    stdout.write("supanextcn optional UI setup already completed.\n");
    return { status: "already-completed" };
  }

  if (isPostinstall && (env.CI || env.CONTINUOUS_INTEGRATION)) {
    const skipReason = getPostinstallSkipReason({
      isPostinstall,
      env,
      stdin,
      stdout,
    });

    stdout.write(
      `Skipping optional supanextcn UI setup: ${skipReason}. Run pnpm setup:ui later.\n`,
    );
    return { status: "skipped", reason: skipReason };
  }

  const promptTerminal = getPromptTerminal({
    isPostinstall,
    stdin,
    stdout,
  });

  const skipReason = getPostinstallSkipReason({
    isPostinstall,
    env,
    stdin,
    stdout,
    hasFallbackTty: Boolean(promptTerminal),
  });

  if (skipReason) {
    stdout.write(
      `Skipping optional supanextcn UI setup: ${skipReason}. Run pnpm setup:ui later.\n`,
    );
    return { status: "skipped", reason: skipReason };
  }

  let choice;

  choice = await chooseSidebar({
    input: promptTerminal?.input ?? stdin,
    output: promptTerminal?.output ?? stdout,
    choices: SIDEBAR_CHOICES,
  });

  if (!choice) {
    promptTerminal?.close();
    stderr.write("Optional supanextcn UI setup cancelled.\n");
    return { status: "cancelled" };
  }

  if (choice.id === "none") {
    promptTerminal?.close();
    await writeMarker(cwd, choice);
    stdout.write("No sidebar block installed.\n");
    return { status: "skipped", choice: choice.id };
  }

  const commandOptions = { cwd };

  if (promptTerminal?.isFallback) {
    commandOptions.stdio = [
      promptTerminal.input,
      promptTerminal.output,
      promptTerminal.output,
    ];
  }

  const result = await executeCommand("pnpm", [
    "dlx",
    "shadcn@latest",
    "add",
    choice.id,
    "--yes",
  ], commandOptions);
  promptTerminal?.close();

  if (result.status !== 0) {
    stderr.write(`Failed to install ${choice.id}.\n`);
    return { status: "failed", choice: choice.id };
  }

  await writeMarker(cwd, choice);
  stdout.write(`Installed ${choice.id}. Open /dashboard to view it.\n`);
  return { status: "installed", choice: choice.id };
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url);

if (isMain) {
  const isPostinstall = process.argv.includes("--postinstall");
  const result = await runSetup({
    isPostinstall,
    force: process.argv.includes("--force"),
  });

  if (shouldCleanupSetup({ isPostinstall, result })) {
    try {
      await cleanupSetupFiles({ removeTestScript: true });
    } catch (error) {
      process.stderr.write(
        `Optional setup cleanup failed: ${error.message}\n`,
      );
    }
  }

  process.exit(getSetupExitCode(result));
}
