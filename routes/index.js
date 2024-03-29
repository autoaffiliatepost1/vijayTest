var express = require('express');
var router = express.Router();
var async = require('async');
var nodeTelegramBotApi = require("node-telegram-bot-api");
let request = require("request");
var config = require('../config/global');
var connection = require('../config/connection');
const BitlyClient = require('bitly').BitlyClient;
const axios = require('axios');
var _ = require('underscore');
var moment = require('moment-timezone');
var qs = require('qs');
var config = require('../config/global');
// Import required modules
var UpstoxClient = require("upstox-js-sdk");
const WebSocket = require("ws").WebSocket;

/* GET home page. */
router.get('/', function (req, res, next) {
  res.send('respond with a resource');
});

// Initialize the Upstox client and set the OAuth2 access token
ORDER_TAG = "PLACE_SL";
SL_PRCNT = 8.5;
let defaultClient = UpstoxClient.ApiClient.instance;
let apiVersion = "2.0";
let OAUTH2 = defaultClient.authentications["OAUTH2"];

// Define an asynchronous function to get PortfolioFeedUrl from the Upstox server
const getPortfolioFeedUrl = async () => {
  return new Promise((resolve, reject) => {
    // Initialize a Websocket API instance
    let apiInstance = new UpstoxClient.WebsocketApi();

    // Request to get the portfolio stream feed authorization
    apiInstance.getPortfolioStreamFeedAuthorize(
      apiVersion,
      (error, data, response) => {
        if (error) {
          // If there's an error, log it and reject the promise
          reject(error);
        } else {
          // If no error, log the returned data and resolve the promise
          resolve(data.data.authorizedRedirectUri);
        }
      }
    );
  });
};

// Define an asynchronous function to connect to the websocket
const connectWebSocket = async (wsUrl) => {
  return new Promise((resolve, reject) => {
    // Initialize a WebSocket instance with the authorized URL and appropriate headers
    const ws = new WebSocket(wsUrl, {
      headers: {
        "Api-Version": apiVersion,
        Authorization: "Bearer " + OAUTH2.accessToken,
      },
      followRedirects: true,
    });

    // Set up WebSocket event handlers
    ws.on("open", function open() {
      console.log("VserverConnected "+ moment.tz('Asia/Kolkata').format('YYYY-MM-DD hh:mm:ss'));
      teleStockMsg("VserverConnected "+ moment.tz('Asia/Kolkata').format('YYYY-MM-DD hh:mm:ss'));
      // let lta = 202.15;
      // let sl_percent = 0.5;
      // let sum = lta *(1-sl_percent/100);
      // let minus = lta *(1+sl_percent/100);
      // let trigeerPriceBuy = truncate(sum);
      // let priceBuy = trigeerPriceBuy - sl_percent;
      // let trigeerPriceSell = truncate(minus);
      // let priceSell = trigeerPriceSell + sl_percent;
      // console.log('trigeerPriceSell: ', trigeerPriceSell);
      // console.log('priceBuy: ', priceBuy);
      // console.log('trigeerPriceBuy: ', trigeerPriceBuy);
      // console.log('priceSell: ', priceSell);
      resolve(ws); // Resolve the promise when the WebSocket is opened
    });

    ws.on("close", function close() {
      console.log("VserverDisconnected" + moment.tz('Asia/Kolkata').format('YYYY-MM-DD hh:mm:ss'));
      console.log("VserverDisconnected" + moment.tz('Asia/Kolkata').format('YYYY-MM-DD hh:mm:ss'));
      teleStockMsg("VserverDisconnected" + moment.tz('Asia/Kolkata').format('YYYY-MM-DD hh:mm:ss'));
      setTimeout(function() {
        connect();
      }, 1000);
    });

    ws.on("message", function message(data1) {
      let data = JSON.parse(data1);
      // console.log("data received", data.toString());
      let socketData = JSON.stringify({'order_time':data.order_timestamp, 'direction':data.transaction_type , price:data.price , trigger_price:data.trigger_price , 'qty':data.quantity , 'orderType':data.order_type  , 'avg_price':data.average_price,'symbol':data.tradingsymbol ,  order_id:data.order_id, status:data.status});
      console.log('socketData: ', socketData + '\n' );
      if(data.status == 'complete' && data.tag == ORDER_TAG){
        // placeOrder(data);
      }
    });

    ws.on("error", function onError(error) {
      console.log("error:", error);
      reject(error); // Reject the promise when there's an error
    });
  });
};

// Execute the async functions to get PortfolioFeedUrl and connect to WebSocket
// (async () => {
//   try {
//     console.log('try: ');
//     let sqlsss = "SELECT * FROM plateform_login";
//     connection.query(sqlsss, async function (err, appData) {
//       if (err) {
//         await logUser("App data fetch api failed websocket");
//       } else {
//         OAUTH2.accessToken = appData[0].access_token;
//         console.log('appData2222: ', appData[0].access_token);
//         const wsUrl = await getPortfolioFeedUrl(); // First, get the authorization
//         const ws = await connectWebSocket(wsUrl); // Then, connect to the WebSocket using the authorized URL
//       }
//     })
//   } catch (error) {
//     // Catch and log any errors
//     console.error("An error occurred:", error);
//   }
// })();

// function connect(){
//   console.log('try: ');
//   let sqlsss = "SELECT * FROM plateform_login";
//   connection.query(sqlsss, async function (err, appData) {
//     if (err) {
//       await logUser("App data fetch api failed websocket");
//     } else {
//       OAUTH2.accessToken = appData[0].access_token;
//       console.log('appData2222: ', appData[0].access_token);
//       const wsUrl = await getPortfolioFeedUrl(); // First, get the authorization
//       const ws = await connectWebSocket(wsUrl); // Then, connect to the WebSocket using the authorized URL
//     }
//   })
// }

// connect();
function placeOrder(data) {
  console.log('data.instrument_token: ', data.instrument_token.replace(/%7C/g, '|'));
  let sqlsss = "SELECT order_book.*, plateform_login.* FROM order_book JOIN plateform_login ON order_book.user_id = plateform_login.user_id WHERE order_book.instrument_token='" + data.instrument_token.replace(/%7C/g, '|') + "' and order_book.order_date='" + moment(new Date()).format('YYYY-MM-DD')+ "' ORDER BY order_book.id DESC";
  connection.query(sqlsss, async function (err, appData) {
    console.log('orderData: ', appData[0]);
    if (err) {
      await logUser("order_book 2 fetch api failed");
      await teleStockMsg("STEP 1 ==========================>");
    } else {
      await teleStockMsg("STEP 2 ==========================>");
        let finalDate =  moment.tz('Asia/Kolkata').format('HH:mm ss:SSS');
        let finalDateTime =  moment.tz('Asia/Kolkata').format('DD-MM-YYYY HH:mm ss:SSS');
        let setPrice;
        let triggerPrice;
        if (appData[0].transaction_type == 'BUY') {
          setPrice = Number(appData[0].low_value)
          triggerPrice = truncate(setPrice + Number(appData[0].trigger_predication));
        } else {
          setPrice = Number(appData[0].high_value)
          triggerPrice = truncate(setPrice - Number(appData[0].trigger_predication));
        }

        let requestHeaders1 = {
          "accept": "application/json",
          "Content-Type": "application/json",
          "Api-Version": "2.0",
          "Authorization": "Bearer " + appData[0].access_token
        }

        let data1 = {
          'quantity': Number(2),
          'product': appData[0].product,
          'validity': appData[0].validity,
          'price': Number(setPrice),
          'tag': ORDER_TAG,
          'order_type': "SL",
          'instrument_token': appData[0].instrument_token,
          'transaction_type': appData[0].transaction_type == 'BUY' ? "SELL" :"BUY",
          'disclosed_quantity': Number(appData[0].disclosed_quantity),
          'trigger_price': Number(triggerPrice),
          'is_amo': appData[0].is_amo = 'false' ? false : true
        }

        console.log('data1:========== place sl ', data1);
        request({
          uri: "https://api-v2.upstox.com/order/place",
          method: "POST",
          body: JSON.stringify(data1),
          headers: requestHeaders1
        }, async (err, response, success) => {
          if (err) {
            await teleStockMsg("STEP 3 ==========================>");
            await teleStockMsg("<b>VL</b>😔 placeOrder 2 candle data failed "+ finalDate);
            await logUser("placeOrder 2 candle data failed");
            return nextCall({
              "message": "something went wrong",
              "data": null
            });
          } else {
            
            let finalData = JSON.parse(success);
            if (finalData.status && finalData.status == "error") {
              finalData.client_secret = appData[0].client_secret;
              finalData.status1 = "logout";
              await teleStockMsg("STEP 4 ==========================>");
              await updateLoginUser(finalData)
              await teleStockMsg("<b>VL</b>😔 placeOrder 2 candle data failed "+ finalDate)
              await logUser("placeOrder 2 candle data failed")
              return nextCall({
                "message": "something went wrong",
                "data": finalData
              });
            } else {
              appData[0].order_id = finalData.data.order_id;
              appData[0].price =  Number(setPrice);
              appData[0].quantity =  Number(2);
              appData[0].trigger_price =  Number(triggerPrice);
              appData[0].order_type = "SL";
              appData[0].transaction_type =  appData[0].transaction_type == 'BUY' ? "SELL" :"BUY";
              await teleStockMsg("STEP 5 ==========================>");
              await orderBookDb(appData[0]);
              let html;
              if(appData[0].order_type != 'SL' && appData[0].order_type != 'SL-M'){
                html = '<b>Account Id : </b> Vijay <b>[Upstock]</b> \n\n' +
               '🔀 <b>Direction : </b> <b> ' + appData[0].transaction_type + '</b>'+(appData[0].transaction_type == 'BUY'? '🟢' : '🔴')+'\n' +
               '🌐 <b>Script : </b> ' + appData[0].instrument_token + '\n' +
               '💰 <b>Price : ₹</b> ' + Number(setPrice) + '\n' +
               '🚫 <b>Qty : </b> ' + appData[0].quantity + '\n' +
               '📈 <b>Mode : </b> ' + appData[0].order_type + '\n' +
               '🕙 <b>Trade Time : </b> ' + finalDateTime + '\n' +
               '📋 <b>Order Id : </b> ' + appData[0].order_id + '\n' ;
              }else{
                html = '<b>Account Id : </b> Vijay <b>[Upstock]</b> \n\n' +
               '🔀 <b>Direction : </b> <b> ' + appData[0].transaction_type + '</b>'+(appData[0].transaction_type == 'BUY'? '🟢' : '🔴')+'\n' +
               '🌐 <b>Script : </b> ' + appData[0].instrument_token + '\n' +
               '💰 <b>Price : ₹</b> ' + Number(setPrice) + '\n' +
               '🚫 <b>Qty : </b> ' + appData[0].quantity + '\n' +
               '📈 <b>Mode : </b> ' + appData[0].order_type + '\n' +
               '👉 <b>Trigger Price : </b> ' + appData[0].trigger_price + '\n' +
               '🕙 <b>Trade Time : </b> ' + finalDateTime + '\n' +
               '📋 <b>Order Id : </b> ' + appData[0].order_id + '\n' ;
              }
              await teleStockMsg(html);
              await teleAnotherStockMsg(html);
              await logUser("placeOrder 2 candle data featch successfully")
            }
          }
        })
    }
  })
}

