import { describe, it } from "node:test";
import assert from "node:assert";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { loadReposConfig } from "../src/services/configLoader.js";

function writeTempConfig(contents: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ai-pm-config-"));
  const filePath = path.join(dir, "github-repos.json");
  fs.writeFileSync(filePath, contents, "utf-8");
  return filePath;
}

describe("loadReposConfig", () => {
  it("returns null when config file does not exist", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ai-pm-config-"));
    const missingPath = path.join(dir, "missing.json");

    const result = loadReposConfig(missingPath);

    assert.strictEqual(result, null);
  });

  it("throws when JSON is invalid", () => {
    const filePath = writeTempConfig("{");

    assert.throws(() => loadReposConfig(filePath), /Invalid JSON/);
  });

  it("throws when repositories array is missing", () => {
    const filePath = writeTempConfig("{}");

    assert.throws(() => loadReposConfig(filePath), /repositories/);
  });

  it("throws when repository entry is invalid", () => {
    const filePath = writeTempConfig(
      JSON.stringify({ repositories: [{ owner: "org" }] }),
    );

    assert.throws(() => loadReposConfig(filePath), /owner|repo/);
  });

  it("returns repository list for valid config", () => {
    const filePath = writeTempConfig(
      JSON.stringify({ repositories: [{ owner: "org", repo: "app" }] }),
    );

    const result = loadReposConfig(filePath);

    assert.deepStrictEqual(result, [{ owner: "org", repo: "app" }]);
  });
});
