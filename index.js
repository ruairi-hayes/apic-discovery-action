const core = require('@actions/core');
const wait = require('./wait');


// most @actions toolkit packages have async methods
async function run() {
  try {
    const ms = core.getInput('milliseconds');
    const apihost = core.getInput('api-host');
    const apikey = core.getInput('api-key');
    const porg = core.getInput('provider-org');
    const apifile = core.getInput('api-file');

    core.info(`Waiting ${ms} milliseconds ...`);
    core.info(`apihost ${apihost}`);
    core.info(`apikey hegdsqvu${apikey}qsfb£sacghd`);
    core.info(`porg ${porg}`);
    core.info(`apifile ${apifile}`);

    core.debug((new Date()).toTimeString()); // debug is only output if you set the secret `ACTIONS_RUNNER_DEBUG` to true
    await wait(parseInt(ms));
    core.info((new Date()).toTimeString());

    core.setOutput('time', new Date().toTimeString());
    core.setOutput('action-result', ":satisfied: Everything has run without a hitch. :bowtie:");
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