setInterval(function setup() {
  let sqlsss = "SELECT * FROM app_data";
  connection.query(sqlsss, async function (err, appData) {
    if (err) {
      await logUser("App data fetch api failed");
    } else {
      testServer();
      console.log('appData: ', appData[0]);
    }
  })
}, 20000)

function testServer() {
  request({
    uri: "https://stockbot-8p0l.onrender.com/",
    method: "GET",
  }, (err, response, body) => {
    console.log('body: ', body);
  })
}

/** Authentication apis */
router.get('/login', function (req, res) {
  async.waterfall([
    function (nextCall) {
      // let requestHeaders = {
      //   "accept": "application/json",
      //   "Api-Version": "2.0"
      // }
      // request({
      //   uri: "https://api-v2.upstox.com/login/authorization/dialog?client_id="+ req.params.client_id +"&redirect_uri="+ req.params.redirect_uri,
      //   method: "GET",
      //   headers: requestHeaders
      // }, (err, response, body) => {
      //   console.log('body: ', body);
      // })
      let sqlsss = "SELECT * FROM app_data";
      connection.query(sqlsss, async function (err, appData) {
        console.log('appData: ', appData);
        if (err) {
          await teleStockMsg("App data fetch api failed");
          await logUser("App data fetch api failed");
        } else {

          let requestHeaders1 = {
            "accept": "application/json",
            "Content-Type": "application/x-www-form-urlencoded",
            "Api-Version": "2.0"
          }

          let data = {
            'client_id': appData[0].client_id,
            'client_secret': appData[0].client_secret,
            'code': req.query.code,
            'grant_type': "authorization_code",
            'redirect_uri': appData[0].redirect_uri
          }

          request({
            uri: "https://api-v2.upstox.com/login/authorization/token",
            method: "POST",
            body: qs.stringify(data),
            headers: requestHeaders1
          }, async (err, response, success) => {
            if (err) {
              await teleStockMsg("upstox login failed");
              await logUser("upstox login failed");
              return nextCall({
                "message": "something went wrong",
                "data": null
              });
            } else {
              let finalData = JSON.parse(success);
              finalData.client_id = data.client_id;
              finalData.client_secret = data.client_secret;
              finalData.redirect_uri = data.redirect_uri;
              if (finalData.status && finalData.status == "error") {
                finalData.status1 = "logout";
                await updateLoginUser(finalData)
                await teleStockMsg("upstox login failed")
                await logUser("upstox login failed")
                return nextCall({
                  "message": "something went wrong",
                  "data": finalData
                });
              } else {
                finalData.status1 = "login";
                await checkloginUser(finalData)
                nextCall(null, finalData);
              }
            }
          })
        }
      })
    },
  ], function (err, response) {
    if (err) {
      return res.send({
        status_api: err.code ? err.code : 400,
        message: (err && err.message) || "someyhing went wrong",
        data: err.data ? err.data : null
      });
    }
    return res.send({
      status_api: 200,
      message: "Auth generate successfully",
      data: response
    });
  });
});


/** Stop/reverce apis */
router.get('/stopReverceApi', function (req, res) {
  async.waterfall([
    function (nextCall) {
      let sqlsss = "SELECT * FROM plateform_login";
      connection.query(sqlsss, async function (err, appData) {
        let finalDate =  moment.tz('Asia/Kolkata').format('HH:mm ss:SSS');
        let finalDateTime =  moment.tz('Asia/Kolkata').format('DD-MM-YYYY HH:mm ss:SSS');
        if (err) {
          await teleStockMsg("App data fetch api failed");
          await logUser("App data fetch api failed");
        } else {
          if(req.query.live_trade == 'true' || req.query.live_trade == 'TRUE'){
          let requestHeaders1 = {
            "accept": "application/json",
            "Content-Type": "application/json",
            "Api-Version": "2.0",
            "Authorization": "Bearer " + appData[0].access_token
          }

          let data = {
            'quantity': Number(req.query.quantity),
            'product': req.query.product,
            'validity': req.query.validity,
            'price': Number(req.query.price),
            'tag': req.query.tag,
            'order_type': req.query.order_type,
            'instrument_token': req.query.instrument_token,
            'transaction_type': req.query.transaction_type,
            'disclosed_quantity': Number(req.query.disclosed_quantity),
            'trigger_price': Number(req.query.trigger_price),
            'is_amo': req.query.is_amo = 'false' ? false : true
          }

          request({
            uri: "https://api-v2.upstox.com/order/place",
            method: "POST",
            body: JSON.stringify(data),
            headers: requestHeaders1
          }, async (err, response, success) => {
            if (err) {
              await teleStockMsg("<b>VL</b>😔 stopReverceApi candle data failed "+ finalDate);
              await logUser("stopReverceApi candle data failed");
              return nextCall({
                "message": "something went wrong",
                "data": null
              });
            } else {
              let finalData = JSON.parse(success);
              if (finalData.status && finalData.status == "error") {
                finalData.client_secret = appData[0].client_secret;
                finalData.status1 = "logout";
                await updateLoginUser(finalData)
                await teleStockMsg("<b>VL</b>😔 stopReverceApi candle data failed "+ finalDate)
                await logUser("stopReverceApi candle data failed")
                return nextCall({
                  "message": "something went wrong",
                  "data": finalData
                });
              } else {
                req.query.order_id = finalData.data.order_id;
                req.query.user_id = appData[0].user_id;
                await orderBookDb(req.query);
                let html;
                if(req.query.order_type != 'SL' && req.query.order_type != 'SL-M'){
                  html = '<b>Account Id : </b> Vijay <b>[Upstock]</b> \n\n' +
                 '🔀 <b>Direction : </b> <b> ' + req.query.transaction_type + '</b>'+(req.query.transaction_type == 'BUY'? '🟢' : '🔴')+'\n' +
                 '🌐 <b>Script : </b> ' + req.query.instrument_token + '\n' +
                 '💰 <b>Price : ₹</b> ' + req.query.price + '\n' +
                 '🚫 <b>Qty : </b> ' + req.query.quantity + '\n' +
                 '📈 <b>Mode : </b> ' + req.query.order_type + '\n' +
                 '🕙 <b>Trade Time : </b> ' + finalDateTime + '\n' +
                 '📋 <b>Order Id : </b> ' + req.query.order_id + '\n' ;
                }else{
                  html = '<b>Account Id : </b> Vijay <b>[Upstock]</b> \n\n' +
                 '🔀 <b>Direction : </b> <b> ' + req.query.transaction_type + '</b>'+(req.query.transaction_type == 'BUY'? '🟢' : '🔴')+'\n' +
                 '🌐 <b>Script : </b> ' + req.query.instrument_token + '\n' +
                 '💰 <b>Price : ₹</b> ' + req.query.price + '\n' +
                 '🚫 <b>Qty : </b> ' + req.query.quantity + '\n' +
                 '📈 <b>Mode : </b> ' + req.query.order_type + '\n' +
                 '👉 <b>Trigger Price : </b> ' + req.query.trigger_price + '\n' +
                 '🕙 <b>Trade Time : </b> ' + finalDateTime + '\n' +
                 '📋 <b>Order Id : </b> ' + req.query.order_id + '\n' ;
                }
                // '🟢 <b>High Value : </b> <i> ' + finalData.high_value + '</i>\n' +
                // '🔴 <b>Low Value : </b> <i> ' + finalData.low_value + '</i>\n';
                await teleStockMsg(html);
                await teleAnotherStockMsg(html);
                await logUser("stopReverceApi candle data featch successfully")
                nextCall(null, finalData);
              }
            }
          })
         }else{
          await teleStockMsg("<b>VL</b>🔀 "+req.query.order_type +" api featch but no order")
          await logUser(req.query.order_type +" api featch but no order")
          await orderModify(req.query);
          nextCall(null, req.query);
         }
        }
      })
    },
  ], function (err, response) {
    if (err) {
      return res.send({
        status_api: err.code ? err.code : 400,
        message: (err && err.message) || "someyhing went wrong",
        data: err.data ? err.data : null
      });
    }
    return res.send({
      status_api: 200,
      message: "stopReverceApi Order successfully",
      data: response
    });
  });
});

