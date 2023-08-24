const process = require('process');
const cp = require('child_process');
const path = require('path');

// shows how the runner will run a javascript action with env / stdout protocol
test('test runs', () => {

  process.env['GITHUB_SERVER_URL'] = "https://github.com";
  process.env['GITHUB_REPOSITORY'] = "apic-discovery-action";
  process.env['GITHUB_WORKSPACE'] = "/home/ruairi/git/misc/apic-discovery-action";

  process.env['INPUT_API_HOST'] = "d-h01.apiconnect.dev.automation.ibm.com";
  process.env['INPUT_API_KEY'] = "9145ec5d-515d-4d0d-97f6-9f19c5a27b1f";
  process.env['INPUT_PROVIDER_ORG'] = "ruairi_h01_b";
  //process.env['INPUT_API_FILE'] = "/home/ruairi/git/misc/apic-discovery-action/echo-api.json";
  process.env['INPUT_API_FILE'] = "gmail-api.json";
  process.env['INPUT_RESYNC_CHECK'] = false;

  //process.env['INPUT_API_FILE'] = "echo-api.json";
  const ip = path.join(__dirname, 'index.js');
  const result = cp.execSync(`node ${ip}`, {env: process.env}).toString();
  console.log(result);
})
