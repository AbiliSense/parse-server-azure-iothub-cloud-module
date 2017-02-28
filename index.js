const crypto = require('crypto');
var iothub = require('azure-iothub');
var Message = require('azure-iot-common').Message;


var iotHubHostName = process.env.IOTHUB_HOST_NAME || 'iothub.azure-devices.net';
var iotHubAccessKeyName = process.env.IOTHUB_ACCESSKEY_NAME || 'iothubowner';
var iotHubAccessKey = process.env.IOTHUB_ACCESSKEY || 'SOME_KEY'; //xFHOt2Lg0RghetXDLfqLYnqEdRRinOBAHYKL3d7Dlos=

var connectionString = `HostName=${iotHubHostName};SharedAccessKeyName=${iotHubAccessKeyName};SharedAccessKey=${iotHubAccessKey}`;

var registry = iothub.Registry.fromConnectionString(connectionString);
var serviceClient = iothub.Client.fromConnectionString(connectionString);

function generateSasToken(resourceUri, signingKey, policyName, expiresInMins) {

    resourceUri = encodeURIComponent(resourceUri.toLowerCase()).toLowerCase();

    // Set expiration in seconds
    var expires = (Date.now() / 1000) + expiresInMins * 60;
    expires = Math.ceil(expires);
    var toSign = resourceUri + '\n' + expires;

    // Use crypto
    var hmac = crypto.createHmac('sha256', new Buffer(signingKey, 'base64'));
    hmac.update(toSign);
    var base64UriEncoded = encodeURIComponent(hmac.digest('base64'));

    // Construct autorization string
    var token = "SharedAccessSignature sr=" + resourceUri + "&sig=" +
        base64UriEncoded + "&se=" + expires;
    if (policyName) token += "&skn=" + policyName;
    return token;
};

function getIoTHubDeviceKey(deviceId) {
    var device = new iothub.Device(null);
    device.deviceId = deviceId;
    var iotHubRequestPromise = new Parse.Promise();
    registry.create(device, (err, deviceInfo, res) => {
        if (err) {
            registry.get(device.deviceId, (err, registryDeviceInfo, res) => {
                if (err) {
                    iotHubRequestPromise.reject(err.message);
                }
                iotHubRequestPromise.resolve(registryDeviceInfo.authentication.symmetricKey.primaryKey);
            });
        } else if (deviceInfo) {
            iotHubRequestPromise.resolve(deviceInfo.authentication.symmetricKey.primaryKey);
        }
    });
    return iotHubRequestPromise;
}

Parse.Cloud.beforeSave(Parse.Installation, (request, response) => {
    if (request.object.get("deviceType") == "embedded") {
        getIoTHubDeviceKey(request.object.get("installationId"))
            .then((iotHubDeviceKey) => {
                request.object.set("key", iotHubDeviceKey);
                response.success();
            }, (err) => {
                response.error(err);
            });
    } else {
        response.success();
    }
});

module.exports.getSasToken = (request, response) => {
    Parse.Cloud.useMasterKey();
    var deviceId = request.installationId;
    var timeValid = 1440; //24 hr
    var installationQuery = new Parse.Query(Parse.Installation);
    installationQuery.equalTo('installationId', deviceId);
    installationQuery.find()
        .then((results) => {
            var deviceKeyPromise = new Parse.Promise();
            var deviceKey = results[0].get("key");
            if (deviceKey) {
                deviceKeyPromise.resolve(deviceKey);
            } else {
                getIoTHubDeviceKey(results[0].get("installationId"))
                    .then((iotHubDeviceKey) => {
                        results[0].set("key", iotHubDeviceKey);
                        results[0].save();
                        deviceKeyPromise.resolve(iotHubDeviceKey);
                    });
            }
            return deviceKeyPromise;
        })
        .then((iotHubDeviceKey) => {
            serviceClient.open(function (err) {
                if (err) {
                    response.error(err);
                } else {
                    var endpoint = `${iotHubHostName}/devices/${deviceId}`;
                    var token = generateSasToken(endpoint, iotHubDeviceKey, null, timeValid);
                    response.success(token);
                }
            });
        });
};

function receiveFeedback(err, receiver){
  receiver.on('message', function (msg) {
    console.log('Feedback message:')
    console.log(msg.getData().toString('utf-8'));
  });
};

module.exports.sendIoTMessage = (request, response) => {
    var deviceId = request.params.deviceId;
    var message = request.params.message;
    serviceClient.open(function (err) {
        if (err) {
            console.error('Could not connect: ' + err.message);
        } else {
            console.log('Service client connected');
            serviceClient.getFeedbackReceiver(receiveFeedback);;
            var message = new Message(message);
            message.ack = 'full';
            message.messageId = "Message ID" + Math.floor(1 + (Math.random() * 150));
            console.log('Sending message: ' + message.getData());
            serviceClient.send(targetDevice, message, (err, res) => {
                if (err) console.log('Send error: ' + err.toString());
                if (res) console.log('Send status: ' + res.constructor.name);
            });
        }
    });
}