/** historical-data apis */
router.get('/historical-data', function (req, res) {
  async.waterfall([
    function (nextCall) {
      let sqlsss = "SELECT * FROM plateform_login";
      connection.query(sqlsss, async function (err, appData) {
        if (err) {
          await teleStockMsg("App data fetch api failed");
          await logUser("App data fetch api failed");
        } else {
          let requestHeaders1 = {
            "accept": "application/json",
            "Content-Type": "application/x-www-form-urlencoded",
            "Api-Version": "2.0",
            "Authorization": "Bearer " + appData[0].access_token
          }

          request({
            uri: "https://api-v2.upstox.com/historical-candle/" + req.query.instrumentKey + "/" + req.query.interval + "/" + req.query.to_date + "/" + req.query.from_date,
            method: "GET",
            headers: requestHeaders1
          }, async (err, response, success) => {
            if (err) {
              await teleStockMsg("Historical candle data featch failed");
              await logUser("Historical candle data featch failed");
              return nextCall({
                "message": "something went wrong",
                "data": null
              });
            } else {
              let finalData = JSON.parse(success);
              if (finalData.status && finalData.status == "error") {
                finalData.client_secret = appData[0].client_secret;
                finalData.status1 = "logout";
                await updateLoginUser(finalData)
                await teleStockMsg("Historical candle data featch failed")
                await logUser("Historical candle data featch failed")
                return nextCall({
                  "message": "something went wrong",
                  "data": finalData
                });
              } else {
                let originalCandles = finalData.data.candles;
                let convertedCandles = originalCandles.map(candle => {
                  return {
                    "date": candle[0],
                    "open": candle[1],
                    "high": candle[2],
                    "low": candle[3],
                    "close": candle[4],
                    "vol": candle[5],
                    "oi": candle[6]
                  };
                });
                let desiredFormat = {
                  "status": "success",
                  "data": {
                    "candles": convertedCandles
                  }
                };
                await teleStockMsg("Historical candle data featch successfully")
                await logUser("Historical candle data featch successfully")
                nextCall(null, desiredFormat);
              }
            }
          })
        }
      })
    },
  ], function (err, response) {
    if (err) {
      return res.send({
        status_api: err.code ? err.code : 400,
        message: (err && err.message) || "someyhing went wrong",
        data: err.data ? err.data : null
      });
    }
    return res.send({
      status_api: 200,
      message: "Historical data get successfully",
      data: response
    });
  });
});

/** Buy/sell apis */
router.get('/buySellApi', function (req, res) {
  async.waterfall([
    function (nextCall) {
      let sqlsss = "SELECT * FROM plateform_login";
      connection.query(sqlsss, async function (err, appData) {
        let finalDate =  moment.tz('Asia/Kolkata').format('HH:mm ss:SSS');
        let finalDateTime =  moment.tz('Asia/Kolkata').format('DD-MM-YYYY HH:mm ss:SSS');
        if (err) {
          await teleStockMsg("App data fetch api failed");
          await logUser("App data fetch api failed");
        } else {
          if(req.query.live_trade == 'true' || req.query.live_trade == 'TRUE'){
          let requestHeaders1 = {
            "accept": "application/json",
            "Content-Type": "application/json",
            "Api-Version": "2.0",
            "Authorization": "Bearer " + appData[0].access_token
          }

          let data = {
            'quantity': Number(req.query.quantity),
            'product': req.query.product,
            'validity': req.query.validity,
            'price': Number(req.query.price),
            'tag': req.query.tag,
            'order_type': req.query.order_type,
            'instrument_token': req.query.instrument_token,
            'transaction_type': req.query.transaction_type,
            'disclosed_quantity': Number(req.query.disclosed_quantity),
            'trigger_price': Number(req.query.trigger_price),
            'is_amo': req.query.is_amo = 'false' ? false : true
          }

          request({
            uri: "https://api-v2.upstox.com/order/place",
            method: "POST",
            body: JSON.stringify(data),
            headers: requestHeaders1
          }, async (err, response, success) => {
            if (err) {
              await teleStockMsg("<b>VL</b>😔 BuySellApi candle data failed "+ finalDate);
              await logUser("BuySellApi candle data failed");
              return nextCall({
                "message": "something went wrong",
                "data": null
              });
            } else {
              let finalData = JSON.parse(success);
              if (finalData.status && finalData.status == "error") {
                finalData.client_secret = appData[0].client_secret;
                finalData.status1 = "logout";
                await updateLoginUser(finalData)
                await teleStockMsg("<b>VL</b>😔 BuySellApi candle data failed "+ finalDate)
                await logUser("BuySellApi candle data failed")
                return nextCall({
                  "message": "something went wrong",
                  "data": finalData
                });
              } else {
                req.query.order_id = finalData.data.order_id;
                req.query.user_id = appData[0].user_id;
                let html;
                if(req.query.order_type != 'SL' && req.query.order_type != 'SL-M'){
                  html = '<b>Account Id : </b> Vijay <b>[Upstock]</b> \n\n' +
                 '🔀 <b>Direction : </b> <b> ' + req.query.transaction_type + '</b>'+(req.query.transaction_type == 'BUY'? '🟢' : '🔴')+'\n' +
                 '🌐 <b>Script : </b> ' + req.query.instrument_token + '\n' +
                 '💰 <b>Price : ₹</b> ' + req.query.price + '\n' +
                 '🚫 <b>Qty : </b> ' + req.query.quantity + '\n' +
                 '📈 <b>Mode : </b> ' + req.query.order_type + '\n' +
                 '🕙 <b>Trade Time : </b> ' + finalDateTime + '\n' +
                 '📋 <b>Order Id : </b> ' + req.query.order_id + '\n' ;
                }else{
                  html = '<b>Account Id : </b> Vijay <b>[Upstock]</b> \n\n' +
                 '🔀 <b>Direction : </b> <b> ' + req.query.transaction_type + '</b>'+(req.query.transaction_type == 'BUY'? '🟢' : '🔴')+'\n' +
                 '🌐 <b>Script : </b> ' + req.query.instrument_token + '\n' +
                 '💰 <b>Price : ₹</b> ' + req.query.price + '\n' +
                 '🚫 <b>Qty : </b> ' + req.query.quantity + '\n' +
                 '📈 <b>Mode : </b> ' + req.query.order_type + '\n' +
                 '👉 <b>Trigger Price : </b> ' + req.query.trigger_price + '\n' +
                 '🕙 <b>Trade Time : </b> ' + finalDateTime + '\n' +
                 '📋 <b>Order Id : </b> ' + req.query.order_id + '\n' ;
                }
                // '🟢 <b>High Value : </b> <i> ' + finalData.high_value + '</i>\n' +
                // '🔴 <b>Low Value : </b> <i> ' + finalData.low_value + '</i>\n';
                await teleStockMsg(html);
                await teleAnotherStockMsg(html);
                await logUser("BuySellApi candle data featch successfully")
                nextCall(null, finalData);
              }
            }
          })
         }else{
          await teleStockMsg("<b>VL</b>🏷️ "+req.query.order_type +" api featch but no order")
          await logUser(req.query.order_type +" api featch but no order")
          nextCall(null, req.query);
         }
        }
      })
    },
  ], function (err, response) {
    if (err) {
      return res.send({
        status_api: err.code ? err.code : 400,
        message: (err && err.message) || "someyhing went wrong",
        data: err.data ? err.data : null
      });
    }
    return res.send({
      status_api: 200,
      message: "BuySellApi Order successfully",
      data: response
    });
  });
});

