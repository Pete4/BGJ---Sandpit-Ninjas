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
var gridSize = 500;
var idCounter = 0;
var frameDelay = 25;
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
  socket.on('canvassize', function(canvasSize) {
    if (typeof(player) != 'undefined') {
      player.canvasSize = canvasSize;
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
    asteroids.push(new Asteroid(genID(),32+Math.random()*(mapWidth-64),32+Math.random()*(mapHeight-64),Math.floor(Math.random()*360)));
  }
  for (var i = 0; i < numResources; i++) {
    resources.push(new Resource(genID(),32+Math.random()*(mapWidth-64),32+Math.random()*(mapHeight-64),'standard'));
  }
}

function movePlayers() {
  for (var i = 0; i < players.length; i++) {
    var p = players[i];
    var delta = (Date.now()-p.lastMovedTime)/1000.0;
    
    if (p.keyState[KEY_CODES.LEFT]) {
      p.fuel -= delta;
      p.state = 1;
      p.angle = (p.angle - p.rotationSpeed*delta) % 360;
      if (p.angle < 0) p.angle += 360;
    } else if (p.keyState[KEY_CODES.RIGHT]) {
      p.fuel -= delta;
      p.state = 2;
      p.angle = (p.angle + p.rotationSpeed*delta) % 360;
      if (p.angle < 0) p.angle += 360;
    } else if (p.keyState[KEY_CODES.UP]) {
      p.fuel -= delta;
      p.state = 3;
      p.x += p.forwardSpeed*delta*Math.cos(TO_RADIANS*p.angle);
      p.y += p.forwardSpeed*delta*Math.sin(TO_RADIANS*p.angle);
    } else {
      p.state = 0;
    }
    if (p.x < 32) p.x = 32;
    if (p.y < 32) p.y = 32;
    if (p.x > mapWidth-32) p.x = mapWidth-32;
    if (p.y > mapHeight-32) p.y = mapHeight-32;
    p.lastMovedTime = Date.now();
  }
}

function sortObjectsIntoGrids(objects) {
  var grids = [];
  for (var w = 0; w < mapWidth; w += gridSize) {
    var gridCol = [];
    for (var h = 0; h < mapHeight; h += gridSize) {
      gridCol.push([]);
    }
    grids.push(gridCol);
  }
  for (var i = 0; i < objects.length; i++) {
    grids[Math.floor(objects[i].x/gridSize)][Math.floor(objects[i].y/gridSize)].push(objects[i]);
  }
  return grids;
}

function sendUpdates() {
  var gridPlayers = sortObjectsIntoGrids(players);
  var gridAsteroids = sortObjectsIntoGrids(asteroids);
  var gridResources = sortObjectsIntoGrids(resources);
  for (var i = 0; i < players.length; i++) {
    var socket = io.sockets.connected[players[i].id];
    //var gamedata = {players:players, asteroids:asteroids, resources:resources};
    
    // Find out what each user should be able to see
    var playersToSend = [];
    var asteroidsToSend = [];
    var resourcesToSend = [];
    var startXGrid = Math.max(Math.floor((players[i].x-(players[i].canvasSize.width/2))/gridSize),0);
    var endXGrid = Math.min(Math.floor((players[i].x+(players[i].canvasSize.width/2))/gridSize),Math.floor((mapWidth-1)/gridSize));
    var startYGrid = Math.max(Math.floor((players[i].y-(players[i].canvasSize.height/2))/gridSize),0);
    var endYGrid = Math.min(Math.floor((players[i].y+(players[i].canvasSize.height/2))/gridSize),Math.floor((mapWidth-1)/gridSize));
    for (var x = startXGrid; x <= endXGrid; x++) {
      for (var y = startYGrid; y <= endYGrid; y++) {
        playersToSend = playersToSend.concat(gridPlayers[x][y]);
        asteroidsToSend = asteroidsToSend.concat(gridAsteroids[x][y]);
        resourcesToSend = resourcesToSend.concat(gridResources[x][y]);
      }
    }
    console.log(asteroidsToSend.length)
    var gamedata = {players:playersToSend, asteroids:asteroidsToSend, resources:resourcesToSend};

    // Send updates
    if (typeof(socket) != 'undefined') {
      socket.emit('player',players[i]);
      socket.emit('gamedata',gamedata);
    }
  }
}

function gameLoop() {
  if (players.length != 0) {
    movePlayers();
    sendUpdates();
  }
}
