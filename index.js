const core = require('@actions/core');
const { createOrUpdateDiscoveredApi } = require('./discovery-client');


// most @actions toolkit packages have async methods
async function run() {
  try {

    let apisLocation,isFolder;
    const githubServer = new URL(process.env['GITHUB_SERVER_URL']).hostname;
    const repoLocation = process.env['GITHUB_REPOSITORY'];

    const workspacePath = process.env['GITHUB_WORKSPACE'];
    const apihost = core.getInput('api_host');
    const apikey = core.getInput('api_key');
    const porg = core.getInput('provider_org');
    const datasourceCheck = core.getInput('resync_check');

    core.info(`apihost ${apihost}`);
    core.info(`porg ${porg}`);
    core.info(`datasourceCheck ${datasourceCheck}`);
    if(core.getInput('api_files')){
      apisLocation = core.getInput('api_files');
      core.info(`apifiles ${apisLocation}`);
      isFolder = false;
     } else if(core.getInput('api_folders')){
      apisLocation = core.getInput('api_folders');
      core.info(`apifolders ${apisLocation}`);
      isFolder = true;
     }

    var resp = await createOrUpdateDiscoveredApi(workspacePath, apihost, apikey, porg, apisLocation, githubServer+"/"+repoLocation, datasourceCheck, isFolder);
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
