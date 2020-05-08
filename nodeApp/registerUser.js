'use strict';
var fs = require('fs');
var path = require('path');

var configFilePath = path.join(__dirname, './ConnectionProfile.yml');
const CONFIG = fs.readFileSync(configFilePath, 'utf8')

var FabricClient = require('fabric-client');
var FabricCAClient = require('fabric-ca-client');


var path = require('path');
var util = require('util');
var os = require('os');


var fabricClient = new FabricClient();
fabricClient.loadFromConfig(configFilePath);


var connection = fabricClient;
var fabricCAClient;
var admin_user = null;
var member_user = null;
var userId = 'user1';


connection.initCredentialStores().then(() => {
  fabricCAClient = connection.getCertificateAuthority();
  return connection.getUserContext('admin', true);
}).then((user_from_store) => {
    if (user_from_store && user_from_store.isEnrolled()) {
        console.log('Successfully loaded admin from persistence');
        admin_user = user_from_store;
    } else {
        throw new Error('Failed to get admin.... run enrollAdmin.js');
    }

    // at this point we should have the admin user
    // first need to register the user with the CA server
    return fabricCAClient.register({enrollmentID: userId, affiliation: 'org1.department1',role: 'client'}, admin_user);
}).then((secret) => {
    // next we need to enroll the user with CA server
    console.log('Successfully registered user1 - secret:'+ secret);

    return fabricCAClient.enroll({enrollmentID: userId, enrollmentSecret: secret});
}).then((enrollment) => {
  console.log(`Successfully enrolled member user - ${userId} `);
  return fabricClient.createUser({
    username: userId,
    mspid: 'Org1MSP',
    cryptoContent: { privateKeyPEM: enrollment.key.toBytes(), signedCertPEM: enrollment.certificate }
  });
}).then((user) => {
     member_user = user;

     return fabricClient.setUserContext(member_user);
}).then(()=>{
     console.log(userId + ' was successfully registered and enrolled and is ready to intreact with the fabric network');

}).catch((err) => {
    console.error('Failed to register: ' + err);
	if(err.toString().indexOf('Authorization') > -1) {
		console.error('Authorization failures may be caused by having admin credentials from a previous CA instance.\n' +
		'Try again after deleting the contents of the store directory '+store_path);
	}
});