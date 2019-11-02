const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const port = 8080;
const index = require("./routes/index");

const staticbasemessage = "Kinderschwimmen 2019\\n \
                          Live Timing\\n \
                          09.11.2019\\n \
                          SG Fürth"

require('dotenv').config();

var connectionString = process.env.AZURE_CONNECT_STRING
var { EventHubClient, EventPosition } = require('@azure/event-hubs');
var lanemessages = []

var headermessage = {
  type: 'header',
  competition: 'not defined',
  distance: '50',
  swimstyle: 'FREE',
  event: '0',
  heat: '0'
};

var start = { type: 'start' };
var laststart = Date.now();
var timestart = Date.now();

var printError = function (err) {
  console.log(err.message);
};

var printMessage = function (message) {

  storeBaseData(message.body)

  try {
    io.sockets.emit("FromAPI", JSON.stringify(message.body));
    console.log("websocket backend send " + JSON.stringify(message.body))
  } catch (error) {
    console.error(`websocket backend Error emit : ${error.code}`);
    console.error(error);
  }
};

var ehClient;

EventHubClient.createFromIotHubConnectionString(connectionString).then(function (client) {
  console.log("Successfully created the EventHub Client from iothub connection string.");
  ehClient = client;
  return ehClient.getPartitionIds();
}).then(function (ids) {
  console.log("The partition ids are: ", ids);
  return ids.map(function (id) {
    return ehClient.receive(id, printMessage, printError, { eventPosition: EventPosition.fromEnqueuedTime(Date.now()) });
  });
}).catch(printError);

const app = express();
app.use(index);
const server = http.createServer(app);
const io = socketIo(server)

/* path 
{
    path: '/ws'
  }); // < Interesting!
*/

io.on("connection", socket => {
  console.log('websocket backend Subscribing to azure');
  //client.subscribe("topic_name");
  sendBaseData(socket)
  socket.on("disconnect", () => console.log("websocket backend Client disconnected"));

  socket.on("error", (error) => {
    console.log(error)
  })
});

server.listen(port, () => console.log(`websocket backend Listening on port ${port}`));


function storeBaseData(message) {
  try {
    var jsonmessage = message
    console.log(jsonmessage.type)
    if (jsonmessage.type == "header") {
      headermessage = jsonmessage

      if (start.type === 'clock' || start.type === 'message') {
        console.log("----------------- reset " + start.type)
        var recallmessage = "{\"type\":\"race\"}"
        start = JSON.parse(recallmessage)
      }
    }

    if (jsonmessage.type == "race") {
      start = jsonmessage
    }

    if (jsonmessage.type == "startlist") {
      start = jsonmessage
    }

    if (jsonmessage.type == "start") {
      laststart = Date.now()
      start = jsonmessage
    }

    if (jsonmessage.type == "stop") {
      start = jsonmessage
    }

    if (jsonmessage.type == "clock") {
      timestart = Date.now()
      start = jsonmessage
    }

    if (jsonmessage.type == "message") {
      timestart = Date.now()
      start = jsonmessage
    }

    if (jsonmessage.type == "clear") {
      console.log("clear lanes")
      lanemessages = []
    }

    if (jsonmessage.type == "lane") {
      var lanenumber = (jsonmessage.lane - 1)
      var number_of_elements_to_remove = 1
      lanemessages.splice(lanenumber, number_of_elements_to_remove, jsonmessage);
    }
  } catch (err) {
    console.log("<app.js> error")
    console.log(err)
  }
}

function sendBaseData(socket) {
  // we need io.sockets.socket();
  try {

    if (headermessage.event === "0") {
      var basemessage = {
        type: 'message',
        value: staticbasemessage,
      }
      var timediff = Date.now() - timestart;
      var newtime = Math.floor((timestart + timediff) / 1000);
      var jsondiff = "{\"time\":\"" + newtime + "\" }"

      var newmessage = { ...basemessage, ...JSON.parse(jsondiff) }
      socket.emit("FromAPI", JSON.stringify(newmessage));
      return;
    } else {

      socket.emit("FromAPI", JSON.stringify(headermessage));

      //console.log("init send " + headermessage.toString())
      for (let lane of lanemessages) {
        socket.emit("FromAPI", JSON.stringify(lane));
      }

      if (start.type === "message" || start.type === "clock") {
        var timediff = Date.now() - timestart;
        var newtime = Math.floor((timestart + timediff) / 1000);
        var jsondiff = "{\"time\":\"" + newtime + "\" }"
        var newmessage = { ...start, ...JSON.parse(jsondiff) }
        socket.emit("FromAPI", JSON.stringify(newmessage));
        console.log("message clock " + start.type)
      } else {
        var timediff = Date.now() - laststart;
        var jsondiff = "{\"diff\":\"" + timediff + "\" }"
        var newmessage = { ...start, ...JSON.parse(jsondiff) }
        socket.emit("FromAPI", JSON.stringify(newmessage));
        console.log("other message " + start.type)
      }
    }

  } catch (error) {
    console.error(`websocket backend Error emit : ${error.code}`);
    console.error(error);
  }

}