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
    if(!apisLocation){
        return {status: 400, message: [`Error: create Or Update Discovered Api not run as API files or API folders parameter is missing or Empty`]}
    }
    const apisArray = apisLocation.split(",");
    const isMultiple = apisArray.length > 1;
    let resp, stateUpdateContent;
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
    }
    if(resp.status === 200 || resp.status === 201){
        stateUpdateContent = JSON.stringify({"state":"enabled","message":""});
    } else {
        stateUpdateContent = JSON.stringify({"state":"unhealthy","message":resp.message.message});
    }
    datasourceStateUpdate(apihost,stateUpdateContent,token,porg,dataSourceLocation);
    return resp;

}

let zipDirectory = async function (dataSourceLocation, workspacePath, apisArray, isFolder, isMultiple){
    if(isFolder){
        for(let folder of apisArray){
            const fileList = fs.readdirSync(workspacePath + "/" + folder);
            for(let element of fileList){
                await createFormattedAPI(workspacePath + "/" + folder + "/" + element, dataSourceLocation, true);
            }
        }
    } else if(isMultiple){
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
        bodyContent = JSON.stringify({"api": JSON.parse(stringContent), "original_format": "json", "data_source": {"source": dataSourceLocation, "collector_type": COLLECTOR_TYPE}})
        contentType = 'application/json';
    } else if(fileExtension === '.yaml' || fileExtension === '.yml'){
        bodyContent = JSON.stringify({"api": yaml.load(stringContent), "original_format": "yaml", "data_source": {"source": dataSourceLocation, "collector_type": COLLECTOR_TYPE}})
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
        return {status: 500, message: err}
    }
}

let datasourceStateUpdate = async function(apihost,bodyContent,token, porg, dataSourceLocation){
    try{
        await axios.patch(`https://discovery-api.${apihost}/discovery/orgs/${porg}/data-sources/${encodeURIComponent(dataSourceLocation)}`, bodyContent,{
            headers: {
                "Authorization": "Bearer "+ token,
                "Accept": "application/json",
                "Content-Type": "application/json"
            } 
        })
    } catch(error){
        console.log(error)
        return {status: 500, message: error}
    }
}
let checkAndRegisterDataSource = async function (apihost, token, porg, dataSourceLocation) {
    // Use this function to perform the datasource registration. If the dataSource doesn't exist create it
    let resp;
    try {
        resp = await axios.get(`https://discovery-api.${apihost}/discovery/orgs/${porg}/data-sources/${encodeURIComponent(dataSourceLocation)}`, {
        headers: {
            "Authorization": "Bearer "+ token,
            "Accept": "application/json",
            "Content-Type": "application/json"

        }
        });
        if (resp.status === 404){
            const bodyContent = JSON.stringify({"title": dataSourceLocation, "collector_type": COLLECTOR_TYPE})
            resp = await axios.post(`https://discovery-api.${apihost}/discovery/orgs/${porg}/data-sources`, bodyContent,{
                headers: {
                    "Authorization": "Bearer "+ token,
                    "Accept": "application/json",
                    "Content-Type": "application/json"

                } 
            })
        }
    } catch (error) {
        console.log(error)
        return {status: 500, message: error}
    }
    return resp

}

let getAuthToken = async function (apihost, apikey) {

    var bodyContent=JSON.stringify({"grant_type":"api_key","api_key":apikey,"realm":"provider/default-idp-2"});
    const token = await axios.post(`https://discovery-api.${apihost}/discovery/token`, bodyContent,{
        headers: {
            "Accept": "application/json",
            "Content-Type": "application/json"
        }
    })
    .then(function(res) {
        return res.data.access_token;
    });
    return token;
};

module.exports = { createOrUpdateDiscoveredApi }
