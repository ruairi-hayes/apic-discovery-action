const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

const COLLECTOR_TYPE = "github"

let createOrUpdateDiscoveredApi = async function (apihost, apikey, porg, file, dataSourceLocation, dataSourceCheck) {

    // You can pass any of the 3 objects below as body
    //let readStream = fs.createReadStream(file);
    var stringContent = fs.readFileSync(path.resolve(file),'utf8');
    //var bufferContent = fs.readFileSync(file);
    if (!apikey){
        return {status: 304, message: [`Warning: create Or Update Discovered Api not run as apikey is missing`]}
    }
    var token = await getAuthToken(apihost, apikey);

    console.log(" ################# dataSourceCheck #################### ")
    console.log(dataSourceCheck)

    console.log(stringContent)
    console.log(token)

    // bodyContent format needed for draft apis
    //var bodyContent = JSON.stringify({"draft_api": JSON.parse(stringContent)})

    var bodyContent = JSON.stringify({"api": JSON.parse(stringContent), "data_source": {"source": dataSourceLocation, "collector_type": COLLECTOR_TYPE}})
    console.log(bodyContent)


    var resp = await createOrUpdateApiInternal(apihost, token, porg, bodyContent, "POST", "")
    console.log("resp")
    console.log(resp)
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
    const resp = await fetch(`https://discovery-api.${apihost}/discovery/orgs/${porg}/discovered-apis${uuid}`, {
        method,
        headers: {
            "Authorization": "Bearer "+ token,
            "Accept": "application/json",
            "Content-Type": "application/json"

        },
        body: bodyContent
    })
    .then(function(res) {
        console.log(res)
        if(res.status === 201 || res.status === 200){
            return {status:res.status, message: [`${method} operation on api has been successful`]}
        }
        return res.json();
    })
    return resp

}

let getAuthToken = async function (apihost, apikey) {

    const clientid = Buffer.from('NTk5YjdhZWYtODg0MS00ZWUyLTg4YTAtODRkNDljNGQ2ZmYy', 'base64').toString('utf8');
    const clientsecret = Buffer.from('MGVhMjg0MjMtZTczYi00N2Q0LWI0MGUtZGRiNDVjNDhiYjBj', 'base64').toString('utf8');

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

module.exports = { createOrUpdateDiscoveredApi }