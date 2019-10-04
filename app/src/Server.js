/**
 * Server.js
 * @author Andrew Roberts
 */

import "regenerator-runtime";
import path from "path";
import express from "express";
import SolaceClient from "./SolaceClient";

async function start() {
  // initialize and start solace client
  let solaceClient = SolaceClient();
  try {
    await solaceClient.connectToSolace();
  } catch (err) {
    console.log(err);
  }
  // initialize express server
  let server = express();
  server.use(express.static(path.join(__dirname + "/client")));
  server.get("/", function(req, res) {
    res.sendFile(path.join(__dirname + "/index.html"));
  });
  // start the express server
  server.listen(3001, "0.0.0.0");
}

start();
