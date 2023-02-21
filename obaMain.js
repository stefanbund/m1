/**
CHASER 1.0: integrated data science and trading process, seeking to operate on a thin margin, with fees
with a logic unit. Takes the 1.6 trade process (tranched, logic, tps, dynamic budget), then triggers
trade when we locate a low or positive capitalization momentum, from order book.
oba: writes caps.csv
rc, risk captain: writes analysis.csv, regarding risk component to current order book composition
tradeExecutor.js: reads analysis.csv, every second or so, sets bids based on trade climate, second by second.
**/
const interval = 4; //how often, in seconds, we query for orderbook via coinbse websocket/orderbook
import { initOBA } from "./orderBookAnalysis.js";
var caps = {};
// var rc = require("./riskCaptain.js"); //will keep the array of bid cap momenta
// var trader = require("./tradeExecutor.js");

//get everybody started 1)generating data, then 2) reading eachother's outcomes
//each member of the system reads eachother's periodic output, then asynchronously acts on their evolving decisions

var caps = initOBA(); //causes caps.csv to be written, containing latest caps
// rc.init(); //cycles csv read every 2 seconds, renders an analysis.csv
// trader.init();
