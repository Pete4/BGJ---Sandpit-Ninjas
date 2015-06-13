"use strict"

var app = require('express')();
var http = require('http').Server(app);
var path = require('path');
var io = require('socket.io')(http);
var url = require('url');
var fs = require('fs');
var Player = require('./Player.js').Player;
var Asteroid = require('./Asteroid.js').Asteroid;
var Resource = require('./Resource.js').Resource;
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

// GAME CODE STARTS HERE //

var mapWidth = 6000;
var mapHeight = 6000;
var players = [];
var asteroids = [];
var resources = [];
var numAsteroids = 1000;
var numResources = 1000;
var idCounter = 0;
var frameDelay = 35;
var KEY_CODES = {
  LEFT: 37,
  UP: 38,
  RIGHT: 39,
  DOWN: 40
};
var TO_RADIANS = Math.PI/180; 

io.on('connection', function(socket) {
  console.log('A user connected. There are now '+(players.length+1).toString()+' players.');
  var player = new Player(socket.id,'Bob');
  players.push(player);
  socket.emit('ping','');
  player.pingStart = Date.now();

  socket.on('keyupdate', function(keyState) {
    if (typeof(player) != 'undefined') {
      player.keyState = keyState;
      console.log('keyupdate');
      player.lastMovedTime = Date.now();
    }
  });
  socket.on('disconnect', function() {
    console.log('user disconnected');
    if (typeof(player) != 'undefined') {
      io.emit('remove player',player.id);
      players.splice(players.indexOf(player), 1);
    } 
  });
  socket.on('ping response', function(data) {
    if (typeof(player) != 'undefined') {
      player.ping = Date.now() - player.pingStart;
      setTimeout(function(){socket.emit('ping',''); player.pingStart = Date.now();},2000);
    }
  });
});

genAsteroidsAndResources();

http.listen(3000, function(){
  console.log('listening on *:3000');
});

var loop = setInterval(gameLoop,frameDelay);

function genID() {
  return idCounter++;
}

function genAsteroidsAndResources() {
  for (var i = 0; i < numAsteroids; i++) {
    asteroids.push(new Asteroid(genID(),32+Math.random()*(mapWidth-64),32+Math.random()*(mapHeight-64)),Math.floor(Math.random()*360));
  }
  for (var i = 0; i < numResources; i++) {
    resources.push(new Resource(genID(),32+Math.random()*(mapWidth-64),32+Math.random()*(mapHeight-64)),'standard');
  }
}

function sendUpdates() {
  for (var i = 0; i < players.length; i++) {
    var socket = io.sockets.connected[players[i].id];
    var gamedata = {players:players, asteroids:asteroids, resources:resources};
    // find out what each user should be able to see
    if (typeof(socket) != 'undefined') {
      socket.emit('player',players[i]);
      socket.emit('gamedata',gamedata);
    }
  }
}

function movePlayers() {
  for (var i = 0; i < players.length; i++) {
    var p = players[i];
    var delta = (Date.now()-p.lastMovedTime)/1000.0;
    p.state = 0;
    if (p.keyState[KEY_CODES.LEFT]) {
      p.state = 1;
      p.angle = (p.angle - p.rotationSpeed*delta) % 360;
      if (p.angle < 0) p.angle += 360;
    } else if (p.keyState[KEY_CODES.RIGHT]) {
      p.state = 2;
      p.angle = (p.angle + p.rotationSpeed*delta) % 360;
      if (p.angle < 0) p.angle += 360;
    } else if (p.keyState[KEY_CODES.UP]) {
      p.state = 3;
      p.x += p.forwardSpeed*delta*Math.cos(TO_RADIANS*p.angle);
      p.y += p.forwardSpeed*delta*Math.sin(TO_RADIANS*p.angle);
    }
    p.lastMovedTime = Date.now();
  }
}

function gameLoop() {
  movePlayers();
  sendUpdates();
}
