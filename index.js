const core = require('@actions/core');
const { createOrUpdateDiscoveredApi } = require('./discovery-client');


// most @actions toolkit packages have async methods
async function run() {
  try {

    const repoLocation = process.env['GITHUB_REPOSITORY'];
    const workspacePath = process.env['GITHUB_WORKSPACE'];
    const apihost = core.getInput('api_host');
    const apikey = core.getInput('api_key');
    const porg = core.getInput('provider_org');
    const apifile = workspacePath + '/' + core.getInput('api_file');

    core.info(`apihost ${apihost}`);
    core.info(`porg ${porg}`);
    core.info(`apifile ${apifile}`);

    var resp = await createOrUpdateDiscoveredApi(apihost, apikey, porg, apifile, repoLocation);
    core.info(`response: status: ${resp.status}, message: ${resp.message[0]}`);

    core.setOutput('action-result', `response: status: ${resp.status}, message: ${resp.message[0]}`);

    if (![200, 201, 304].includes(resp.status)){
      core.setFailed(resp.message[0]);
    }
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
