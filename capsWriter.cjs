/**7 25 2022 capture all recommendations with corresponding facts, from line 321 in orderbookAnalysis:
 *         co.bc = totalBidCap;
co.ac = totalAskCap;
co.tbv = totalBidVolume;
co.tav = totalAskVolume;
co.time = Date.now();
co.mp = midPointPriceForRecords;
            **/
 //import { createObjectCsvWriter as createCsvWriter } from 'csv-writer';
 const createCsvWriter = require('csv-writer').createObjectCsvWriter;
 const csvWriter = createCsvWriter({
     path: setFileName(),
     header: [{id: 'bc', title: 'bc'},
         {id: 'ac', title: 'ac'},
         {id: 'tbv', title: 'tbv'},
         {id: 'tav', title: 'tav'},
         {id: 'time', title: 'time'},
         {id: 'mp', title:'mp'},
         {id: 'minBid', title: 'minBid'}
       ]  });
 
  exports.writeMatches = (completedTrades) => {
    console.log(`${Object.entries(completedTrades)}`);
    writeArrayToCSV(completedTrades);
  }
 
 function writeArrayToCSV(a)
 {
   csvWriter.writeRecords(a)       // returns a promise
   .then(() => {
       console.log('CAPS write is Done');
       //completedTrades.length = 0;
   });
 }
 
 function setFileName()
 {
   var ts = getMillisecondTimestampFilename();
   var ret = "./" + ts + "-CAPS.csv";
   return ret;
 }
 
 function getMillisecondTimestampFilename()
 {
   var d = new Date();
   return d.toString();
 }
 