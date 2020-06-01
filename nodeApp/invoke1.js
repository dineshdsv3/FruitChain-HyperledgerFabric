'use strict';

const { FileSystemWallet, Gateway } = require('fabric-network');
const path = require('path');
const util = require('util');

const ccpPath = path.join(__dirname, './ConnectionProfile.yml');

var configFilePath = path.join(__dirname, './ConnectionProfile.yml');

var FabricClient = require('fabric-client');

var fabricClient = new FabricClient();
fabricClient.loadFromConfig(configFilePath);

// var member_user = null;
var connection = fabricClient;

var tx_id = null;
var peers = connection.getPeersForOrg();
// console.log(peers);
var channel = connection.getChannel();

const event_hub = channel.newChannelEventHub(peers);
// console.log(event_hub);

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
			args: ['Fruit3', 'banana', '100', 'DineshDSV'],
			chainId: 'mychannel',
			txId: tx_id,
		};

		// send the transaction proposal to the peers
		return channel.sendTransactionProposal(request);
	})
	.then(async (results) => {
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
			var request = {
				proposalResponses: proposalResponses,
				proposal: proposal,
			};

			var transaction_id_string = tx_id.getTransactionID();
			//Get the transaction ID string to be used by the event processing
			var promises = [];

			var sendPromise = channel.sendTransaction(request);
			promises.push(sendPromise);
			await channel.initialize({ discover: true, asLocalhost: true });

			let txPromise = new Promise((resolve, reject) => {
				let handle = setTimeout(() => {
					event_hub.disconnect();
					resolve({ event_status: 'TIMEOUT' });
					//we could use
					reject(new Error('Trnasaction did not complete within 30 seconds'));
				}, 3000);
				event_hub.connect();
				event_hub.registerTxEvent(
					transaction_id_string,
					(tx, code) => {
						// this is the callback for transaction event status
						// first some clean up of event listener
						clearTimeout(handle);
						event_hub.unregisterTxEvent(transaction_id_string);
						event_hub.disconnect();
						// now let the application know what happened
						var return_status = { event_status: code, tx_id: transaction_id_string };
						if (code !== 'VALID') {
							console.error('The transaction was invalid, code = ' + code);
							resolve(return_status); // we could use reject(new Error('Problem with the tranaction, event status ::'+code));
						} else {
							// console.log(event_hub.ChannelEventHub)
							console.log('The transaction has been committed on peer ' );
							resolve(return_status);
						}
					},
					(err) => {
						//this is the callback if something goes wrong with the event registration or processing
						reject(new Error('There was a problem with the eventhub ::' + err));
					}
				);
			});
			promises.push(txPromise);

			return Promise.all(promises);
		} else {
			console.error('Failed to send Proposal or receive valid response. Response null or status is not 200. exiting...');
			throw new Error('Failed to send Proposal or receive valid response. Response null or status is not 200. exiting...');
		  }
	}).then((results) => {
		console.log('Send transaction promise and event listener promise have completed');
		// check the results in the order the promises were added to the promise all list
		if (results && results[0] && results[0].status === 'SUCCESS') {
		  console.log('Successfully sent transaction to the orderer.');
		} else {
		  console.error('Failed to order the transaction. Error code: ' + response.status);
		}
	  
		if(results && results[1] && results[1].event_status === 'VALID') {
		  console.log('Successfully committed the change to the ledger by the peer');
		} else {
		  console.log('Transaction failed to be committed to the ledger due to ::'+results[1].event_status);
		}
	  }).catch((err) => {
		console.error('Failed to invoke successfully :: ' + err);
	  });

// async function main() {
// 	try {
// 		// Create a new file system based wallet for managing identities.
// 		const walletPath = path.join(process.cwd(), 'wallet');
// 		const wallet = new FileSystemWallet(walletPath);
// 		// console.log(`Wallet path: ${walletPath}`);

// 		// Check to see if we've already enrolled the user.
// 		const userExists = await wallet.exists('user1');
// 		if (!userExists) {
// 			console.log('An identity for the user "user1" does not exist in the wallet');
// 			console.log('Run the registerUser.js application before retrying');
// 			return;
// 		}

// 		tx_id = connection.newTransactionID();
// 		console.log('Assigning transaction_id: ', tx_id._transaction_id);

// 		// Create a new gateway for connecting to our peer node.
// 		const gateway = new Gateway();
// 		await gateway.connect(ccpPath, { wallet, identity: 'user1', discovery: { enabled: true, asLocalhost: true } });

// 		// Get the network (channel) our contract is deployed to.
// 		const network = await gateway.getNetwork('mychannel');

// 		// Get the contract from the network.
// 		const contract = network.getContract('mycc1');
// 		// console.log(contract)
// 		// console.log(network);
// 		// Submit the specified transaction.
// 		// createCar transaction - requires 5 argument, ex: ('createCar', 'CAR12', 'Honda', 'Accord', 'Black', 'Tom')
// 		// changeCarOwner transaction - requires 2 args , ex: ('changeCarOwner', 'CAR10', 'Dave')
// 		// await contract.submitTransaction('createCar', 'CAR12', 'Honda', 'Accord', 'Black', 'Tom');
// 		// console.log('Transaction has been submitted');

// 		// // Disconnect from the gateway.
// 		await gateway.disconnect();
// 	} catch (error) {
// 		console.error(`Failed to submit transaction: ${error}`);
// 		process.exit(1);
// 	}
// }

// main();
