# Create a Apiconnect Discovery Action

The Apiconnect Discovery Action allows you to send and keep in sync your OpenAPI reference documents with Apiconnect. 
The action will sync the documents with the discovery service repository in Apiconnect and from there they can be promoted 
as required to be managed by Apiconnect through their entire lifecycle.  

# Usage

See [action.yml](action.yml)


To create the workflow action in your github repository do the following
1. Create a .github/workflows directory in your repository on GitHub if this directory does not already exist.
2. In the .github/workflows directory, create a file named discover-api.yml.
3. Copy the yaml contents described below into the discover-api.yml file.
4. Update the env variables and secret to match your environment. These are described below.  

The job works as follows, where on a push commit to the github repo the specified `api_file`
will be sent to the discovery service repo of the given `provider_org` at location `api_host` using the  
`api_key` to authenticate with the discovery service. The job will only send the file to the discovery service in the case where the file has been updated and changed in the commit,
or when you first create or update the `discover-api.yml` file.

```
name: Sync Discovered API with ApiConnect

on: [pull_request, workflow_dispatch, push]

env:
  API_HOST: d-h01.apiconnect.dev.automation.ibm.com
  PROVIDER_ORG: ruairi_h01_b
  API_FILE: gmail-api.json

jobs:
  check_apifiles_job:
    runs-on: 'ubuntu-20.04'
    # Declare outputs for next jobs
    outputs:
      apifiles_changed: ${{ steps.check_files_changed.outputs.apifile_updates }}
      action_changed: ${{ steps.check_files_changed.outputs.action_updates }}
    steps:
    - uses: actions/checkout@v3
      with:
        fetch-depth: 2
    - name: Check API File changed
      id: check_files_changed
      run: |
        echo "apifile_updates=$(git diff --name-only --diff-filter=ACMRT ${{ github.event.before }} ${{ github.sha }} | grep $API_FILE | xargs)" >> $GITHUB_OUTPUT
        echo "action_updates=$(git diff --name-only --diff-filter=ACMRT ${{ github.event.before }} ${{ github.sha }} | grep discover-api.yml | xargs)" >> $GITHUB_OUTPUT
  run-discovery:
    runs-on: ubuntu-latest
    needs: [ check_apifiles_job ]
    if: ${{ (needs.check_apifiles_job.outputs.apifiles_changed) || (needs.check_apifiles_job.outputs.action_changed) }}
    steps:
    - uses: actions/checkout@v3
    - uses: ruairi-hayes/apic-discovery-action@main
      id: discover-apis
      with:
        api_host: ${{ env.API_HOST }}
        provider_org: ${{ env.PROVIDER_ORG }}
        api_key: ${{ secrets.apicApikey }}
        api_file: ${{ env.API_FILE }}
        resync_check: ${{ needs.check_apifiles_job.outputs.action_changed && true || false }}
    - name: Display the action-result
      run: |
        echo "Result of the action: ${{ steps.discover-apis.outputs.action-result }}"
```

## Parameters required for apic-discovery-action

The following parameters are always required:

 - api-host - Domain name of the ApiConnect instance where discovered APIs will be sent
 - provider-org - The provider org to use. 
 - api-file - File name of the API to sync with apiconnect discovery repo
 - apikey - An API Key obtained from api-manager.{api-host}/manager/auth/manager/sign-in/?from=TOOLKIT (typically used with an OIDC user registry like IBM Verify).
   It is good practice to store any sensitive data like the apikey as a github action secret. See [here](https://docs.github.com/en/actions/security-guides/encrypted-secrets#creating-encrypted-secrets-for-a-repository) for more details.  
   For the sample above the github secret should be called `apicApikey` as it will need to match the following templated value ${{ secrets.apicApikey }} 
 - resync_check: Indicates if changes to the action like at initial creation should trigger a api-file sync. 



## More details on setting up a sample GitHub Action
For more details on how to set up a GitHub Action workflows in your Github repo in general see [the quickstart guide](https://docs.github.com/en/actions/quickstart).  
