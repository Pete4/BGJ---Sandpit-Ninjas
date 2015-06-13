"use strict"

var app = require('express')();
var http = require('http').Server(app);
var path = require('path');
var io = require('socket.io')(http);
var url = require('url');
var fs = require('fs');
var Player = require('./Player.js').Player;
var sitePrefix = './public';
var site = fs.realpathSync('.') + path.sep + 'public';
var OK = 200, Redirect = 307, NotFound = 404, BadType = 415, Error = 500;

function fail(response, code) {
  response.writeHead(code);
  response.end();
}

app.get('/', function(req, res) {
  res.sendFile('public/index.html', {root:'.'});
});

app.get(/^(.+)$/, function(req, res) {
  var filename = url.parse(req.url).pathname;
  if (!inSite(sitePrefix+filename)) return fail(res, NotFound);
  res.sendFile(sitePrefix+filename, {root:'.'});
});

function starts(s,prefix) {
  return s.indexOf(prefix) == 0;
}

function inSite(file) {
  var real;
  try {
    real = fs.realpathSync(file);
  }
  catch (err) {
    console.log("WARNING: Trying to access a file not in the site: "+file);
    console.log(err.message);
    return false;
  }
  return starts(real,site);
}

var mapWidth = 6000;
var mapHeight = 6000;
var players = [];
var asteroids = [];
var resources = [];
var idCounter = 0;

io.on('connection', function(socket) {
  console.log('a user connected');
  var player = new Player(socket.id)
  players.push(player);
  socket.on('key update', function(keyState) {
    if (typeof(player) != 'undefined') {
      player.keyState = keyState;
    }
  });
});

http.listen(3000, function(){
  console.log('listening on *:3000');
});

var loop = setInterval(gameLoop, 25);

function genID() {
  return idCounter++;
}

function genAsteroidsAndResources() {
  for (var i = 0; i < 10; i++) {
    asteroids.push(new Asteroid(genID(),32+Math.random*(mapWidth-64),32+Math.random*(mapHeight-64)));
  }
  for (var i = 0; i < 10; i++) {
    resources.push(new Resource(genID(),32+Math.random*(mapWidth-64),32+Math.random*(mapHeight-64)));
  }
}

function sendUpdates() {
  for (var i = 0; i < players.length; i++) {
    var sock = io.sockets.connected[players[i].id];
    var gamedata = {players:players, asteroids:asteroids, resources:resources};
    // find out what each user should be able to see
    if (typeof(sock) != 'undefined') {
      sock.emit('gamedata',gamedata);
    }
  }
}

function gameLoop() {
  sendUpdates();
}
