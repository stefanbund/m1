/**2022: data science applications
 * june 6: predictabiilty of recommendations begun. exits[] added, top, then histogram used to return recs
 * july 25: write match data to csv
 */
//2.0 jan 2020, submitting total ask cap and bid cap into histo, to store, and signal safe to trade. trigger histo now
// sends in these two new parameters, in addition to mp and relavant arrays, and time to histoExperiment1, which will operate
// as somewhat of a simulator, analysing 24 hours of trade data to determine when a correct choice yielded profit

//1.0: starter version, writes safeToTrade to a file, for trader to read
// mus assemble capitalizations for bid and ask side of a market, given a percentile depth to measure
// 5% or 10% is a sample depth of price value, on either side of the mid point
//takes the snapshot directly from the exchange and returns capitalzations
//compareModeWalls gives return output, bid and ask capitalizations, within your given range, pctRange
//1.1 writes relevant Bids and Asks to file, for histogram to consume, csv write, changed cmChaser 
//import { writeMatches } from './matchesWriter.cjs';
import matchesWriter from './matchesWriter.cjs';
import capsWriter from './capsWriter.cjs';//write capitalization facts, bid cap, ask cap, bid and ask volume, time, mp
//let d3 = require("d3-array");
import d3 from 'd3-array' ;
let minBidder = [];//captyures min bid value
let minBid = 0.0; //the minimum value of bid offers in the relevant Bids array
var bidAskCaps = {}; //return for chaser and integration with gladiator version 1.6; they need a cap number for bids and asks
var exits = []; //compiled after each use of histogram, contains mp, timestamp epoch, entry, exit, used to gauge predictability
let obj = {};//used to store time, as a global across the app
//import { PublicClient } from 'coinbase-pro';
//import {initWith, ro} from './histogram.cjs';
import histogram from './histogram.cjs';
const {initWith, ro} = histogram;
//const {initWith} = pp;
import pkg from 'coinbase-pro';
const { PublicClient } = pkg;
const publicClient = new PublicClient();
const pair = 'AVAX-USD';
var currentAsks = []; //all bid values, without separation
var currentBids = []; //all ask  values, without separation
const pctRange = .0036; //prior setting, jan/dec .0037; //string representation of the values within 25% of mid point we collect/analyze herein
import Gdax from 'coinbase-pro'; //changed aug 13 from gdax, which is dep, and will not install via npm and work
var diff; //the metric we will pass to the graph
var midPointPriceForRecords = 0.0; //what we'll save as the current price, or mid point of order book
var currencyPairs = []; //init via initCurrencyPairs()
var totalBidCap = 0.0;
var totalAskCap = 0.0;
var totalBidVolume = 0.0;
var totalAskVolume = 0.0;
// var currentAsks = [];//all bid values, without separation
// var currentBids = [];//all ask  values, without separation
import { mode, sum } from "stats-lite"; //stats lite npm, https://www.npmjs.com/package/stats-lite
var preBidWall, preSellWall = 0.0; //value of orders leading up to bid or sell wall area , calc'd in analyzeRangedArray
var askMode, bidMode = 0.0; //sell wall and buy wall, respectively (most occuring value within each array)
var askSBV, bidSBV = 0.0; // sum biv value, sum ask value under the bid or sell walls (capitalization whale must buy to trigger the wall)........DEP 11-26
var bidWall = 0; //on 201, to help zero it out between uses / runs
var sumUnderBidWall = 0.0; //gets reused in the 200's
var getInterval; //do interval
var currentPair = ""; //currency pair we are currently analyzing, coinbase USD set
//import { S3 } from 'aws-sdk';
import pkg2 from 'aws-sdk';
import { exists } from 'fs';
import { exit } from 'process';
//import { initWith } from './histogram.cjs';
const { S3 } = pkg2;
var s3 = new S3(); //for s3 upload
var probableDirection = ""; //which way the market will turn, bull or bear, depending on the compared values, bidMode(down) vs askMode (up)
//import cm from './cmChaser.js';

