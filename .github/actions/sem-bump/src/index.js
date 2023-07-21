const { setFailed, getInput, debug } = require("@actions/core");
const { context, getOctokit } = require("@actions/github");
const core = require("@actions/core");
const ansiColor = require("./ansiColor");
const lodash = require("lodash");

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
    setFailed("Input `github_token` is required ");
    return;
  }

  // Get the Octokit client.
  const octokit = new getOctokit(token);

  // Get info about the event.
  const { payload, eventName } = context;

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
