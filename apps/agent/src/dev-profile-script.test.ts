import { spawnSync } from "node:child_process";
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const profileScript = fileURLToPath(new URL("../../../scripts/dev-profile.sh", import.meta.url));

describe("dev-profile.sh", () => {
  it.each(["development", "practice"])("starts the host Agent for the %s profile", (profile) => {
    const workspace = mkdtempSync(join(tmpdir(), "english-coach-profile-"));
    const binDirectory = join(workspace, "bin");
    const backendDirectory = join(workspace, "apps/backend");
    const agentDirectory = join(workspace, "apps/agent");
    const commandCapture = join(workspace, "pnpm-command.txt");

    mkdirSync(binDirectory, { recursive: true });
    mkdirSync(backendDirectory, { recursive: true });
    mkdirSync(agentDirectory, { recursive: true });
    writeFileSync(join(backendDirectory, `.env.${profile}.local`), `APP_ENV=${profile}\n`);
    writeFileSync(join(agentDirectory, `.env.${profile}.local`), `APP_ENV=${profile}\n`);

    const fakePnpm = join(binDirectory, "pnpm");
    writeFileSync(fakePnpm, '#!/bin/sh\nprintf "%s\\n" "$*" > "$COMMAND_CAPTURE"\n');
    chmodSync(fakePnpm, 0o755);

    const result = spawnSync("sh", [profileScript, profile], {
      cwd: workspace,
      encoding: "utf8",
      env: {
        ...process.env,
        COMMAND_CAPTURE: commandCapture,
        PATH: `${binDirectory}:${process.env.PATH ?? ""}`,
      },
    });

    expect(result.status, result.stderr).toBe(0);
    expect(readFileSync(commandCapture, "utf8").trim()).toBe("run dev:full:agent");
    expect(readFileSync(join(backendDirectory, ".env.local"), "utf8")).toBe(`APP_ENV=${profile}\n`);
    expect(readFileSync(join(agentDirectory, ".env.local"), "utf8")).toBe(`APP_ENV=${profile}\n`);
  });
});