/** Order modify apis */
router.get('/orderModifyApi', function (req, res) {
  async.waterfall([
    function (nextCall) {
      let sqlsss = "SELECT * FROM plateform_login";
      connection.query(sqlsss, async function (err, appData) {
        if (err) {
          await teleStockMsg("App data fetch api failed");
          await logUser("App data fetch api failed");
        } else {
          let requestHeaders1 = {
            "accept": "application/json",
            "Content-Type": "application/json",
            "Api-Version": "2.0",
            "Authorization": "Bearer " + appData[0].access_token
          }

          let data = {
            'quantity': Number(req.query.quantity),
            'order_id': req.query.order_id,
            'validity': req.query.validity,
            'price': Number(req.query.price),
            'order_type': req.query.order_type,
            'disclosed_quantity': Number(req.query.disclosed_quantity),
            'trigger_price': Number(req.query.trigger_price)
          }

          request({
            uri: "https://api-v2.upstox.com/order/modify",
            method: "POST",
            body: JSON.stringify(data),
            headers: requestHeaders1
          }, async (err, response, success) => {
            if (err) {
              await teleStockMsg("Order modify apis candle data featch failed");
              await logUser("Order modify apis candle data featch failed");
              return nextCall({
                "message": "something went wrong",
                "data": null
              });
            } else {
              let finalData = JSON.parse(success);
              if (finalData.status && finalData.status == "error") {
                finalData.client_secret = appData[0].client_secret;
                finalData.status1 = "logout";
                await updateLoginUser(finalData)
                await teleStockMsg("Order modify apis candle data featch failed")
                await logUser("Order modify apis candle data featch failed")
                return nextCall({
                  "message": "something went wrong",
                  "data": finalData
                });
              } else {
                await teleStockMsg("Order modify apis candle data featch successfully")
                await logUser("Order modify apis candle data featch successfully")
                nextCall(null, finalData);
              }
            }
          })
        }
      })
    },
  ], function (err, response) {
    if (err) {
      return res.send({
        status_api: err.code ? err.code : 400,
        message: (err && err.message) || "someyhing went wrong",
        data: err.data ? err.data : null
      });
    }
    return res.send({
      status_api: 200,
      message: "Order modify apis successfully",
      data: response
    });
  });
});

/** intraday apis */
router.get('/intraday', function (req, res) {
  async.waterfall([
    function (nextCall) {
      let sqlsss = "SELECT * FROM plateform_login";
      connection.query(sqlsss, async function (err, appData) {
        let finalDate =  moment.tz('Asia/Kolkata').format('HH:mm ss:SSS');
        if (err) {
          await teleStockMsg("<b>VL</b>🔴 App data candle data featch failed "+ finalDate);
          await logUser("App data fetch api failed");
        } else {
          let requestHeaders1 = {
            "accept": "application/json",
            "Content-Type": "application/x-www-form-urlencoded",
            "Api-Version": "2.0",
            "Authorization": "Bearer " + appData[0].access_token
          }

          request({
            uri: "https://api-v2.upstox.com/historical-candle/intraday/" + req.query.instrumentKey + "/" + req.query.interval,
            method: "GET",
            headers: requestHeaders1
          }, async (err, response, success) => {
            if (err) {
              await teleStockMsg("<b>VL</b>🔴 Intraday candle featch failed "+ finalDate);
              await logUser("Intraday candle featch failed");
              return nextCall({
                "message": "something went wrong",
                "data": null
              });
            } else {
              let finalData = JSON.parse(success);
              if (finalData.status && finalData.status == "error") {
                finalData.client_secret = appData[0].client_secret;
                finalData.status1 = "logout";
                await updateLoginUser(finalData)
                await teleStockMsg("<b>VL</b>🔴 Intraday candle featch failed "+ finalDate)
                await logUser("Intraday candle featch failed")
                return nextCall({
                  "message": "something went wrong",
                  "data": finalData
                });
              } else {
                let originalCandles = finalData.data.candles;
                let convertedCandles = originalCandles.map(candle => {
                  return {
                    "date": candle[0],
                    "open": candle[1],
                    "high": candle[2],
                    "low": candle[3],
                    "close": candle[4],
                    "vol": candle[5],
                    "oi": candle[6]
                  };
                });
                let desiredFormat = {
                  "status": "success",
                  "data": {
                    "candles": convertedCandles
                  }
                };
                await teleStockMsg('<b>VL</b>🟢 Intraday candle : '+ finalDate)
                await logUser("Intraday candle featch successfully")
                nextCall(null, desiredFormat);
              }
            }
          })
        }
      })
    },
  ], function (err, response) {
    if (err) {
      return res.send({
        status_api: err.code ? err.code : 400,
        message: (err && err.message) || "someyhing went wrong",
        data: err.data ? err.data : null
      });
    }
    return res.send({
      status_api: 200,
      message: "Intraday data get successfully",
      data: response
    });
  });
});

/** cancelAllOrder list apis */
router.get('/cancelAllOrder', function (req, res) {
  async.waterfall([
    function (nextCall) {
      let sqlsss = "SELECT * FROM plateform_login";
      connection.query(sqlsss, async function (err, appData) {
        if (err) {
          await teleStockMsg("App data fetch api failed cancelAllOrder");
          await logUser("App data fetch api failed cancelAllOrder");
        } else {
          let requestHeaders1 = {
            "accept": "application/json",
            "Api-Version": "2.0",
            "Authorization": "Bearer " + appData[0].access_token
          }

          request({
            uri: "https://api-v2.upstox.com/order/retrieve-all",
            method: "GET",
            headers: requestHeaders1
          }, async (err, response, success) => {
            if (err) {
              await teleStockMsg("Order book list data featch failed");
              await logUser("Order book list data featch failed");
              return nextCall({
                "message": "something went wrong",
                "data": null
              });
            } else {
              let finalData = JSON.parse(success);
              console.log('finalData: ', finalData);
              if (finalData.status && finalData.status == "error") {
                finalData.client_secret = appData[0].client_secret;
                finalData.status1 = "logout";
                await updateLoginUser(finalData)
                await teleStockMsg("Order book list data featch failed")
                await logUser("Order book list data featch failed")
                return nextCall({
                  "message": "something went wrong",
                  "data": finalData
                });
              } else {
                finalData.data.map(async(statusData) => {
                  if(statusData.status != 'complete'){
                    await singleOrder(appData[0].client_secret,appData[0].access_token,statusData.order_id)
                  }
                });
                await logUser("Order book list candle data featch successfully")
                nextCall(null, finalData);
              }
            }
          })
        }
      })
    },
  ], function (err, response) {
    if (err) {
      return res.send({
        status_api: err.code ? err.code : 400,
        message: (err && err.message) || "someyhing went wrong",
        data: err.data ? err.data : null
      });
    }
    return res.send({
      status_api: 200,
      message: "Order book list get successfully",
      data: response
    });
  });
});

function singleOrder(client_secret,access_token,order_id){   
  let requestHeaders1 = {
    "accept": "application/json",
    "Api-Version": "2.0",
    "Authorization": "Bearer " + access_token
  }

  request({
    uri: "https://api-v2.upstox.com/order/cancel?order_id=" + order_id,
    method: "DELETE",
    headers: requestHeaders1
  }, async (err, response, success) => {
    if (err) {
      await teleStockMsg("Order cancel featch failed 11");
      await logUser("Order cancel featch failed 11");
    } else {
      let cancelOrderList = JSON.parse(success);
      if (cancelOrderList.status && cancelOrderList.status == "error") {
        cancelOrderList.client_secret = client_secret;
        cancelOrderList.status1 = "logout";
        await updateLoginUser(cancelOrderList)
        await teleStockMsg("Order cancel featch failed")
        await logUser("Order cancel featch failed")
      } else {
        await logUser("Order book list candle data featch successfully")
      }
    }
  })
}

