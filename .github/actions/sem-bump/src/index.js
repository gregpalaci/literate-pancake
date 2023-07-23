const { setFailed, getInput, debug } = require("@actions/core");
const { context, getOctokit } = require("@actions/github");
const core = require("@actions/core");
const ansiColor = require("./ansiColor");
const lodash = require("lodash");
const { execSync, spawn } = require("child_process");
const { existsSync } = require("fs");
const { EOL } = require("os");
const path = require("path");

const workspace = process.env.GITHUB_WORKSPACE;

const pkg = getPackageJson();

function getPackageJson() {
  const pathToPackage = path.join(workspace, "package.json");
  if (!existsSync(pathToPackage))
    throw new Error("package.json could not be found in your project's root.");
  return require(pathToPackage);
}

function exitSuccess(message) {
  console.info(`✔  success   ${message}`);
  process.exit(0);
}

function exitFailure(message) {
  logError(message);
  process.exit(1);
}

function logError(error) {
  console.error(`✖  fatal     ${error.stack || error}`);
}

function runInWorkspace(command, args) {
  return new Promise((resolve, reject) => {
    console.log("runInWorkspace | command:", command, "args:", args);
    const child = spawn(command, args, { cwd: workspace });
    let isDone = false;
    const errorMessages = [];
    child.on("error", (error) => {
      if (!isDone) {
        isDone = true;
        reject(error);
      }
    });
    child.stderr.on("data", (chunk) => errorMessages.push(chunk));
    child.on("exit", (code) => {
      if (!isDone) {
        if (code === 0) {
          resolve();
        } else {
          reject(
            `${errorMessages.join("")}${EOL}${command} exited with code ${code}`
          );
        }
      }
    });
  });
  //return execa(command, args, { cwd: workspace });
}

function nameToIdentifier(name) {
  return name
    .replace(/['"“‘”’]+/gu, "") // remove quotes
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-") // non alphanum to dashes
    .replace(/-+/g, "-") // remove consecutive dashes
    .toLowerCase();
}

function nameToEnvironmentVariableName(name) {
  return (
    "GITHUB_PR_LABEL_" +
    lodash
      .deburr(name) // remove accents
      .replace(/['"“‘”’]+/gu, "") // remove quotes
      .replace(/[^\w]+/g, "_") // non-alphanum to underscores
      .replace(/_+/g, "_") // remove consecutive underscores
      .toUpperCase()
  );
}

(async function main() {
  debug("Our action is running ");

  const token = getInput("github_token");
  if (!token) {
    setFailed("Input `github_token`  is required ");
    return;
  }

  // Get the Octokit client.
  const octokit = new getOctokit(token);

  // Get info about the event.
  const { payload, eventName } = context;

  await runInWorkspace("git", [
    "config",
    "user.name",
    `"${process.env.GITHUB_USER || "Automated Version Bump"}"`,
  ]).catch((e) => console.log(e));

  await runInWorkspace("git", [
    "config",
    "user.email",
    `"${
      process.env.GITHUB_EMAIL ||
      "gh-action-bump-version@users.noreply.github.com"
    }"`,
  ]).catch((e) => console.log(e));

  await runInWorkspace("git", [
    "checkout",
    "-b",
    process.env.GITHUB_HEAD_REF,
  ]).catch((e) => console.log(e));

  await runInWorkspace("git", ["pull"]).catch((e) => console.log(e));

  const current = pkg.version.toString();

  const remoteRepo = `https://${process.env.GITHUB_ACTOR}:${process.env.GITHUB_TOKEN}@github.com/${process.env.GITHUB_REPOSITORY}.git`;

  await runInWorkspace("npm", [
    "version",
    "--allow-same-version=true",
    "--git-tag-version=false",
    current,
  ]).catch((e) => console.log(e));

  await runInWorkspace("git", ["fetch"]).catch((e) => console.log(e));

  await runInWorkspace("git", ["commit", "-a", "-m", "version update "]).catch(
    (e) => console.log(e)
  );

  await runInWorkspace("git", ["push", remoteRepo, "--tags"]).catch((e) =>
    console.log(e)
  );

  debug(`Received event = '${eventName}', action = '${payload.action}'`);

  const labels = context.payload?.pull_request?.labels;
  const labelsObject = {};

  if (!labels) {
    core.info("Not a pull request");
    core.setOutput("labels", "");
    core.setOutput("labels-object", null);
    return;
  }

  if (labels.length == 0) {
    core.info("No labels found");
    core.setOutput("labels", "");
    core.setOutput("labels-object", {});
    return;
  }

  for (const label of labels) {
    const identifier = nameToIdentifier(label.name);
    const environmentVariable = nameToEnvironmentVariableName(label.name);

    core.exportVariable(environmentVariable, "1");
    core.info(
      `\nFound label ${ansiColor.startColor(label.color)} ${
        label.name
      } ${ansiColor.endColor()}\n  Setting env var for remaining steps: ${environmentVariable}=1`
    );
    labelsObject[identifier] = true;
  }

  const labelsString = " " + Object.keys(labelsObject).join(" ") + " ";

  core.info(
    `\nAction output:\nlabels: ${JSON.stringify(
      labelsString
    )}\nlabels-object: ${JSON.stringify(labelsObject)}`
  );
  core.setOutput("labels", labelsString);
  core.setOutput("labels-object", labelsObject);

  // We only want to proceed if this is a newly opened issue.
  //   if (eventName === "issues" && payload.action === "opened") {
  //     // Extra data from the event, to use in API requests.
  //     const {
  //       issue: { number },
  //       repository: { owner, name },
  //     } = payload;

  //     // List of labels to add to the issue.
  //     const labels = ["Issue triaged"];

  //     debug(
  //       `Add the following labels to issue #${number}: ${labels
  //         .map((label) => `"${label}"`)
  //         .join(", ")}`
  //     );
  //   }
})();
