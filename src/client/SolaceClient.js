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
// Initialize factory with the most recent API defaults
var factoryProps = new solace.SolclientFactoryProperties();
factoryProps.profile = solace.SolclientFactoryProfiles.version10;
solace.SolclientFactory.init(factoryProps);
// enable logging to JavaScript console at WARN level
// NOTICE: works only with "solclientjs-debug.js"
solace.SolclientFactory.setLogLevel(solace.LogLevel.WARN);

var SolaceClient = function() {
  var solaceclient = {};
  solaceclient.session = null;
  solaceclient.subscriptions = {};
  solaceclient.topicName = "T/a";

  // Loggers — DRY is dead and you can't tell me otherwise
  solaceclient.log = function(line) {
    var now = new Date();
    var time = [
      ("0" + now.getHours()).slice(-2),
      ("0" + now.getMinutes()).slice(-2),
      ("0" + now.getSeconds()).slice(-2)
    ];
    var timestamp = "[" + time.join(":") + "] ";
    console.log(timestamp + line);
    var logTextArea = document.getElementById("log");
    logTextArea.value += timestamp + line + "\n";
    logTextArea.scrollTop = logTextArea.scrollHeight;
  };

  solaceclient.logRequest = function(line) {
    var now = new Date();
    var time = [
      ("0" + now.getHours()).slice(-2),
      ("0" + now.getMinutes()).slice(-2),
      ("0" + now.getSeconds()).slice(-2)
    ];
    var timestamp = "[" + time.join(":") + "] ";
    console.log(timestamp + line);
    var logTextArea = document.getElementById("log-requestor");
    logTextArea.value += timestamp + line + "\n";
    logTextArea.scrollTop = logTextArea.scrollHeight;
  };

  solaceclient.logReply = function(line) {
    var now = new Date();
    var time = [
      ("0" + now.getHours()).slice(-2),
      ("0" + now.getMinutes()).slice(-2),
      ("0" + now.getSeconds()).slice(-2)
    ];
    var timestamp = "[" + time.join(":") + "] ";
    console.log(timestamp + line);
    var logTextArea = document.getElementById("log-replier");
    logTextArea.value += timestamp + line + "\n";
    logTextArea.scrollTop = logTextArea.scrollHeight;
  };

  solaceclient.connect = function() {
    return new Promise((resolve, reject) => {
      // create session
      try {
        solaceclient.log(
          "Attempting to connect to the Solace router using the following connection parameters..."
        );
        console.dir({
          // solace.SessionProperties
          url: document.getElementById("hosturl").value,
          vpnName: document.getElementById("message-vpn").value,
          userName: document.getElementById("username").value,
          password: document.getElementById("password").value
        });
        solaceclient.session = solace.SolclientFactory.createSession({
          // solace.SessionProperties
          url: document.getElementById("hosturl").value,
          vpnName: document.getElementById("message-vpn").value,
          userName: document.getElementById("username").value,
          password: document.getElementById("password").value
        });
        solaceclient.session.connect();
      } catch (error) {
        solaceclient.log(error.toString());
      }

      solaceclient.session.on(solace.SessionEventCode.UP_NOTICE, function(
        sessionEvent
      ) {
        solaceclient.log(
          "Successfully connected using an externally exposed NodePort!"
        );
      });
      solaceclient.session.on(
        solace.SessionEventCode.CONNECT_FAILED_ERROR,
        function(sessionEvent) {
          solaceclient.log(
            "Connection failed to the message router: " +
              sessionEvent.infoStr +
              " - check correct parameter values and connectivity!"
          );
        }
      );
      solaceclient.session.on(solace.SessionEventCode.DISCONNECTED, function(
        sessionEvent
      ) {
        solaceclient.log("Disconnected.");
        solaceclient.subscribed = false;
        if (solaceclient.session !== null) {
          solaceclient.session.dispose();
          solaceclient.session = null;
        }
      });
      solaceclient.session.on(
        solace.SessionEventCode.SUBSCRIPTION_ERROR,
        function(sessionEvent) {
          solaceclient.logReply(
            "Cannot subscribe to topic: " + sessionEvent.correlationKey
          );
        }
      );
      solaceclient.session.on(solace.SessionEventCode.SUBSCRIPTION_OK, function(
        sessionEvent
      ) {
        if (solaceclient.subscribed) {
          solaceclient.subscribed = false;
          solaceclient.logReply(
            "Successfully unsubscribed from request topic: " +
              sessionEvent.correlationKey
          );
        } else {
          solaceclient.subscribed = true;
          solaceclient.logReply(
            "Successfully subscribed to request topic: " +
              sessionEvent.correlationKey
          );
          solaceclient.logReply("=== Ready to receive requests. ===");
        }
      });
      // define message event listener
      solaceclient.session.on(solace.SessionEventCode.MESSAGE, function(
        message
      ) {
        try {
          solaceclient.reply(message);
        } catch (error) {
          solaceclient.log(error.toString());
        }
      });
    });
  };

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

  // sends one request
  solaceclient.request = function() {
    if (solaceclient.session !== null) {
      var requestText = "Sample Request";
      var request = solace.SolclientFactory.createMessage();
      solaceclient.logRequest(
        'Sending request "' +
          requestText +
          '" to topic "' +
          solaceclient.topicName +
          '"...'
      );
      request.setDestination(
        solace.SolclientFactory.createTopicDestination(solaceclient.topicName)
      );
      request.setSdtContainer(
        solace.SDTField.create(solace.SDTFieldType.STRING, requestText)
      );
      request.setDeliveryMode(solace.MessageDeliveryModeType.DIRECT);
      try {
        solaceclient.session.sendRequest(
          request,
          5000, // 5 seconds timeout for this operation
          function(session, message) {
            solaceclient.replyReceivedCb(session, message);
          },
          function(session, event) {
            solaceclient.requestFailedCb(session, event);
          },
          null // not providing correlation object
        );
      } catch (error) {
        solaceclient.logRequest(error.toString());
      }
    } else {
      solaceclient.logRequest(
        "Cannot send request because not connected to Solace message router."
      );
    }
  };

  // Callback for replies
  solaceclient.replyReceivedCb = function(session, message) {
    solaceclient.logRequest(
      'Received reply: "' +
        message.getSdtContainer().getValue() +
        '"' +
        " details:\n" +
        message.dump()
    );
  };

  // Callback for request failures
  solaceclient.requestFailedCb = function(session, event) {
    solaceclient.logRequest("Request failure: " + event.toString());
  };

  // Subscribes to request topic on Solace message router
  solaceclient.subscribe = function() {
    if (solaceclient.session !== null) {
      if (solaceclient.subscribed) {
        solaceclient.logReply(
          'Already subscribed to "' +
            solaceclient.topicName +
            '" and ready to receive messages.'
        );
      } else {
        solaceclient.logReply(
          "Subscribing to topic: " + solaceclient.topicName
        );
        try {
          solaceclient.session.subscribe(
            solace.SolclientFactory.createTopicDestination(
              solaceclient.topicName
            ),
            true, // generate confirmation when subscription is added successfully
            solaceclient.topicName, // use topic name as correlation key
            10000 // 10 seconds timeout for this operation
          );
        } catch (error) {
          solaceclient.logReply(error.toString());
        }
      }
    } else {
      solaceclient.logReply(
        "Cannot subscribe because not connected to Solace message router."
      );
    }
  };

  // Unsubscribes from request topic on Solace message router
  solaceclient.unsubscribe = function() {
    if (solaceclient.session !== null) {
      if (solaceclient.subscribed) {
        solaceclient.logReply(
          "Unsubscribing from topic: " + solaceclient.topicName
        );
        try {
          solaceclient.session.unsubscribe(
            solace.SolclientFactory.createTopicDestination(
              solaceclient.topicName
            ),
            true, // generate confirmation when subscription is removed successfully
            solaceclient.topicName, // use topic name as correlation key
            10000 // 10 seconds timeout for this operation
          );
        } catch (error) {
          solaceclient.logReply(error.toString());
        }
      } else {
        solaceclient.logReply(
          'Cannot unsubscribe because not subscribed to the topic "' +
            solaceclient.topicName +
            '"'
        );
      }
    } else {
      solaceclient.logReply(
        "Cannot unsubscribe because not connected to Solace message router."
      );
    }
  };

  solaceclient.reply = function(message) {
    solaceclient.logReply(
      'Received message: "' +
        message.getSdtContainer().getValue() +
        '", details:\n' +
        message.dump()
    );
    solaceclient.logReply("Replying...");
    if (solaceclient.session !== null) {
      var reply = solace.SolclientFactory.createMessage();
      var sdtContainer = message.getSdtContainer();
      if (sdtContainer.getType() === solace.SDTFieldType.STRING) {
        var replyText =
          message.getSdtContainer().getValue() + " - Sample Reply";
        reply.setSdtContainer(
          solace.SDTField.create(solace.SDTFieldType.STRING, replyText)
        );
        solaceclient.session.sendReply(message, reply);
        solaceclient.logReply("Replied.");
      }
    } else {
      solaceclient.logReply(
        "Cannot reply: not connected to Solace message router."
      );
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
};