/** Order book list apis */
router.get('/orderBookList', function (req, res) {
  async.waterfall([
    function (nextCall) {
      let sqlsss = "SELECT * FROM plateform_login";
      connection.query(sqlsss, async function (err, appData) {
        if (err) {
          await teleStockMsg("App data fetch api failed");
          await logUser("App data fetch api failed");
        } else {
          let requestHeaders1 = {
            "accept": "application/json",
            "Api-Version": "2.0",
            "Authorization": "Bearer " + appData[0].access_token
          }

          request({
            uri: "https://api-v2.upstox.com/order/retrieve-all",
            method: "GET",
            headers: requestHeaders1
          }, async (err, response, success) => {
            if (err) {
              await teleStockMsg("Order book list data featch failed");
              await logUser("Order book list data featch failed");
              return nextCall({
                "message": "something went wrong",
                "data": null
              });
            } else {
              let finalData = JSON.parse(success);
              if (finalData.status && finalData.status == "error") {
                finalData.client_secret = appData[0].client_secret;
                finalData.status1 = "logout";
                await updateLoginUser(finalData)
                await teleStockMsg("Order book list data featch failed")
                await logUser("Order book list data featch failed")
                return nextCall({
                  "message": "something went wrong",
                  "data": finalData
                });
              } else {
                await logUser("Order book list candle data featch successfully")
                nextCall(null, finalData);
              }
            }
          })
        }
      })
    },
  ], function (err, response) {
    if (err) {
      return res.send({
        status_api: err.code ? err.code : 400,
        message: (err && err.message) || "someyhing went wrong",
        data: err.data ? err.data : null
      });
    }
    return res.send({
      status_api: 200,
      message: "Order book list get successfully",
      data: response
    });
  });
});

/** Order cancel apis */
router.get('/orderCancel', function (req, res) {
  async.waterfall([
    function (nextCall) {
      let sqlsss = "SELECT * FROM plateform_login";
      connection.query(sqlsss, async function (err, appData) {
        if (err) {
          await teleStockMsg("App data fetch api failed");
          await logUser("App data fetch api failed");
        } else {
          let requestHeaders1 = {
            "accept": "application/json",
            "Api-Version": "2.0",
            "Authorization": "Bearer " + appData[0].access_token
          }

          request({
            uri: "https://api-v2.upstox.com/order/cancel?order_id=" + req.query.order_id,
            method: "DELETE",
            headers: requestHeaders1
          }, async (err, response, success) => {
            if (err) {
              await teleStockMsg("Order cancel featch failed");
              await logUser("Order cancel featch failed");
              return nextCall({
                "message": "something went wrong",
                "data": null
              });
            } else {
              let finalData = JSON.parse(success);
              if (finalData.status && finalData.status == "error") {
                finalData.client_secret = appData[0].client_secret;
                finalData.status1 = "logout";
                await updateLoginUser(finalData)
                await teleStockMsg("Order cancel featch failed")
                await logUser("Order cancel featch failed")
                return nextCall({
                  "message": "something went wrong",
                  "data": finalData
                });
              } else {
                await logUser("Order book list candle data featch successfully")
                nextCall(null, finalData);
              }
            }
          })
        }
      })
    },
  ], function (err, response) {
    if (err) {
      return res.send({
        status_api: err.code ? err.code : 400,
        message: (err && err.message) || "someyhing went wrong",
        data: err.data ? err.data : null
      });
    }
    return res.send({
      status_api: 200,
      message: "Order cancel successfully",
      data: response
    });
  });
});

/** Market quotes LTP . apis */
router.get('/marketQuotesLTP', function (req, res) {
  async.waterfall([
    function (nextCall) {
      let sqlsss = "SELECT * FROM plateform_login";
      connection.query(sqlsss, async function (err, appData) {
        if (err) {
          await teleStockMsg("App data fetch api failed");
          await logUser("App data fetch api failed");
        } else {
          let requestHeaders1 = {
            "accept": "application/json",
            "Api-Version": "2.0",
            "Authorization": "Bearer " + appData[0].access_token
          }

          request({
            uri: "https://api-v2.upstox.com/market-quote/ltp?instrument_key=" + req.query.instrument_key,
            method: "GET",
            headers: requestHeaders1
          }, async (err, response, success) => {
            if (err) {
              await teleStockMsg("Market quotes LTP featch failed");
              await logUser("Market quotes LTP featch failed");
              return nextCall({
                "message": "something went wrong",
                "data": null
              });
            } else {
              let finalData = JSON.parse(success);
              if (finalData.status && finalData.status == "error") {
                finalData.client_secret = appData[0].client_secret;
                finalData.status1 = "logout";
                await updateLoginUser(finalData)
                await teleStockMsg("Market quotes LTP featch failed")
                await logUser("Market quotes LTP featch failed")
                return nextCall({
                  "message": "something went wrong",
                  "data": finalData
                });
              } else {
                let originalCandles = finalData.data;
                let convertedCandles = Object.entries(originalCandles).map(([key, value]) => ({
                  "name": key,
                  "last_price": value.last_price,
                  "instrument_token": value.instrument_token
                }))
                let desiredFormat = {
                  "status": "success",
                  "data": {
                    "instrument": convertedCandles
                  }
                };
                await logUser("Market quotes LTP featch successfully")
                nextCall(null, desiredFormat);
              }
            }
          })
        }
      })
    },
  ], function (err, response) {
    if (err) {
      return res.send({
        status_api: err.code ? err.code : 400,
        message: (err && err.message) || "someyhing went wrong",
        data: err.data ? err.data : null
      });
    }
    return res.send({
      status_api: 200,
      message: "Market quotes LTP successfully",
      data: response
    });
  });
});

/** getHolding apis */
router.get('/getHolding', function (req, res) {
  async.waterfall([
    function (nextCall) {
      let sqlsss = "SELECT * FROM plateform_login";
      connection.query(sqlsss, async function (err, appData) {
        if (err) {
          await teleStockMsg("App data fetch api failed");
          await logUser("App data fetch api failed");
        } else {
          let requestHeaders1 = {
            "accept": "application/json",
            "Api-Version": "2.0",
            "Authorization": "Bearer " + appData[0].access_token
          }

          request({
            uri: "https://api-v2.upstox.com/portfolio/long-term-holdings",
            method: "GET",
            headers: requestHeaders1
          }, async (err, response, success) => {
            if (err) {
              await teleStockMsg("getHolding data featch failed");
              await logUser("getHolding data featch failed");
              return nextCall({
                "message": "something went wrong",
                "data": null
              });
            } else {
              let finalData = JSON.parse(success);
              if (finalData.status && finalData.status == "error") {
                finalData.client_secret = appData[0].client_secret;
                finalData.status1 = "logout";
                await updateLoginUser(finalData)
                await teleStockMsg("getHolding data featch failed")
                await logUser("getHolding data featch failed")
                return nextCall({
                  "message": "something went wrong",
                  "data": finalData
                });
              } else {
                await logUser("getHolding candle data featch successfully")
                nextCall(null, finalData);
              }
            }
          })
        }
      })
    },
  ], function (err, response) {
    if (err) {
      return res.send({
        status_api: err.code ? err.code : 400,
        message: (err && err.message) || "someyhing went wrong",
        data: err.data ? err.data : null
      });
    }
    return res.send({
      status_api: 200,
      message: "getHolding get successfully",
      data: response
    });
  });
});

/** getPositions apis */
router.get('/getPositions', function (req, res) {
  async.waterfall([
    function (nextCall) {
      let sqlsss = "SELECT * FROM plateform_login";
      connection.query(sqlsss, async function (err, appData) {
        if (err) {
          await teleStockMsg("App data fetch api failed");
          await logUser("App data fetch api failed");
        } else {
          let requestHeaders1 = {
            "accept": "application/json",
            "Api-Version": "2.0",
            "Authorization": "Bearer " + appData[0].access_token
          }

          request({
            uri: "https://api-v2.upstox.com/portfolio/short-term-positions",
            method: "GET",
            headers: requestHeaders1
          }, async (err, response, success) => {
            if (err) {
              await teleStockMsg("getPositions data featch failed");
              await logUser("getPositions data featch failed");
              return nextCall({
                "message": "something went wrong",
                "data": null
              });
            } else {
              let finalData = JSON.parse(success);
              if (finalData.status && finalData.status == "error") {
                finalData.client_secret = appData[0].client_secret;
                finalData.status1 = "logout";
                await updateLoginUser(finalData)
                await teleStockMsg("getPositions data featch failed")
                await logUser("getPositions data featch failed")
                return nextCall({
                  "message": "something went wrong",
                  "data": finalData
                });
              } else {
                await logUser("getPositions candle data featch successfully")
                nextCall(null, finalData);
              }
            }
          })
        }
      })
    },
  ], function (err, response) {
    if (err) {
      return res.send({
        status_api: err.code ? err.code : 400,
        message: (err && err.message) || "someyhing went wrong",
        data: err.data ? err.data : null
      });
    }
    return res.send({
      status_api: 200,
      message: "getPositions get successfully",
      data: response
    });
  });
});

