const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const COLLECTOR_TYPE = "github"

let createOrUpdateDiscoveredApi = async function (apihost, apikey, porg, file, dataSourceLocation, dataSourceCheck) {

    // You can pass any of the 3 objects below as body
    //let readStream = fs.createReadStream(file);
    const fileExtension = path.extname(file);
    var stringContent = fs.readFileSync(path.resolve(file),'utf8');
    //var bufferContent = fs.readFileSync(file);
    if (!apikey){
        return {status: 304, message: [`Warning: create Or Update Discovered Api not run as apikey is missing`]}
    }
    var token = await getAuthToken(apihost, apikey);

    if (dataSourceCheck) {
        await checkAndRegisterDataSource(apihost, token, porg, dataSourceLocation);
    }

    // bodyContent format needed for draft apis
    //var bodyContent = JSON.stringify({"draft_api": JSON.parse(stringContent)})
    var bodyContent;
    if(fileExtension === '.json'){
        bodyContent = JSON.stringify({"api": JSON.parse(stringContent), "data_source": {"source": dataSourceLocation, "collector_type": COLLECTOR_TYPE}})
    } else if(fileExtension === '.yaml' || fileExtension === '.yml'){
        bodyContent = JSON.stringify({"api": yaml.load(stringContent), "data_source": {"source": dataSourceLocation, "collector_type": COLLECTOR_TYPE}})
    }
    var resp = await createOrUpdateApiInternal(apihost, token, porg, bodyContent, "POST", "")
    if (resp.status === 409){
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
        if(res.status === 201 || res.status === 200){
            return {status:res.status, message: [`${method} operation on api has been successful`]}
        }
        return res.json();
    })
    return resp

}

let checkAndRegisterDataSource = async function (apihost, token, porg, dataSourceLocation) {
    // Use this function to perform the datasource registration. If the dataSource doesn't exist create it
    let resp;
    try {
        resp = await fetch(`https://discovery-api.${apihost}/discovery/orgs/${porg}/data-sources/${encodeURIComponent(dataSourceLocation)}`, {
        method: "GET",
        headers: {
            "Authorization": "Bearer "+ token,
            "Accept": "application/json",
            "Content-Type": "application/json"

        }
        })
        if (resp.status === 404){
            const bodyContent = JSON.stringify({"title": dataSourceLocation, "collector_type": COLLECTOR_TYPE})
            resp = await fetch(`https://discovery-api.${apihost}/discovery/orgs/${porg}/data-sources`, {
                method: "POST",
                headers: {
                    "Authorization": "Bearer "+ token,
                    "Accept": "application/json",
                    "Content-Type": "application/json"

                },
                body: bodyContent
            })
        }
    } catch (error) {
        console.log(error)
        return {status: 500, message: error}
    }
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