const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const FormData = require('form-data');
const axios = require('axios');
const AdmZip = require("adm-zip");

const COLLECTOR_TYPE = "github";
// process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
const zip = new AdmZip();
const outputFile = "multipleAPIfiles.zip";

let createOrUpdateDiscoveredApi = async function (workspacePath, apihost, apikey, porg, apisLocation, dataSourceLocation, dataSourceCheck, isFolder) {
    const apisArray = apisLocation.split(",");
    const isMultiple = apisArray.length > 1;
    let resp;
    let curlUrl = `https://discovery-api.${apihost}/discovery/orgs/${porg}/discovered-apis`;
    if (!apikey){
        return {status: 304, message: [`Warning: create Or Update Discovered Api not run as apikey is missing`]}
    }
    var token = await getAuthToken(apihost, apikey);
    if (dataSourceCheck) {
        await checkAndRegisterDataSource(apihost, token, porg, dataSourceLocation);
    }
    if(!isFolder && !isMultiple){
        let [bodyContent,contentType] = await createFormattedAPI(apisLocation, dataSourceLocation, false);
        resp = await createOrUpdateApiInternal(curlUrl, token, bodyContent, "POST", contentType)
    if (resp.status === 409){
        var uuid = resp.message[0].match(/\w{8}-\w{4}-\w{4}-\w{4}-\w{12}/);
        resp = await createOrUpdateApiInternal(curlUrl+"/"+uuid, token, bodyContent, "PATCH", contentType)
    }
        return resp;
    } else if(isFolder || isMultiple){
        await zipDirectory(dataSourceLocation, workspacePath, apisArray, isFolder, isMultiple);
        const formData = new FormData();
        // let data = await axios.toFormData({'zip':fs.createReadStream('myfile.zip')},form);
        formData.append('zip', fs.createReadStream(workspacePath+'/'+outputFile), { 
            name: outputFile,
            contentType: 'application/zip'
         });
        resp = await createOrUpdateApiInternal(curlUrl + "/bulk", token, formData, "POST", "multipart/form-data");
        fs.unlink(outputFile, (err) => {
            if (err) {
                throw err;
            }        
        });
        return resp;
    } else {
        let err = {
            status: 400,
            message: "The Environemnt variables API_INPUT_FILES or API_INPUT_FOLDER is missing"
        };
        throw err;
    }
}

let zipDirectory = async function (dataSourceLocation, workspacePath, apisArray, isFolder, isMultiple){
    if(isFolder && !isMultiple){
        const fileList = fs.readdirSync(workspacePath+"/"+ apisArray);
        for(let element of fileList){
            await createFormattedAPI(workspacePath + "/" + apisArray + "/" + element, dataSourceLocation, true);
        }
    } else if(isFolder && isMultiple){
        for(let folder of apisArray){
            const fileList = fs.readdirSync(workspacePath + "/" + folder);
            for(let element of fileList){
                await createFormattedAPI(workspacePath + "/" + folder + "/" + element, dataSourceLocation, true);
            }
        }
    } else if(!isFolder && isMultiple){
        for(let element of apisArray){
            await createFormattedAPI(workspacePath + "/" + element, dataSourceLocation, true);
        }
    }
    await zip.writeZip(outputFile);
}

let createFormattedAPI = async function (apisLocation, dataSourceLocation, isAddFilesToZip){
    let bodyContent, contentType;
    const fileExtension = path.extname(apisLocation);
    let stringContent = fs.readFileSync(path.resolve(apisLocation),'utf8');
    if(fileExtension === '.json'){
        bodyContent = JSON.stringify({"api": JSON.parse(stringContent), "data_source": {"source": dataSourceLocation, "collector_type": COLLECTOR_TYPE}})
        contentType = 'application/json';
    } else if(fileExtension === '.yaml' || fileExtension === '.yml'){
        bodyContent = JSON.stringify({"api": yaml.load(stringContent), "data_source": {"source": dataSourceLocation, "collector_type": COLLECTOR_TYPE}})
        contentType = 'application/yaml';
    }
    if(isAddFilesToZip){
        await zip.addFile(apisLocation.split("/").pop(), bodyContent);
        return;
    } else{
        return [bodyContent, contentType];
    }
}

let createOrUpdateApiInternal = async function (curlUrl, token, bodyContent, method, contentType) {
    console.log("createOrUpdateApiInternal");
    try{
        const resp = await axios.post(curlUrl, bodyContent, {
            headers: {
                "Authorization": "Bearer "+ token,
                Accept: 'application/json',
                'Content-Type': contentType,
                responseType: 'text'  
            }
        })
        .then(function(res) {
            if(res.status === 201 || res.status === 200){
                return {status:res.status, message: [`${method} operation on api has been successful`]}
            }
            return res.json();
        })
        return resp
    } catch(err){
        console.log(err);
    }
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