/** BotStatus apis */
router.get('/botStatus', function (req, res) {
  async.waterfall([
    function (nextCall) {
      let sqlsss = "SELECT * FROM plateform_login";
      connection.query(sqlsss, async function (err, appData) {
        if (err) {
          await teleStockMsg("App data fetch api failed");
          await logUser("App data fetch api failed");
        } else {
          let requestHeaders1 = {
            "accept": "application/json",
            "Api-Version": "2.0",
            "Authorization": "Bearer " + appData[0].access_token
          }

          request({
            uri: "https://api-v2.upstox.com/user/profile",
            method: "GET",
            headers: requestHeaders1
          }, async (err, response, success) => {
            if (err) {
              await teleStockMsg("BotStatus data featch failed");
              await logUser("BotStatus data featch failed");
              return nextCall({
                "message": "something went wrong",
                "data": null
              });
            } else {
              let finalData = JSON.parse(success);
              if (finalData.status && finalData.status == "error") {
                finalData.client_secret = appData[0].client_secret;
                finalData.status1 = "logout";
                await updateLoginUser(finalData)
                await teleStockMsg("BotStatus data featch failed")
                await logUser("BotStatus data featch failed")
                return nextCall({
                  "message": "something went wrong",
                  "data": finalData
                });
              } else {
                await logUser("BotStatus candle data featch successfully")
                nextCall(null, finalData);
              }
            }
          })
        }
      })
    },
  ], function (err, response) {
    if (err) {
      return res.send({
        status_api: err.code ? err.code : 400,
        message: (err && err.message) || "someyhing went wrong",
        data: err.data ? err.data : null
      });
    }
    return res.send({
      status_api: 200,
      message: "BotStatus get successfully",
      data: response
    });
  });
});

/** Get trades for day apis */
router.get('/get-trades-for-day', function (req, res) {
  async.waterfall([
    function (nextCall) {
      let sqlsss = "SELECT * FROM plateform_login";
      connection.query(sqlsss, async function (err, appData) {
        if (err) {
          await teleStockMsg("Get trades for day fetch api failed");
          await logUser("Get trades for day fetch api failed");
        } else {
          let requestHeaders1 = {
            "accept": "application/json",
            "Api-Version": "2.0",
            "Authorization": "Bearer " + appData[0].access_token
          }

          request({
            uri: "https://api-v2.upstox.com/order/trades/get-trades-for-day",
            method: "GET",
            headers: requestHeaders1
          }, async (err, response, success) => {
            if (err) {
              await teleStockMsg("Get trades for day featch failed");
              await logUser("Get trades for day featch failed");
              return nextCall({
                "message": "something went wrong",
                "data": null
              });
            } else {
              let finalData = JSON.parse(success);
              if (finalData.status && finalData.status == "error") {
                finalData.client_secret = appData[0].client_secret;
                finalData.status1 = "logout";
                await updateLoginUser(finalData)
                await teleStockMsg("Get trades for day featch failed")
                await logUser("Get trades for day featch failed")
                return nextCall({
                  "message": "something went wrong",
                  "data": finalData
                });
              } else {
                await logUser("Get trades for day data featch successfully")
                nextCall(null, finalData);
              }
            }
          })
        }
      })
    },
  ], function (err, response) {
    if (err) {
      return res.send({
        status_api: err.code ? err.code : 400,
        message: (err && err.message) || "someyhing went wrong",
        data: err.data ? err.data : null
      });
    }
    return res.send({
      status_api: 200,
      message: "Get trades for day data get successfully",
      data: response
    });
  });
});

/** Get order book apis */
router.get('/all-book-order', function (req, res) {
  async.waterfall([
    function (nextCall) {
      let sqlsss = "SELECT * FROM plateform_login";
      connection.query(sqlsss, async function (err, appData) {
        if (err) {
          await teleStockMsg("Get order book fetch api failed");
          await logUser("Get order book fetch api failed");
        } else {
          let requestHeaders1 = {
            "accept": "application/json",
            "Api-Version": "2.0",
            "Authorization": "Bearer " + appData[0].access_token
          }

          request({
            uri: "https://api-v2.upstox.com/order/retrieve-all",
            method: "GET",
            headers: requestHeaders1
          }, async (err, response, success) => {
            if (err) {
              await teleStockMsg("Get order book featch failed");
              await logUser("Get order book featch failed");
              return nextCall({
                "message": "something went wrong",
                "data": null
              });
            } else {
              let finalData = JSON.parse(success);
              if (finalData.status && finalData.status == "error") {
                finalData.client_secret = appData[0].client_secret;
                finalData.status1 = "logout";
                await updateLoginUser(finalData)
                await teleStockMsg("Get order book featch failed")
                await logUser("Get order book featch failed")
                return nextCall({
                  "message": "something went wrong",
                  "data": finalData
                });
              } else {
                await logUser("Get order book data featch successfully")
                nextCall(null, finalData);
              }
            }
          })
        }
      })
    },
  ], function (err, response) {
    if (err) {
      return res.send({
        status_api: err.code ? err.code : 400,
        message: (err && err.message) || "someyhing went wrong",
        data: err.data ? err.data : null
      });
    }
    return res.send({
      status_api: 200,
      message: "Get order book data get successfully",
      data: response
    });
  });
});

function checkloginUser(data) {
  let sqlss = "SELECT COUNT(*) as cnt FROM plateform_login WHERE user_id=" + JSON.stringify(data.user_id);
  connection.query(sqlss, async function (err, dataLogin) {
    if (err) {
      await teleStockMsg("check login User detail failed")
      await logUser("check login User detail failed")
    } else {
      if (dataLogin[0].cnt == 0) {
        await loginUser(data)
      } else {
        await updateLoginUser(data)
      }
    }
  })
}

function truncate(f) {
  if (f === null || f === 0) {
    return f;
  }
  f = Math.round(f / 0.05) * 0.05;  // tick size 0.05
  const n = 2;
  const s = f.toFixed(12);
  const [i, d] = s.split('.');
  return parseFloat(`${i}.${(d + '0'.repeat(n)).slice(0, n)}`);
}

function updateOrderHighLow(data) {
    values = [
      data.low_value,
      data.high_value
    ]
    var sqlss = "UPDATE order_book set low_value =?,high_value =? WHERE order_id =" + JSON.stringify(data.order_id);
    connection.query(sqlss, values, async function (err, data) {
      if (err) {
        await teleStockMsg("order high-low value update failed")
        await logUser("order high-low value update failed")
      } else {
        await teleStockMsg("order high-low value update successfully")
        await logUser("order high-low value update successfully")
      }
    })
}

function orderModify(data) {
  console.log('data.instrument_token: ', data.instrument_token.replace(/%7C/g, '|'));
  let sqlsss = "SELECT order_book.*, plateform_login.* FROM order_book JOIN plateform_login ON order_book.user_id = plateform_login.user_id WHERE order_book.instrument_token='" + data.instrument_token.replace(/%7C/g, '|') + "' and order_book.order_date='" + moment(new Date()).format('YYYY-MM-DD')+ "' ORDER BY order_book.id DESC";
  connection.query(sqlsss, async function (err, appData) {
    console.log('orderData: ', appData[0]);
    if (err) {
      await teleStockMsg("mode 1 *****************************>");
      await logUser("order_book fetch api failed");
    } else {
      await teleStockMsg("mode 2 *****************************>");
      if (appData[0].high_value == data.high_value && appData[0].low_value == data.low_value) {
      await teleStockMsg("mode 3 *****************************>");
      }else if (appData[0].transaction_type == 'SELL' && appData[0].high_value != data.high_value && appData[0].low_value == data.low_value) {
        await teleStockMsg("mode 4 *****************************>");
        await updateOrderHighLow({"order_id":appData[0].order_id,"high_value":data.high_value,"low_value":data.low_value})
      }else if (appData[0].transaction_type == 'BUY' && appData[0].high_value == data.high_value && appData[0].low_value != data.low_value) {
        await teleStockMsg("mode 5 *****************************>");
        await updateOrderHighLow({"order_id":appData[0].order_id,"high_value":data.high_value,"low_value":data.low_value})
      } else {
        await teleStockMsg("mode 6 *****************************>");
        await updateOrderHighLow({"order_id":appData[0].order_id,"high_value":data.high_value,"low_value":data.low_value})
        let setPrice;
        let triggerPrice;
        // if (appData[0].transaction_type == 'SELL') {
        //   setPrice = Number(data.low_value)
        // } else {
        //   setPrice = Number(data.high_value)
        // }
        if (appData[0].transaction_type == 'SELL') {
          setPrice = Number(data.low_value)
          triggerPrice = truncate(setPrice + Number(data.trigger_predication));
        } else {
          setPrice = Number(data.high_value)
          triggerPrice = truncate(setPrice - Number(data.trigger_predication));
        }

        let requestHeaders1 = {
          "accept": "application/json",
          "Content-Type": "application/json",
          "Api-Version": "2.0",
          "Authorization": "Bearer " + appData[0].access_token
        }

        let data1 = {
          'quantity': Number(appData[0].quantity),
          'validity': appData[0].validity,
          'order_id': appData[0].order_id,
          'price': Number(setPrice),
          'order_type': appData[0].order_type,
          'disclosed_quantity': Number(appData[0].disclosed_quantity),
          'trigger_price': Number(triggerPrice)
        }

        console.log('data1=====orderModify: ', data1);

        request({
          uri: "https://api-v2.upstox.com/order/modify",
          method: "PUT",
          body: JSON.stringify(data1),
          headers: requestHeaders1
        }, async (err, response, success) => {
          console.log('success:===order ', success);
          if (err) {
            await teleStockMsg("mode 7 *****************************>");
            await teleStockMsg("Order modify 3 failed")
            await logUser("Order modify 3 failed")
          } else {
            await teleStockMsg("mode 8 *****************************>");
            await teleStockMsg("Order modify 3 successfully")
            await logUser("Order modify 3 successfully")
          }
        })
      }
    }
  })
}

