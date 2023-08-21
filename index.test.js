const wait = require('./wait');
const process = require('process');
const cp = require('child_process');
const path = require('path');

test('throws invalid number', async () => {
  await expect(wait('foo')).rejects.toThrow('milliseconds not a number');
});

test('wait 500 ms', async () => {
  const start = new Date();
  await wait(500);
  const end = new Date();
  var delta = Math.abs(end - start);
  expect(delta).toBeGreaterThanOrEqual(500);
});

// shows how the runner will run a javascript action with env / stdout protocol
test('test runs', () => {
  process.env['INPUT_MILLISECONDS'] = 100;
  process.env['INPUT_API_HOST'] = "d-h01.apiconnect.dev.automation.ibm.com";
  process.env['INPUT_API_KEY'] = "9145ec5d-515d-4d0d-97f6-9f19c5a27b1f";
  process.env['INPUT_PROVIDER_ORG'] = "ruairi_h01_b";
  //process.env['INPUT_API_FILE'] = "/home/ruairi/git/misc/apic-discovery-action/echo-api.json";
  process.env['INPUT_API_FILE'] = "/home/ruairi/git/misc/apic-discovery-action/gmail-api.json";
  //process.env['INPUT_API_FILE'] = "echo-api.json";
  const ip = path.join(__dirname, 'index.js');
  const result = cp.execSync(`node ${ip}`, {env: process.env}).toString();
  console.log(result);
})
