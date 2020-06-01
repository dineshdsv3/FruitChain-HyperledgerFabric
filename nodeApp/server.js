const express = require('express');
const app = express();
const fbclient = require('./fabricClient');
var connection = fbclient;

app.use(express.urlencoded({ extended: true }));

app.use(express.json());

app.get('/', (req, res) => {
	res.send('Hello world');
});

app.post('/createFruit', (req, res) => {
	var data = req.body;
	console.log(data);
	return connection
		.initCredentialStores()
		.then(() => {
			console.log('Successfully logged in');
			return connection.getUserContext('admin', true);
		})
		.then(() => {
			var request = {
				chaincodeId: 'mycc1',
				fcn: 'createFruit',
				args: [data.id, data.name, data.quantity, data.owner],
				txId: connection.newTransactionID(),
				chainId: 'mychannel',
			};
			console.log('Data taken');
			return connection.submitTransaction(request);
		})
		.then((data) => {
			res.send({ message: 'successfully created fruit', data: data });
		})
		.catch((error) => {
			console.log('error is' + error);
			res.status(500).json({ message: 'Error', error: error.message.toString() });
		});
});

app.listen(3000, () => {
	console.log('Server running on port 3000');
});