function orderBookDb(data) {
  values = [[
    data.order_id,
    moment().format('YYYY-MM-DD'),
    data.user_id,
    data.trigger_predication,
    data.quantity,
    data.product,
    data.validity,
    data.price,
    data.tag,
    data.instrument_token,
    data.order_type,
    data.transaction_type,
    data.disclosed_quantity,
    data.trigger_price,
    data.is_amo,
    data.high_value,
    data.low_value,
  ]]

  let sqlss = "INSERT INTO order_book (order_id,order_date,user_id,trigger_predication,quantity,product,validity,price,tag,instrument_token,order_type,transaction_type,disclosed_quantity,trigger_price,is_amo,high_value,low_value) VALUES ?";
  connection.query(sqlss, [values], async function (err, data) {
    if (err) {
      await teleStockMsg("Order book failed")
      await logUser("Order book failed")
    } else {
      await teleStockMsg("Order book successfully")
      await logUser("Order book successfully")
    }
  })
}

function loginUser(data) {
  values = [[
    data.user_id,
    data.user_name,
    data.email,
    data.broker,
    data.client_id,
    data.client_secret,
    data.redirect_uri,
    data.status1,
    data.access_token,
  ]]

  let sqlss = "INSERT INTO plateform_login (user_id,user_name,email,broker,client_id,client_secret,redirect_uri,status,access_token) VALUES ?";
  connection.query(sqlss, [values], async function (err, data) {
    if (err) {
      await teleStockMsg("new user login failed")
      await logUser("new user login failed")
    } else {
      await teleStockMsg("new  user login successfully")
      await logUser("new  user login successfully")
    }
  })
}

function updateLoginUser(data) {
  if (data.status1 == 'login') {
    values = [
      data.status1,
      data.access_token ? data.access_token : ""
    ]
    var sqlss = "UPDATE plateform_login set status =? ,access_token =? WHERE client_secret =" + JSON.stringify(data.client_secret);
    connection.query(sqlss, values, async function (err, data) {
      if (err) {
        await teleStockMsg("old user login failed")
        await logUser("old user login failed")
      } else {
        await teleStockMsg("old user login successfully")
        await logUser("old user login successfully")
      }
    })
  } else {
    values = [
      data.status1
    ]
    var sqlss = "UPDATE plateform_login set status =? WHERE client_secret =" + JSON.stringify(data.client_secret);
    connection.query(sqlss, values, async function (err, data) {
      if (err) {
        await teleStockMsg("old user login failed")
        await logUser("old user login failed")
      } else {
        await teleStockMsg("old user login successfully")
        await logUser("old user login successfully")
      }
    })
  }
}

function logUser(msg) {
  values = [[
    msg,
    moment().format('YYYY-MM-DD hh:mm:ss')
  ]]

  let sqlss = "INSERT INTO log_details(message,date) VALUES ?";
  connection.query(sqlss, [values], function (err, data) {
    if (err) {
      console.log('err: 1', err);
    } else {
      console.log('data: ', data);
    }
  })
}

router.post('/register', function (req, res) {
  async.waterfall([
    function (nextCall) {
      let sql = 'SELECT COUNT(*) as cnt FROM login WHERE login.email ="' + req.body.email + '"';
      connection.query(sql, function (err, rides) {
        if (err) {
          return nextCall({
            "message": "something went wrong",
          });
        }
        else if (rides[0].cnt == 0) {
          nextCall(null, rides[0].cnt);
        } else {
          return nextCall({
            "message": "User is alerady Register",
          });
        }
      })
    }, function (admin, nextCall) {
      values = [[
        req.body.Username,
        req.body.email,
        req.body.Phonenumber,
        req.body.password,
        "Pendding",
        " ",
        " "
      ]]

      let sqlss = "INSERT INTO login (username,email,phonenubmer,password,status,auth_token,tag_id) VALUES ?";
      connection.query(sqlss, [values], function (err, rides) {
        if (err) {
          return nextCall({
            "message": "something went wrong",
          });
        }
        nextCall(null, rides[0]);
      })
    }
  ], function (err, response) {
    if (err) {
      return res.send({
        status: err.code ? err.code : 400,
        message: (err && err.msg) || "someyhing went wrong"
      });
    }
    return res.send({
      status: 200,
      message: "user register sucessfully now wait account conformation.",
      data: response
    });
  });
});

router.post('/api/addAllInOneData', function (req, res) {
  async.waterfall([
    function (nextCall) {
      values = [[
        //  req.body.storeIcon,
        req.body.sNLink,
        req.body.sALink,
        req.body.storeN,
        req.body.isAffiliated,
        req.body.storeID,
      ]]
      let sqlss = "INSERT INTO diff_net_posts (short_url,Landing_Page,Brand,active_flag,domain_url) VALUES ?";
      connection.query(sqlss, [values], function (err, rides) {
        if (err) {
          return nextCall({
            "message": "something went wrong",
          });
        }
        nextCall(null, rides[0]);
      })
    }
  ], function (err, response) {
    if (err) {
      return res.send({
        status: err.code ? err.code : 400,
        message: (err && err.msg) || "someyhing went wrong"
      });
    }
    return res.send({
      status: 200,
      message: "add post create sucessfully",
      data: response
    });
  });
});

router.post('/api/autoPhotoPostFlags', function (req, res) {
  async.waterfall([
    function (nextCall) {
      values = [
        req.body.autopost_flag_tele,
        req.body.delay,
      ]
      var sqlss = "UPDATE post_flags set autopost_flag_tele =? ,delay =? WHERE id = 1";
      connection.query(sqlss, values, function (err, rides) {
        if (err) {
          return nextCall({
            "message": "something went wrong",
          });
        }
        nextCall(null, rides[0]);
      })
    }
  ], function (err, response) {
    if (err) {
      return res.send({
        status: err.code ? err.code : 400,
        message: (err && err.msg) || "someyhing went wrong"
      });
    }
    return res.send({
      status: 200,
      message: "Edit post flag update sucessfully",
      data: response
    });
  });
});

router.post('/api/addtokenData', function (req, res) {
  async.waterfall([
    function (nextCall) {
      values = [[
        req.body.sNLink
      ]]
      let sqlss = "INSERT INTO bitly_token (token) VALUES ?";
      connection.query(sqlss, [values], function (err, rides) {
        if (err) {
          return nextCall({
            "message": "something went wrong",
          });
        }
        nextCall(null, rides);
      })
    }
  ], function (err, response) {
    if (err) {
      return res.send({
        status: err.code ? err.code : 400,
        message: (err && err.msg) || "someyhing went wrong"
      });
    }
    return res.send({
      status: 200,
      message: "add token sucessfully",
      data: response
    });
  });
});

router.post('/api/editAllInOneData', function (req, res) {
  async.waterfall([
    function (nextCall) {
      values = [
        //  req.body.storeIcon,
        req.body.sNLink,
        req.body.sALink,
        req.body.storeN,
        req.body.isAffiliated,
        req.body.storeID,
        req.body.id,
      ]
      var sqlss = "UPDATE diff_net_posts set short_url =? ,Landing_Page =? , Brand =?,active_flag =? , domain_url =?  WHERE id = ?";
      connection.query(sqlss, values, function (err, rides) {
        if (err) {
          return nextCall({
            "message": "something went wrong",
          });
        }
        nextCall(null, rides[0]);
      })
    }
  ], function (err, response) {
    if (err) {
      return res.send({
        status: err.code ? err.code : 400,
        message: (err && err.msg) || "someyhing went wrong"
      });
    }
    return res.send({
      status: 200,
      message: "Edit post create sucessfully",
      data: response
    });
  });
});

