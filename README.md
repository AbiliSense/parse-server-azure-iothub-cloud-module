# parse-server-azure-iothub-cloud-module

![Build Status](https://travis-ci.org/AbiliSense/parse-server-azure-iothub-cloud-module.svg?branch=master "Build Status")

This is an integration Parse Server cloud code module for Azure IotHub. It is used to register devices with an IotHub recieviung SaS Tokens for device and sending messages from Parse-Server to an IoT device via IoTHub.

# Installation
```
npm install parse-server-azure-iothub-cloud-module --save
```

In your cloud/main.js file (or whereever your cloud code is located) add the following:
```
var azureIoTHubModule = require('parse-server-azure-iothub-cloud-module');

Parse.Cloud.define("getSasToken", azureIoTHubModule.getSasToken);
Parse.Cloud.define("sendIoTMessage", azureIoTHubModule.sendIoTMessage);
```
restart you server.

# Usage

## Register a device
```
curl -X POST -H "X-Parse-Application-Id: MY_APP_ID" -H "Content-Type: application/json" -d '{
	"installationId": "d1f65450-726d-4656-ae80-e46c767a0278",
	"deviceType": "embedded"
}' "http://localhost:1337/parse/installations/"
```

## Send IoT Messeage
```
curl -X POST -H "X-Parse-Application-Id: MY_APP_ID" -H "Content-Type: application/json" -d '{
	"deviceId": "d1f65450-726d-4656-ae80-e46c767a0278",
	"message": "This is my test message"
}' "http://localhost:1337/parse/functions/sendIoTMessage"
```

## Get SaS Token
```
curl -X POST -H "X-Parse-Application-Id: MY_APP_ID" -H "Content-Type: application/json" -H "X-Parse-Installation-Id: d1f65450-726d-4656-ae80-e46c767a0278" -d '{}' "http://localhost:1337/parse/functions/getSasToken"
```