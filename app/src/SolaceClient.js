/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

/**
 * Solace Web Messaging API for JavaScript
 * Publish/Subscribe tutorial - Topic Subscriber
 * Demonstrates subscribing to a topic for direct messages and receiving messages
 */

/*jslint es6 browser devel:true*/
/*global solace*/
import solace from "solclientjs";

// Initialize factory with the most recent API defaults
var factoryProps = new solace.SolclientFactoryProperties();
factoryProps.profile = solace.SolclientFactoryProfiles.version10;
solace.SolclientFactory.init(factoryProps);
// enable logging to JavaScript console at WARN level
// NOTICE: works only with "solclientjs-debug.js"
solace.SolclientFactory.setLogLevel(solace.LogLevel.WARN);

function SolaceClient() {
  var solaceclient = {};
  solaceclient.connectionParams = {
    url: `ws://${process.env.SOLACE_CLUSTERIP_SVC_HOSTNAME}:${process.env.SOLACE_SMFWEB_PORT}`,
    vpnName: process.env.SOLACE_VPN,
    userName: process.env.SOLACE_USERNAME,
    password: process.env.SOLACE_PASSWORD
  };
  solaceclient.session = null;
  solaceclient.subscriptions = {};

  // Logger
  solaceclient.log = function(line) {
    var now = new Date();
    var time = [
      ("0" + now.getHours()).slice(-2),
      ("0" + now.getMinutes()).slice(-2),
      ("0" + now.getSeconds()).slice(-2)
    ];
    var timestamp = "[" + time.join(":") + "] ";
    console.log(`${timestamp} ${line}`);
  };

  solaceclient.connect = function() {
    return new Promise((resolve, reject) => {
      // create session
      try {
        solaceclient.log(
          "Attempting to connect to the Solace router using the following connection parameters..."
        );
        console.dir(solaceclient.connectionParams);
        solaceclient.session = solace.SolclientFactory.createSession(
          solaceclient.connectionParams
        );
        solaceclient.session.connect();
      } catch (error) {
        solaceclient.log(error.toString());
      }
      // define session event listeners
      solaceclient.session.on(solace.SessionEventCode.UP_NOTICE, function(
        sessionEvent
      ) {
        solaceclient.log(
          "Successfully connected to the Solace router using the internal ClusterIP service!"
        );
        resolve();
      });
      solaceclient.session.on(
        solace.SessionEventCode.CONNECT_FAILED_ERROR,
        function(sessionEvent) {
          solaceclient.log(
            "Connection failed to the message router: " +
              sessionEvent.infoStr +
              " - check correct parameter values and connectivity!"
          );
          reject(sessionEvent.infoStr);
        }
      );
      solaceclient.session.on(solace.SessionEventCode.DISCONNECTED, function(
        sessionEvent
      ) {
        solaceclient.log("Disconnected.");
        solaceclient.subscriptions = {};
        if (solaceclient.session !== null) {
          solaceclient.session.dispose();
          solaceclient.session = null;
        }
      });
      solaceclient.session.on(
        solace.SessionEventCode.SUBSCRIPTION_ERROR,
        function(sessionEvent) {
          solaceclient.log(
            "Cannot subscribe to topic: " + sessionEvent.correlationKey
          );
        }
      );
      solaceclient.session.on(solace.SessionEventCode.SUBSCRIPTION_OK, function(
        sessionEvent
      ) {
        if (solaceclient.subscriptions[sessionEvent.correlationKey]) {
          solaceclient.subscriptions[sessionEvent.correlationKey] = false;
          solaceclient.log(
            "Successfully unsubscribed from topic: " +
              sessionEvent.correlationKey
          );
        } else {
          solaceclient.subscriptions[sessionEvent.correlationKey] = true;
          solaceclient.log(
            "Successfully subscribed to topic: " + sessionEvent.correlationKey
          );
        }
      });
      // define message event listener
      solaceclient.session.on(solace.SessionEventCode.MESSAGE, function(
        message
      ) {
        solaceclient.subscriberCallback(message.getBinaryAttachment());
      });
    });
  };

  // Actually connects the session triggered when the iframe has been loaded - see in html code
  solaceclient.connectToSolace = async function() {
    return new Promise(async (resolve, reject) => {
      try {
        await solaceclient.connect();
        resolve();
      } catch (error) {
        solaceclient.log(error.toString());
        reject();
      }
    });
  };

  // Subscribes to topic on Solace message router
  solaceclient.subscribe = function(topicName) {
    if (solaceclient.session !== null) {
      if (solaceclient.subscriptions[topicName]) {
        solaceclient.log(
          'Already subscribed to "' +
            topicName +
            '" and ready to receive messages.'
        );
      } else {
        solaceclient.log("Subscribing to topic: " + topicName);
        try {
          solaceclient.session.subscribe(
            solace.SolclientFactory.createTopicDestination(topicName),
            true, // generate confirmation when subscription is added successfully
            topicName, // use topic name as correlation key
            10000 // 10 seconds timeout for this operation
          );
        } catch (error) {
          solaceclient.log(error.toString());
        }
      }
    } else {
      solaceclient.log(
        "Cannot subscribe because not connected to Solace message router."
      );
    }
  };

  // Unsubscribes from topic on Solace message router
  solaceclient.unsubscribe = function(topicName) {
    if (solaceclient.session !== null) {
      if (solaceclient.subscriptions[topicName]) {
        solaceclient.log("Unsubscribing from topic: " + topicName);
        try {
          solaceclient.session.unsubscribe(
            solace.SolclientFactory.createTopicDestination(topicName),
            true, // generate confirmation when subscription is removed successfully
            topicName, // use topic name as correlation key
            10000 // 10 seconds timeout for this operation
          );
        } catch (error) {
          solaceclient.log(error.toString());
        }
      } else {
        solaceclient.log(
          'Cannot unsubscribe because not subscribed to the topic "' +
            topicName +
            '"'
        );
      }
    } else {
      solaceclient.log(
        "Cannot unsubscribe because not connected to Solace message router."
      );
    }
  };

  solaceclient.publish = function(topic, payload) {
    if (solaceclient.session !== null) {
      var message = solace.SolclientFactory.createMessage();
      message.setDestination(
        solace.SolclientFactory.createTopicDestination(topic)
      );
      message.setBinaryAttachment(payload);
      message.setDeliveryMode(solace.MessageDeliveryModeType.DIRECT);
      // solaceclient.log(
      //   'Publishing message "' + payload + '" to topic "' + topic + '"...'
      // );
      try {
        solaceclient.session.send(message);
        //solaceclient.log("Message published.");
      } catch (error) {
        solaceclient.log(error.toString());
      }
    } else {
      // solaceclient.log(
      //   "Cannot publish because not connected to Solace message router."
      // );
    }
  };

  // Gracefully disconnects from Solace message router
  solaceclient.disconnect = function() {
    solaceclient.log("Disconnecting from Solace message router...");
    if (solaceclient.session !== null) {
      try {
        solaceclient.session.disconnect();
      } catch (error) {
        solaceclient.log(error.toString());
      }
    } else {
      solaceclient.log("Not connected to Solace message router.");
    }
  };

  return solaceclient;
}

export default SolaceClient;
