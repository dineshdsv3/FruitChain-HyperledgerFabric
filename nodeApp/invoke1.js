'use strict';

const { FileSystemWallet, Gateway } = require('fabric-network');
const path = require('path');
var util = require('util');

const ccpPath = path.join(__dirname, './ConnectionProfile.yml');

var FabricClient = require('fabric-client');

var fabricClient = new FabricClient();
fabricClient.loadFromConfig(ccpPath);

var connection = fabricClient;

var tx_id = null;
var peers = connection.getPeersForOrg();

var channel = connection.getChannel();

connection
	.initCredentialStores()
	.then(() => {
		// fabricCAClient = connection.getCertificateAuthority();
		return connection.getUserContext('admin', true);
	})
	.then((user_from_store) => {
		if (user_from_store && user_from_store.isEnrolled()) {
			console.log('Successfully loaded user1 from persistence');
			// member_user = user_from_store;
		} else {
			throw new Error('Failed to get user1.... run registerUser.js');
		}

		// get a transaction id object based on the current user assigned to fabric client
		tx_id = connection.newTransactionID();
		console.log('Assigning transaction_id: ', tx_id._transaction_id);

		// createCar chaincode function - requires 5 args, ex: args: ['CAR12', 'Honda', 'Accord', 'Black', 'Tom'],
		// changeCarOwner chaincode function - requires 2 args , ex: args: ['CAR10', 'Dave'],
		// must send the proposal to endorsing peers
		var request = {
			//targets: let default to the peer assigned to the client
			chaincodeId: 'mycc1',
			fcn: 'createFruit',
			args: ['Fruit333', 'orange', '100', 'DineshDSV'],
			chainId: 'mychannel',
			txId: tx_id,
		};

		// send the transaction proposal to the peers
		return channel.sendTransactionProposal(request);
	})
	.then((results) => {
		var proposalResponses = results[0];
		var proposal = results[1];
		let isProposalGood = false;
		if (proposalResponses && proposalResponses[0].response && proposalResponses[0].response.status === 200) {
			isProposalGood = true;
			console.log('Transaction proposal was good');
		} else {
			console.error('Transaction proposal was bad');
		}
		if (isProposalGood) {
			console.log(
				util.format(
					'Successfully sent Proposal and received ProposalResponse: Status - %s, message - "%s"',
					proposalResponses[0].response.status,
					proposalResponses[0].response.message
				)
			);

			// build up the request for the orderer to have the transaction committed
			// var request = {
			// 	proposalResponses: proposalResponses,
			// 	proposal: proposal,
			// };

			// set the transaction listener and set a timeout of 30 sec
			// if the transaction did not get committed within the timeout period,
			// report a TIMEOUT status
			var transaction_id_string = tx_id.getTransactionID();
			//Get the transaction ID string to be used by the event processing
			// var promises = [];

			// var sendPromise = channel.sendTransaction(request);
			// promises.push(sendPromise);
		}
	});
