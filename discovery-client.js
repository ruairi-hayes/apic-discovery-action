const fetch = require('node-fetch');
const https = require('https');
const fs = require('fs');
const path = require('path');

// TODO chnage to be discovered-apis when available

let createOrUpdateDiscoveredApi = async function (apihost, apikey, porg, file) {

    console.log(file)
    console.log(path.resolve(file))
    const apifileStat = fs.statSync(path.resolve(file));
    const fileSizeInBytes = apifileStat.size;

    // You can pass any of the 3 objects below as body
    //let readStream = fs.createReadStream(file);
    var stringContent = fs.readFileSync(path.resolve(file),'utf8');
    //var bufferContent = fs.readFileSync(file);

    var token = await getAuthToken(apihost, apikey);
    // bodyContent format needed for draft apis
    //var bodyContent = JSON.stringify({"draft_api": JSON.parse(stringContent)})
    var bodyContent = JSON.stringify(JSON.parse(stringContent))

    var resp = await createOrUpdateApiInternal(apihost, token, porg, bodyContent, "POST", "")
    if (resp.status === 409){
        console.log("API already exists so update it")
        var uuid = resp.message[0].match(/\w{8}-\w{4}-\w{4}-\w{4}-\w{12}/);
        resp = await createOrUpdateApiInternal(apihost, token, porg, bodyContent, "PATCH", "/"+uuid)
    }
    return resp;
};

let createOrUpdateApiInternal = async function (apihost, token, porg, bodyContent, method, uuid) {
    // api for draft apis
    //const resp = await fetch(`https://${apihost}/api/orgs/${porg}/drafts/draft-apis${uuid}?api_type=rest`, {
    const resp = await fetch(`https://discovery-api.${apihost}/discovery/orgs/${porg}/discovered-apis`, {
        method,
        headers: {
            "Authorization": "Bearer "+ token,
            "Accept": "application/json",
            "Content-Type": "application/json"
            //"Content-length": fileSizeInBytes

        },
        body: bodyContent
        //body: readStream // Here, stringContent or bufferContent would also work
    })
    .then(function(res) {
        if(res.status === 201 || res.status === 200){
            return {status:res.status, message: [`${method} operation on api has been successful`]}
        }
        return res.json();
    })
    return resp

}

let getAuthToken = async function (apihost, apikey) {

    var clientid = "599b7aef-8841-4ee2-88a0-84d49c4d6ff2";
    var clientsecret = "0ea28423-e73b-47d4-b40e-ddb45c48bb0c"

    var bodyContent=JSON.stringify({"client_id":clientid,"client_secret":clientsecret,"grant_type":"api_key","api_key":apikey,"realm":"provider/default-idp-2"});

    const token = await fetch(`https://platform-api.${apihost}/api/token`, {
        method: 'POST',
        headers: {
            "Accept": "application/json",
            "Content-Type": "application/json"

        },
        body: bodyContent
    })
    .then(function(res) {
        return res.json();
    }).then(function(json) {
        return json.access_token
    });
    return token;
};

module.exports = { getAuthToken, createOrUpdateDiscoveredApi }