router.post('/api/editpostFlags', function (req, res) {
  async.waterfall([
    function (nextCall) {
      values = [
        req.body.tele_flag,
        req.body.watts_flag,
      ]
      var sqlss = "UPDATE post_flags set tele_flag =? , watts_flag =?  WHERE id = 1";
      connection.query(sqlss, values, function (err, rides) {
        if (err) {
          return nextCall({
            "message": "something went wrong",
          });
        }
        nextCall(null, rides[0]);
      })
    }
  ], function (err, response) {
    if (err) {
      return res.send({
        status: err.code ? err.code : 400,
        message: (err && err.msg) || "someyhing went wrong"
      });
    }
    return res.send({
      status: 200,
      message: "Edit post flag update sucessfully",
      data: response
    });
  });
});

router.get('/api/singlepostFlags', function (req, res) {
  async.waterfall([
    function (nextCall) {
      var sqlss = " SELECT * FROM post_flags WHERE id = 1";
      connection.query(sqlss, function (err, rides) {
        if (err) {
          return nextCall({
            "message": "something went wrong",
          });
        }
        nextCall(null, rides[0]);
      })
    }
  ], function (err, response) {
    if (err) {
      return res.send({
        status: err.code ? err.code : 400,
        message: (err && err.msg) || "someyhing went wrong"
      });
    }
    return res.send({
      status: 200,
      message: "Single recored sucessfully",
      data: response
    });
  });
});

router.post('/api/editFlipkartFlags', function (req, res) {
  async.waterfall([
    function (nextCall) {
      let values;
      let sqlss;
      if (req.body.value == 'dirflipkart') {
        //         values =  [ req.body.value, req.body.tag]
        //         sqlss = "UPDATE post_flags set flipkart_server =? , flipkart_tag =? WHERE id = 1";
        values = [req.body.value, req.body.tag, "3dac9368527d6192b0ac6b01f3c4460ea2b4cc42"]
        sqlss = "UPDATE post_flags set flipkart_server =? , flipkart_tag =?,current_bitly  =? WHERE id = 1";

      } else {
        values = [req.body.value]
        sqlss = "UPDATE post_flags set flipkart_server =? WHERE id = 1";
      }
      connection.query(sqlss, values, function (err, rides) {
        if (err) {
          return nextCall({
            "message": "something went wrong",
          });
        }
        nextCall(null, rides[0]);
      })
    }
  ], function (err, response) {
    if (err) {
      return res.send({
        status: err.code ? err.code : 400,
        message: (err && err.msg) || "someyhing went wrong"
      });
    }
    return res.send({
      status: 200,
      message: "Edit post flag update sucessfully",
      data: response
    });
  });
});

function teleStockMsg(msg) {
  bot = new nodeTelegramBotApi(config.token);
  bot.sendMessage(config.channelId, "→ "+msg, {
    parse_mode: "HTML",
    disable_web_page_preview: true
  })
}

function teleAnotherStockMsg(msg) {
  bot = new nodeTelegramBotApi(config.token);
  bot.sendMessage(config.channelId2, "→ "+msg, {
    parse_mode: "HTML",
    disable_web_page_preview: true
  })
}

router.get('/api/singleAllInOneData/:id', function (req, res) {
  async.waterfall([
    function (nextCall) {
      var sqlss = " SELECT * FROM diff_net_posts WHERE id =" + req.params.id;
      connection.query(sqlss, function (err, rides) {
        if (err) {
          return nextCall({
            "message": "something went wrong",
          });
        }
        nextCall(null, rides[0]);
      })
    }
  ], function (err, response) {
    if (err) {
      return res.send({
        status: err.code ? err.code : 400,
        message: (err && err.msg) || "someyhing went wrong"
      });
    }
    return res.send({
      status: 200,
      message: "Single recored sucessfully",
      data: response
    });
  });
});

router.get('/api/singleBitlyData', function (req, res) {
  async.waterfall([
    function (nextCall) {
      var sqlss = " SELECT * FROM bitly_token";
      connection.query(sqlss, function (err, rides) {
        // console.log('rides: ', _.last(rides));
        if (err) {
          return nextCall({
            "message": "something went wrong",
          });
        }
        nextCall(null, rides);
      })
    }
  ], function (err, response) {
    if (err) {
      return res.send({
        status: err.code ? err.code : 400,
        message: (err && err.msg) || "someyhing went wrong"
      });
    }
    return res.send({
      status: 200,
      message: "Single recored sucessfully",
      data: response
    });
  });
});

router.delete('/api/deleteAllInOneData/:id', function (req, res) {
  async.waterfall([
    function (nextCall) {
      var sqlss = " DELETE FROM diff_net_posts WHERE id =" + req.params.id;
      connection.query(sqlss, function (err, rides) {
        if (err) {
          return nextCall({
            "message": "something went wrong",
          });
        }
        nextCall(null, rides[0]);
      })
    }
  ], function (err, response) {
    if (err) {
      return res.send({
        status: err.code ? err.code : 400,
        message: (err && err.msg) || "someyhing went wrong"
      });
    }
    return res.send({
      status: 200,
      message: "deleted recored sucessfully",
      data: response
    });
  });
});

router.post('/api/getAllInOneData', function (req, res) {
  var response = {
    "draw": req.body.draw || 0,
    "recordsTotal": 0,
    "recordsFiltered": 0,
    "data": []
  };
  async.waterfall([
    function (nextCall) {
      var sql = "Select count(*) as TotalCount from ??";
      // connection.query(sql, ['all_in_one'], function (err, rides) {
      connection.query(sql, ['diff_net_posts'], function (err, rides) {
        if (err) {
          console.log('11');
          return nextCall({
            "message": "something went wrong",
          });
        }
        response.recordsTotal = rides[0].TotalCount;
        response.recordsFiltered = rides[0].TotalCount
        nextCall(null, rides[0].TotalCount);
      })
    }, function (counts, nextCall) {
      startNum = parseInt(req.body.start) || 0;
      LimitNum = parseInt(req.body.length) || 10;
      var query = "Select * from ?? WHERE " + req.body.columns[req.body.order[0].column].data + " LIKE '%" + req.body.search.value + "%' ORDER BY " + req.body.columns[req.body.order[0].column].data + ' ' + req.body.order[0].dir + " limit ? OFFSET ?";
      connection.query(query, ["diff_net_posts", LimitNum, startNum], function (err, ridess) {
        if (err) {
          return nextCall({
            "message": "something went wrong",
          });
        } else if (ridess.length > 0) {
          response.data = ridess;
          nextCall();
        } else {
          return nextCall({
            "message": "something went wrong",
          });
        }
      })
    }
  ], function (err) {
    if (err) {
      return res.send({
        status: err.code ? err.code : 400,
        message: (err && err.msg) || "someyhing went wrong"
      });
    }
    return res.send(response);
  });
});

/** getOrderHistory apis */
router.get('/getOrderHistory', function (req, res) {
  async.waterfall([
    function (nextCall) {
      let sqlsss = "SELECT * FROM plateform_login";
      connection.query(sqlsss, async function (err, appData) {
        if (err) {
          await teleStockMsg("App data fetch api failed");
          await logUser("App data fetch api failed");
        } else {
          let requestHeaders1 = {
            "accept": "application/json",
            "Api-Version": "2.0",
            "Authorization": "Bearer " + appData[0].access_token
          }

          request({
            uri: "https://api-v2.upstox.com/order/history?order_id=" + req.query.order_id,
            method: "GET",
            headers: requestHeaders1
          }, async (err, response, success) => {
            if (err) {
              await teleStockMsg("getOrderHistory data featch failed");
              await logUser("getOrderHistory data featch failed");
              return nextCall({
                "message": "something went wrong",
                "data": null
              });
            } else {
              let finalData = JSON.parse(success);
              if (finalData.status && finalData.status == "error") {
                finalData.client_secret = appData[0].client_secret;
                finalData.status1 = "logout";
                await updateLoginUser(finalData)
                await teleStockMsg("getOrderHistory data featch failed")
                await logUser("getOrderHistory data featch failed")
                return nextCall({
                  "message": "something went wrong",
                  "data": finalData
                });
              } else {
                await logUser("getOrderHistory candle data featch successfully")
                nextCall(null, finalData);
              }
            }
          })
        }
      })
    },
  ], function (err, response) {
    if (err) {
      return res.send({
        status_api: err.code ? err.code : 400,
        message: (err && err.message) || "someyhing went wrong",
        data: err.data ? err.data : null
      });
    }
    return res.send({
      status_api: 200,
      message: "getOrderHistory get successfully",
      data: response
    });
  });
});

module.exports = router;
