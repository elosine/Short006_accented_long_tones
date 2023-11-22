// #region LIBRARIES
var express = require('express');
var app = express();
var path = require('path');
var timesyncServer = require('timesync/server');
var httpServer = require('http').createServer(app);
const fs = require('fs');
// #endregion END LIBRARIES

//#region HTTP SERVER
const PORT = process.env.PORT || 5000
httpServer.listen(PORT, () => console.log(`Listening on ${ PORT }`));
//#endregion END HTTP SERVER

//#region SERVE STATIC FILES THROUGH EXPRESS
app.use(express.static(path.join(__dirname, '/public')));
app.get('/', function(req, res) {
  // res.sendFile(path.join(__dirname, '/public/pieces/sf005/sf005_launchPage.html'));
  res.sendFile(path.join(__dirname, '/public/pieces/short006/short006.html'));
});
//#endregion END SERVER STATIC FILES

//#region TIMESYNC SERVER
app.use('/timesync', timesyncServer.requestHandler);
//#endregion END TIMESYNC SERVER
