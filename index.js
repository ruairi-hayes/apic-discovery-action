const core = require('@actions/core');
const wait = require('./wait');
const { getAuthToken, createOrUpdateDiscoveredApi } = require('./discovery-client');


// most @actions toolkit packages have async methods
async function run() {
  try {

    core.info(`process.env ${process.env}`);

    const ms = core.getInput('milliseconds');
    const apihost = core.getInput('api_host');
    const apikey = core.getInput('api_key');
    const porg = core.getInput('provider_org');
    const apifile = core.getInput('api_file');

    core.info(`Waiting ${ms} milliseconds ...`);
    core.info(`apihost ${apihost}`);
    core.info(`apikey hegdsqvu${apikey}qsfb£sacghd`);
    core.info(`porg ${porg}`);
    core.info(`apifile ${apifile}`);

    var resp = await createOrUpdateDiscoveredApi(apihost, apikey, porg, apifile);
    core.info(`response: status: ${resp.status}, message: ${resp.message[0]}`);

    core.debug((new Date()).toTimeString()); // debug is only output if you set the secret `ACTIONS_RUNNER_DEBUG` to true
    await wait(parseInt(ms));
    core.info((new Date()).toTimeString());

    core.setOutput('time', new Date().toTimeString());
    core.setOutput('action-result', `response: status: ${resp.status}, message: ${resp.message[0]}`);
    if (resp.status !== 201 && resp.status !== 200 ){
      core.setFailed(resp.message[0]);
    }
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
