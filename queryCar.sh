#!/bin/bash

# Exit on first error, print all commands.
set -ev
CHAINCODE_NAME="mycc1"
CHAINCODE_SRC="github.com/chaincode"
CHANNEL_NAME="mychannel"

docker exec cli peer chaincode query -C $CHANNEL_NAME -n $CHAINCODE_NAME -c '{"Args":["queryCar", "CAR2"]}'
    