export const csvBids = []; //what to access to get relevant bids and asks, for histogram
export const csvAsks = [];

function writeRelevantArraysToCSV(relevantBids, relevantAsks)
{
  // csvBids = [];
  // csvAsks = [];
  for (var i = 0; i < relevantBids.length; i++)
  {
    let bo = {};
    bo.price = relevantBids[i][0];
    bo.qty = relevantBids[i][1];
    csvBids.push(bo);
  }

  for (var y = 0; y < relevantAsks.length; y++)
  {
    let ao = {};
    ao.price = relevantAsks[y][0];
    ao.qty = relevantAsks[y][1];
    csvAsks.push(ao);
  }
  //cm.writeRelevantArraysToCSV(exports.csvBids, exports.csvAsks);
  triggerHisto();
}


//caps won't get shared with exports for now, the risk captain needs the csv digest to calc momentum, etc
export function getCaps () //used to prove the output of oba, then used in production to write caps to csv
{
  //console.log("OBA: exports.getCaps: " + bidAskCaps.bidCap + ", " + bidAskCaps.askCap);
  //return bidAskCaps; //see it? if you are proving output via console.log in main, used in testing
  var oa = [];
  oa.push(bidAskCaps);
  //cm.writeCapsToCSV(oa);
}
export function initOBA () //classical bid / ask cap measurement, within the range
{
  let delay2 = 3000; //
  let timer2 = setInterval(function request()
  {
    //var intake = obaIntake(); //do this every two seconds?
    publicClient.getProductOrderBook(
      pair, { level: 3 },
      (error, response, book) =>
      {
        /* ... */
        //console.log("response: " + response);
        //console.log("80, err: " + error);
        if (book)
        {
          //console.log("book: " + book);
          mapBook(book);
        }
      }
    );
  }, delay2);

  function mapBook(book)
  { //iterate into the tens/thousands of entries, pair is currency pair, for final output
    //console.log("mapBook....");
    //const map = new Map(Object.entries(book.bids)); //gives you nice bracketed bids and asks
    //console.log("MAPPED: "  + map);
    //console.log("MAP BOOK: book contents: " + book.bids);//works, huge unordered dump, unlike the map
    var bids = [];
    book.bids.forEach(function (item, index, array)
    {
      bids.push(item);
    });
    currentBids = bids;
    var asks = [];
    book.asks.forEach(function (i, index, array)
    {
      asks.push(i);
    });
    currentAsks = asks;
    sumBidVolume(bids); //GOOD
    sumAskVolume(asks); //GOOD
    totalBidsinUSD(bids);
    totalAsksinUSD(asks);
    getPctUpDown(bids, asks, pctRange); //for experiment 1 --
    //reportFundamentals();//SUCCESSFUL, WILL SHOW ALL MAJOR MARKET STATS
  } //https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map

  function totalBidsinUSD(bids)
  {
    var bidCap = 0.0; //will mutiply each item by amt * bid price
    bids.forEach(function (item)
    {
      var thisCap = parseFloat(item[0]) * parseFloat(item[1]);
      bidCap = bidCap + thisCap;
    });
    //console.log("total bid capitalization, $" + bidCap.toFixed(2));
    totalBidCap = bidCap.toFixed(2);
  }

  function totalAsksinUSD(asks)
  {
    var askCap = 0.0;
    asks.forEach(function (item)
    {
      var thisC = parseFloat(item[0]) * parseFloat(item[1]);
      askCap = askCap + thisC;
    });
    //console.log("total ask capitalization, $" + askCap.toFixed(2));
    totalAskCap = askCap.toFixed(2);
  }

  function sumBidVolume(bids)
  { //SUM OF ALL ORDERS TO ...
    var sumBids = 0.0; //for starters
    bids.forEach(function (item)
    { //var result = parseFloat('2.3') + parseFloat('2.4');
      //alert(result.toFixed(2));
      sumBids = parseFloat(item[1]) + parseFloat(sumBids);
    });
    //console.log("sum of bids is " + sumBids.toFixed(2) + " " + pair);
    totalBidVolume = sumBids.toFixed(2);
  }

  function sumAskVolume(asks)
  { //SUM OF ALL ORDERS TO ...
    var sumAsks = 0.0; //for starters
    asks.forEach(function (item)
    { //var result = parseFloat('2.3') + parseFloat('2.4');
      //alert(result.toFixed(2));
      sumAsks = parseFloat(item[1]) + parseFloat(sumAsks);
    });
    //console.log("sum of asks is " + sumAsks.toFixed(2) + " " + pair);
    totalAskVolume = sumAsks.toFixed(2);
  }

  function getPctUpDown(bids, asks, pct)
  { //DETERMINES RANGE 25% ABOVE AND BELOW MID POINT PRICE
    //console.log("OBA getPctUpDown....");

    // console.log(bids[0][0]); //whoah, multidimensional! first term of first row of array
    // console.log(asks[0][0]);
    var tfbid = bids[0][0] - (bids[0][0] * pct);
    var tfask = (asks[0][0] * pct) + parseFloat(asks[0][0]); //should get us our 25% range value
    //var tfask = askinc + asks[0][0];
    // console.log("OBA bid 5 pct = " + tfbid); //works
    // console.log("OBA ask 5% = " + tfask); //works
    searchOrderBookWithinRanges(tfbid, tfask, currentAsks, currentBids);
  }

  //1. create a provisional array to house all bids within the 25% limit, assign to global bid filtered array
  //console.log("length of ask and bid arrays: " + currentAsks.length + ", " + currentBids.length); //ok
  //2. creater a provisional array to house all bids within the 25% limit, assign to global ask filtered array
  var relevantAsks = [];
  var relevantBids = [];
  //locates bids and ask orders within the range we seek, delivers relevantBids and relevantAsks, within range
  function searchOrderBookWithinRanges(tfbid, tfask, currentAsks, currentBids)
  {
    // console.log("OBA searchOrderBookWithinRanges....");

    for (var i = 0; i < currentAsks.length; i++)
    {
      midPointPriceForRecords = parseFloat(currentAsks[0][0]); //first price at top of stack
      if (currentAsks[i][0] <= tfask)
      {
        //console.log("102: ask within margin, $%s", tfask + ", %s", currentAsks[i]);
        relevantAsks.push(currentAsks[i]); //lines up all asks within 25% of mid point price
      }
    }

    for (var i = 0; i < currentBids.length; i++)
    {
      //console.log("#" + i + " value to analyze: " + currentBids[i][0]);//chokes on the end of the order book, 0.01
      if (parseFloat(currentBids[i][0]) >= tfbid && parseFloat(currentBids[i][0]) > 0.0)
      {
        relevantBids.push(currentBids[i]);
      }
    }

    //console.log("number of bids within 25% drop from currengithub coinbase-prot price " + relevantBids.length); //ok, shows this is ready to parse/sort
    //analyzeRangedAskArrays(relevantAsks);
    // analyzeRangedArray(relevantBids, "bids"); //bids only
    // analyzeRangedArray(relevantAsks, "asks"); //asks only
    //writeRelevantArraysToCSV(relevantBids, relevantAsks); //for histogram, added in version 1.1
    triggerHisto(); //done as alternative to writeRelevantArraysToCsv
  }

  //var histo = require("./histogram.cjs");
  //var he = require("./histoExperiment1.js");//for testing, data sci pre finish to recommendation

  function triggerHisto()
  {
    //console.log("midpoint from oba is : " + midPointPriceForRecords);
    let dt = new Date();
  obj.day = dt.toDateString(); //reabable date, day/year
  //obj.time = dt.toLocaleString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true });
  obj.time = Date.now();
  for(let i = 0; i< relevantBids.length; i++)
  {
    // let ob = {};
    // ob.price = relevantBids[i][0]; //previously was results1
    minBidder.push(parseFloat(relevantBids[i][0]));
  }

let capsArr = []; //push to csv
let co = {}; //caps object
co.minBid = d3.min(minBidder);
console.log(`OBA: min bid is ${co.minBid}`);
// let capsArr = []; //push to csv
// let co = {}; //caps object
co.bc = totalBidCap;
co.ac = totalAskCap;
co.tbv = totalBidVolume;
co.tav = totalAskVolume;
co.time = obj.time;
co.mp = midPointPriceForRecords;
capsArr.push(co);//most recent matched element. 
capsWriter.writeMatches(capsArr);

  histogram.initWith(relevantBids, relevantAsks, midPointPriceForRecords, totalBidCap, totalAskCap, pctRange, obj.day, obj.time); //woulda sent to csv, but going shared mem to histo utility
  console.log(`REC,${midPointPriceForRecords},${histogram.ro.entry},${histogram.ro.exit}`);//NOHUP
  let rec = {};//the recommendation passed via histogram exports, then additional data added to it
  rec.entry = histogram.ro.entry; 
  rec.exit = histogram.ro.exit;
  rec.time = obj.time; //timestamped recommendation, with mp, works as an identifier/unique, as well as time of rec
  rec.mp = midPointPriceForRecords;
  rec.bidCap = totalBidCap;
  rec.askCap = totalAskCap;  
  rec.exitReached = false; //when this exit is reached, it turns true, to prevent inordinate searching below
  rec.entryReached = false; //when the entry price is reached, trade iniitated
  rec.entryReachTime = 0; //timestamped entry time
  rec.exitReachTime = 0; //helps measure time to fulfillment 
  exits.push(rec);
    relevantAsks.length = 0;
    relevantBids.length = 0; //for version 3 histogram.js
    gaugePredictability(rec);
  }

  //compare the current recommendation to the near term history of recommendations and study:
  //1. did a prior exit recommendation come true, in the current price mid point?
  //2. if (1), then how recently? 
  //assume that faster recommendations equate to more predictable markets
  //also assume a three hour window of success is permitted
  function gaugePredictability(rec)
  {
    for(let i = exits.length -1; i > 0 ; i--) //walk backward, entry by entry -- how far back was this mp predicted?
    {
      let d = 0; //an integer representing the index difference between now and when an exit was predicted
      //take the current mp, if the mp has reached or exceeded a prior (unreached) exit, call it reached, 
      if(exits[i].entry == midPointPriceForRecords )//|| exits[i].exit < rec.mp )
      {
        if(exits[i].entryReached == false)
        {
          if(exits[i].exitReachTime ==0)//sometimes the entry happens after the exit, can't let it match
          {
            //console.log(`entry reached for trade id ${exits[i].time}`);//match test type, exit price, distance, bid cap, ask cap
            exits[i].entryReached = true; //it has been dealt with, dont' reconsider this recommendation
            exits[i].entryReachTime = Date.now();
          }
        }
      }
      //take the current mp, if the mp has reached or exceeded a prior (unreached) exit, call it reached, 
      if(midPointPriceForRecords >= exits[i].exit )//|| exits[i].exit < rec.mp )
      {
        if(exits[i].entryReached == true)
        {
          if(exits[i].exitReached == false)
          {
            d = exits.length - i; //i is when the match was reached, now is length of array
            /**MATCH struct: NOHUP
             * match id, 
             * rec exit price, 
             * distance vector, 
             * bid cap, 
             * ask cap, 
             * recommendation id/timestamp **/
            exits[i].exitReached = true; //it has been dealt with, dont' reconsider this recommendation
            exits[i].exitReachTime = Date.now(); 
            let matchesArr = [];
            let mo = {}; //populate array with matcch object, mo
            mo.time = obj.time;
            mo.exit = rec.exit; 
            mo.distance = d; 
            mo.bidCap = rec.bidCap; 
            mo.askCap = rec.askCap; 
            mo.exitTime = exits[i].exitReachTime - exits[i].entryReachTime;
            mo.entryReachTime = exits[i].entryReachTime;
            mo.exitReachTime = exits[i].exitReachTime;
            mo.mp = midPointPriceForRecords; //mid point, critical to correlate to caps
        matchesArr.push(mo);//most recent matched element. 
        matchesWriter.writeMatches(matchesArr);
console.log(`'match',${obj.time},${rec.exit},${d},${rec.bidCap},${rec.askCap},${exits[i].time},${exits[i].entryReachTime},${exits[i].exitReachTime}`);//match test type, exit price, distance, bid cap, ask cap

          }
        }
      }
      //how much distance between this exit and the mp which recommended it? 
    }
    if(exit.length > 3600000)
    {
      console.log(`exit array length is ${exit.length}`);
      //eliminate array item at 0, or top of the array, one at a time, per added item at this length 
    }
  }

  //will take apart any array of orders and discover mean, mode, standard dev using npm simple stats
  function analyzeRangedArray(relevantBids, type)
  { //relevantBids is a global var, is that used here instead of the parameter?
    //how much is bid capitalized?
    //console.log("OBA analyzeRangedArray....");
    //console.log("192" + Object.entries(relevantBids));
    // for(var i=0; i <relevantBids.length; i++) //DISCOVER FORMAT OF BIDS ARRAY
    // {
    //   console.log(relevantBids[i][0] , relevantBids[i][1]); //why does this always add the top element?
    //   //bidCap = bidCap + tc;
    // }
    var bidCap = 0.0;
    // relevantBids.forEach(function(item){
    //   var tc = parseFloat(item[0]) * parseFloat(item[1]);
    //   bidCap = bidCap + tc;
    // });
    for (var i = 0; i < relevantBids.length; i++)
    {
      var tc = parseFloat(relevantBids[i][0] * parseFloat(relevantBids[i][1])); //why does this always add the top element?
      bidCap = bidCap + tc;
    }

    //search for mean, bids
    var sbv = 0.0; //sum bid value
    for (var i = 0; i < relevantBids.length; i++)
    {
      //console.log("bid value is $" + relevantBids[i][0] + ", with sbv, $" + sbv); //ok
      sbv = parseFloat(relevantBids[i][0]) + sbv;
    }
    //console.log("Sum of " + type + " = $" + sbv); //yes
    var meanBids = parseInt(sbv) / (relevantBids.length); //cal average of bid offers, by price

    //what is the bid wall, or biggest accumulation of volume, in bids?
    var bidArr = [];
    for (var i = 0; i < relevantBids.length; i++)
    {
      bidArr.push(relevantBids[i][0]);
    }
    bidWall = 0;
    bidWall = mode(bidArr);
    //console.log("biggest accumulation of orders within the top 25% is $%s", bidWall);
    // console.log("average bid price (mean), $%s", stats.mean(bidArr)); //agrees with my own Version
    // console.log("standard deviation from mean, %s", stats.stdev(bidArr));
    var bidsUnderWall = []; //filter yet again, but wall + 1
    for (var i = 0; i < relevantBids.length; i++)
    {
      //so long as [0] is less than bidWall + 1, multiply amt ([1]) * price, [0]
      var bidWallLimit = parseFloat(bidWall) + 1.0; //ok
      ///console.log("bid wall limit set to %s", bidWallLimit); //ok
      //console.log("relevant bid at i, ", relevantBids[i]);
      var s = relevantBids[i][0];
      if (s < bidWallLimit)
      {
        //console.log()
        bidsUnderWall.push(relevantBids[i]); //push it to the filter array if it meets criteria, will sum next
      }
    }
    //console.log("number of " + type + "s under the wall, " + bidsUnderWall.length);
    var sumsPerBid = []; //will sum this array
    for (var i = 0; i < bidsUnderWall.length; i++)
    {
      var sumOfItem = parseFloat(bidsUnderWall[i][0]) * parseFloat(bidsUnderWall[i][1]);
      //console.log("sum of item, $" + sumOfItem);
      sumsPerBid.push(sumOfItem);
    }
    const f = new Intl.NumberFormat('en-US',
    {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    })
    sumUnderBidWall = 0;
    sumUnderBidWall = sum(sumsPerBid);
    //console.log("223: value of orders, pre " + type + " wall " + f.format(sumUnderBidWall));  //[must search an area of price values, given mean and standard deviation from mean ]
    if (type == "bids")
    {
      //  var preBidWall, preSellWall
      preBidWall = sumUnderBidWall;
      bidMode = bidWall; //global, gets assigned now
      //bidSBV = sbv; //sum bid value, capitalization before the wall........DEP 11-26
    }
    else if (type == "asks")
    {
      preSellWall = sumUnderBidWall; //initialize global sums
      askMode = bidWall;
      //askSBV = sbv;........DEP 11-26
    }
    compareModeWalls();

  }

  function compareModeWalls()
  {
    //console.log("OBA compareModeWalls....");
    // console.log("258: bid wall value, $" + preBidWall );
    // console.log("258: ask wall value, $" + preSellWall );
    //     const format = new Intl.NumberFormat('en-US', { //format as $
    //     style: 'currency',
    //     currency: 'USD',
    //     minimumFractionDigits: 2
    //   })
    //
    //   var k = "";
    // //console printing
    //         if(preBidWall > preSellWall){ //comparison yields a console update, then a saved version, to construct a predictive graph
    //           //console.log("sell wall smaller, easier to trigger selloffs");
    //           probableDirection = "askMode";
    //           //var diff = ((preBidWall - preSellWall) / preSellWall) * 100.0 ; //difference, as a percentage
    //           var d = (parseFloat(preBidWall) / parseFloat(preSellWall)) *10.0; //integerize ratio of bid to sale
    //           //console.log(diff);
    //           var l =  pair +" sell wall is " + parseInt(d) + "% smaller, $" + format.format(askMode) + " achievable with $" + format.format(preSellWall) + " set of purchases.";
    //           k = pair + " " +format.format(askMode) + " sell wall more likely (" + format.format(preSellWall) + ") Sell wall is " + parseInt(d) + "% smaller than buy wall cap, " + format.format(preBidWall) + ", for " + format.format(bidMode);
    //           //console.log(k);
    //
    //           //sendSMSwithMsg(k);//began failing after transition to bean stalk, why,  WAS WORKING
    //           // var currentValues = {bids: bidsTotal, asks: asksTotal, price: price};
    //           // var myjson = JSON.stringify(currentValues);
    //         }else{
    //           probableDirection = "bidMode";
    //           //console.log("bid wall smaller, easier to trigger buying right now");
    //           //var diff = ((preSellWall - preBidWall) / preBidWall ) * 100.0 ;
    //           var d = (parseFloat(preBidWall) / parseFloat(preSellWall)) *10.0; //integerize ratio of bid to sale
    //
    //           //console.log(diff);
    //           //var l =  "bid wall is " + parseInt(diff) + "% smaller, easier to move to " + bidMode + " right now. Current sell wall is " + askMode+ ", triggerable with a $" + parseInt(askSBV) + " worth of sales. Trading range: " + bidMode + " / " + askMode;
    //           var l = pair + " buy wall is " + parseInt(d) + "% smaller, $" + format.format(bidMode) + " achievable with $" + format.format(preBidWall) + " set of purchases.";
    //           k = pair + " $" +format.format(bidMode) + " buy wall more likely. (" + format.format(preBidWall) + ") Buy wall is " + parseInt(d) + "% smaller than sell wall cap, " + format.format(preSellWall) + ", for " + format.format(askMode);
    //           //packageForJSON(jsonPackage);
    //         //console.log(k); //should format to currency, per https://flaviocopes.com/how-to-format-number-as-currency-javascript/
    //         //sendSMSwithMsg(k);//began failing after transition to bean stalk, why,  WAS WORKING
    //           //packageForJSON(format.format(bidMode), format.format(preBidWall), parseInt(diff), format.format(preSellWall), format.format(askMode));
    //         }
    // //now send the results forward
    //             if(!isNaN(askMode)){
    //               //form up a json element
    //               //var currentValues = {midpointPrice: midPointPriceForRecords, probableDirection: probableDirection, askMode: format.format(askMode), bidMode:format.format(bidMode), preBidWall:format.format(preBidWall), preSellWall:format.format(preSellWall), sellToBidRatioX10:diff };
    //             //encode price and analytic values in 2 json streams
    //             var dt =  new Date();
    //             var dayValue = dt.toDateString(); //reabable date, day/year
    //             var epoch = Date.now(); //milliseconds since 70
    //     //packagePriceforJSON(timestamp);//must have same timestamp value for both packages
    //     //packageRatioForJSON(timestamp);
    //     /**
    //       console.log("mid point price " + midPointPriceForRecords);
    //       console.log("probable direction " + probableDirection);
    //       console.log("ask Mode " + format.format(askMode));
    //       console.log("bid mode " + format.format(bidMode));
    //       console.log("pre bid wall " + format.format(preBidWall));
    //       console.log("pre sell wall " + format.format(preSellWall));
    //       var c = (parseFloat(preBidWall) / parseFloat(preSellWall)) *1000.0; // ratio, bid to sale
    //       var r = (parseFloat(preSellWall / parseFloat(preBidWall))) * 1000.0; //ratio, sales cap to bid cap
    //       console.log( parseInt(c) + "% easier to go in probable direction. ");**/
    //       //hitDDB(epoch.toString(), dayValue.toString(), 'BTC-USD',
    //       // midPointPriceForRecords.toString(),
    //       // askMode.toString(),
    //       // bidMode.toString(),
    //       // preBidWall.toString(),
    //       // preSellWall.toString()); //! was timestamp.toString() for orderbookstats table version 1, not 2 (number) & Date.now() as string
    //       // var msg = "$" + midPointPriceForRecords + " BTCUSD, " + parseInt(c) + "% easier to go in " + probableDirection + ", with caps: " + "$"+
    //       // format.format(preBidWall) + " pre-bid wall cap vs $" + format.format(preSellWall) +" pre sell wall cap";
    //     //sendSMSwithMsg(msg);
    //
    //       //uploadJSONToAWS(body);
    //     }
    bidAskCaps.bidCap = preBidWall;
    bidAskCaps.askCap = preSellWall;
    //return bidAskCaps;
    getCaps(); //hopefully returns something

  } //end compare mode walls

  function hitDDB(epoch, time, currencyPair, m, a, b, pbw, psw) //takes information from each run, for dynamo db, western region
  {
    console.log(" hitDDB: will hit obstats3");
    var AWS = require('aws-sdk');
    AWS.config.update({ region: 'us-west-2' });
    var ddb = new AWS.DynamoDB({ apiVersion: '2012-08-10' });
    var ll = pctRange.toString();
    var params = {
      TableName: 'btcStrata5',
      Item:
      {
        'epoch': { S: epoch },
        'pctRange': { S: ll },
        'day': { S: time },
        'currencyPair': { S: currencyPair },
        'midpointPrice': { S: m },
        'askMode': { S: a },
        'bidMode': { S: b },
        'preBidWall': { S: pbw },
        'preSellWall': { S: psw },
      }
    };
    var resultErr = "";
    var putPromise = ddb.putItem(params).promise().then(function (err, data)
    {
      if (err)
      {
        console.log("line 359: DDB HIT: Error", err);
        resultErr = err;
      }
      else
      {
        console.log("line 363: DDB HIT: Success", data);
      }
    });

    Promise.all(putPromise).then(function (values)
    {
      callback(null, resultErr);
    });
  } //end hitDDB

  //callback(console.log("callback"));

} //end handler
