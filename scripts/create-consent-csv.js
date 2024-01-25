/*
This script is useful for generating test data to do bulk imports into Bloomreach.
(to simulate Purchase List uploads, or consent uploads they do in FT Forums/FT BDP).

Why would we want to do this?  When testing our consent sync flow, as described here:
https://lucid.app/lucidchart/7b014227-4cc1-4cf9-beb3-1c952245cc40/view

In particular, load testing the following two apps, whose input comes (indirectly) from Bloomreach.
(hence needing to load Bloomreach with test data that can be easily identified and torn down after the test)

ip-martech-register-users
ip-martech-cdp-exponea-to-scs-sync

USAGE:
If you want to create files each with 10,000 records:

node ./create-consent-csv.js 10000
*/

const fs = require("fs");
const { v4: uuid } = require('uuid');
const now = new Date();

const createCsv = (numberOfRows) => {
  console.log("Starting process...");
  const consentFields =
    `marketing-email,accept,${now / 1000},unlimited`;

  console.log(`Creating email data. ${numberOfRows} records...`);

  const csvEmailData = Array.from(Array(numberOfRows)).map((row) => {
    return [(`${now.getDate()}-${now.getMonth()+1}-${uuid()}-test@test.com`)];
  });

  console.log("Writing to file...");
  const fileEmail = fs.createWriteStream("email.csv");
  const fileConsent = fs.createWriteStream("consent.csv");

  fileEmail.write("email" + "\n");
  fileConsent.write("email,category,action,timestamp,valid_until" + "\n");
  csvEmailData.forEach(function (v) {
    fileEmail.write(v.join(",") + "\n");
    fileConsent.write(v.join(",") + ',' + consentFields + "\n");
  });
  fileEmail.end();
  fileConsent.end();
  console.log("Completed!!");
};
console.log(process.argv[2]);
const count = process.argv[2] ? process.argv[2] : 10;
createCsv(+count);
