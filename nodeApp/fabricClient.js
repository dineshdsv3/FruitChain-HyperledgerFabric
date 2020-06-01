let FabricClient = require("fabric-client");
let path = require("path");
let configFilePath;


configFilePath = path.join(__dirname, "./ConnectionProfile.yml");


class FBClient extends FabricClient {
  constructor(props) {
    super(props);
  }

  submitTransaction(requestData) {
    let returnData = {}; 
    let channel = this.getChannel();
    var peers = connection.getPeersForOrg();
    let eventHub = channel.newChannelEventHub(peers);
    return channel.sendTransactionProposal(requestData).then((results) => {
      let proposalResponses = results[0];
      let proposal = results[1];
      let isProposalGood = false;

      for (let i = proposalResponses.length - 1; i >= 0; i--) {
        console.log(proposalResponses[i].response.payload.toString(), "\n");
      }

      if (proposalResponses && proposalResponses[0].response && proposalResponses[0].response.status === 200) {
        isProposalGood = true;
        console.log("Transaction proposal was good");
      } else {
        console.error("Transaction proposal was bad");
        throw new Error(proposalResponses[0].response.message);
      }
      // returnData = proposalResponses[0].response.payload.toString();
      // returnData = JSON.parse(returnData);

      if (isProposalGood) {
        console.log(
          "Successfully sent Proposal and received ProposalResponse: Status - %s, message - \"%s\"",
          proposalResponses[0].response.status, proposalResponses[0].response.message);

        let request = {
          "proposalResponses": proposalResponses,
          "proposal": proposal
        };

        let transactionIDString = requestData.txId.getTransactionID();
        let promises = [];

        let sendPromise = channel.sendTransaction(request);

        promises.push(sendPromise);

        let txPromise = new Promise((resolve, reject) => {
          let handle = setTimeout(() => {
            eventHub.disconnect();
            resolve({ "event_status": "TIMEOUT" });
          }, 3000000);

          eventHub.connect();

          eventHub.registerTxEvent(transactionIDString, (tx, code) => {
            clearTimeout(handle);
            eventHub.unregisterTxEvent(transactionIDString);
            eventHub.disconnect();

            let return_status = { "event_status": code, "txId": transactionIDString };

            if (code !== "VALID") {
              console.error(`The transaction was invalid, code = ${code}`);
              resolve(return_status);
            } else {
              console.log(`The transaction has been committed on peer`);
              resolve(return_status);
            }
          }, (err) => {
            console.log(err);
            reject(new Error(`There was a problem with the eventhub ::${err}`));
          });
        });

        promises.push(txPromise);

        return Promise.all(promises);
      }
      console.error("Failed to send Proposal or receive valid response. Response null or status is not 200. exiting...");
      throw new Error("Failed to send Proposal or receive valid response. Response null or status is not 200. exiting...");

    }).then((results) => {
      console.log("Send transaction promise and event listener promise have completed");
      if (results && results[0] && results[0].status === "SUCCESS") {
        console.log("Successfully sent transaction to the orderer.");
      } else {
        console.error("Failed to order the transaction. Error code: ");
      }

      if (results && results[1] && results[1].event_status === "VALID") {
        console.log("Successfully committed the change to the ledger by the peer");
      } else {
        console.log(`Transaction failed to be committed to the ledger due to ::${results[1].event_status}`);
      }
    }).then(() => {
      return returnData;
    })
  }

  query(requestData) {
    let channel = this.getChannel();

    return channel.queryByChaincode(requestData).then((response_payloads) => {   
      return response_payloads.toString("utf8"); 
    }).then((responseString) => {
      console.log(responseString)
      var error = this.parseError(responseString);
      if (error) {
        throw new Error(error)
      } else {
        return JSON.parse(responseString.toString("utf8"));
      }
    }).then((resultData) => {
      if (resultData.constructor === Array) {
        resultData = resultData.map((item) => {
          if (item.data) {
            return item.data;
          }
          return item;
        });
      }
      return resultData;
    })
  }

  parseError(errorString) {
    var status = errorString.match(/status:\s([^\n\r]*(?=,))/, '');
    var message = errorString.match(/message:\s([^\n\r]*(?=\)))/, '');
    if (status && message) {
      return JSON.stringify({
        status: status[1],
        message: message[1]
      });
    }

    return null;
  }
}



let fabricClient = new FBClient();

fabricClient.loadFromConfig(configFilePath);
var connection = fabricClient;

var channel = connection.getChannel();

module.exports = fabricClient;