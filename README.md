# Create a Apiconnect Discovery Action

The Apiconnect Discovery Action allows you to send and keep in sync your OpenAPI reference documents with Apiconnect.  
The action will sync the documents with the discovery service repository in Apiconnect and from there they can be promoted  
as required to be managed by Apiconnect through their entire lifecycle.  

# Usage

See [action.yml](action.yml)

The simplest usage of the job is as follows, where on a push commit to the github repo the specified `api_file`  
will be sent to the discovery service repo of the given `provider_org` at location `api_host` using the  
`api_key` to authenticate with the discovery service.  
```
name: Sync Discovered API with ApiConnect

on: [push]

env:
  API_HOST: us-east-a.apiconnect.automation.ibm.com
  PROVIDER_ORG: my_pOrg
  API_FILE: gmail-api.json

jobs:
  run-discovery:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    - uses: ruairi-hayes/apic-discovery-action@main
      id: discover-apis
      with:
        api_key: ${{ secrets.apicApikey }}
        api_host: ${{ env.API_HOST }}
        provider_org: ${{ env.PROVIDER_ORG }}
        api_file: ${{ env.API_FILE }}
    - name: Display the action-result
      run: |
        echo "Result of the action: ${{ steps.discover-apis.outputs.action-result }}"
```

As you may not want to call the discovery severice on each commit to the github repo. The following example  
will only send the file to the discovery service in the case where the file has been updated and changed in the commit.  
To do this an initial job can be defined which will conditioanlly check if the file has been updated in the commit.  

```
name: Sync Discovered API with ApiConnect

on: [push]

env:
  API_HOST: us-east-a.apiconnect.automation.ibm.com
  PROVIDER_ORG: my_pOrg
  API_FILE: gmail-api.json

jobs:
  check_apifiles_job:
    runs-on: 'ubuntu-20.04'
    outputs:
      apifiles_changed: ${{ steps.check_apifile_changed.outputs.apifile_updates }}
    steps:
    - uses: actions/checkout@v3
      with:
        fetch-depth: 2
    - name: Check API File changed
      id: check_apifile_changed
      run: |
        echo "apifile_updates=$(git diff --name-only --diff-filter=ACMRT ${{ github.event.before }} ${{ github.sha }} | grep $API_FILE | xargs)" >> $GITHUB_OUTPUT
  run-discovery:
    runs-on: ubuntu-latest
    needs: [ check_apifiles_job ]
    if: ${{needs.check_apifiles_job.outputs.apifiles_changed}}
    steps:
    - uses: actions/checkout@v3
    - uses: ruairi-hayes/apic-discovery-action@main
      id: discover-apis
      with:
        api_host: ${{ env.API_HOST }}
        provider_org: ${{ env.PROVIDER_ORG }}
        api_key: ${{ secrets.apicApikey }}
        api_file: ${{ env.API_FILE }}
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



## Adding the apic-discovery-action to GitHub Action workflow
Based on the samples given above you will now need to add one of these to your required GitHub repo.   
For more details on how to set up a GitHub Action workflow in your Github repo see [the quickstart guide](https://docs.github.com/en/actions/quickstart).  
