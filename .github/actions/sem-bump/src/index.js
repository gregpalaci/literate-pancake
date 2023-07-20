const { setFailed, getInput, debug } = require("@actions/core");
const { context, getOctokit } = require("@actions/github");

(async function main() {
  debug("Our action is running");
  const token = getInput("github_token");
  if (!token) {
    setFailed("Input `github_token` is required");
    return;
  }
  const octokit = new getOctokit(token);
  const { payload } = context;
  console.log({ payload });
  //   const {
  //     issue: { number },
  //     repository: { owner, name },
  //   } = payload;
})();
