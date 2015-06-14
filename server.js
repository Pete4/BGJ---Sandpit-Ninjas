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

var spectators = [];
var players = [];
var asteroids = [];
var resources = [];
var scores = [];
var numAsteroids = 1000;
var numResources = 200;
var gridSize = 500;
var idCounter = 0;
var frameDelay = 35;
var KEY_CODES = {
  LEFT: 37,
  UP: 38,
  RIGHT: 39,
  DOWN: 40
};
var TO_RADIANS = Math.PI/180; 
var mapCurrXLimits = [-3000,3000];
var mapCurrYLimits = [-3000,3000];

io.on('connection', function(socket) {
  if (players.length == 0) console.log('A user connected. There is now '+(spectators.length+players.length+1).toString()+' user.');
  else console.log('A user connected. There are now '+(spectators.length+players.length+1).toString()+' users.');
  var spectator = new Player(socket.id,'spectator');
  spectators.push(spectator);
  var player;

  socket.on('start', function(name) {
    console.log('start');
    if (typeof(name) == 'string') {
      if (name == '') {
        socket.emit('validation response',{answer:false,message:'You must have a name.'});
      } else if (name.length > 10) {
        socket.emit('validation response',{answer:false,message:'Max name length is 10 character.'});
      } else {
        var nameTaken = false;
        for (var i = 0; i < players.length; i++) {
          if (players[i].name == name) {
            nameTaken = true;
            break;
          }
        }
        if (nameTaken) {
          socket.emit('validation response',{answer:false,message:'That name is already taken.'});  
        } else {
          socket.emit('validation response',{answer:true});
          console.log('player added');
          spectators.splice(spectators.indexOf(spectator),1);
          player = new Player(socket.id,name);
          players.push(player);
          socket.emit('player',player);
          socket.emit('ping','');
          player.pingStart = Date.now();
        }
      }
    }
  });

  socket.on('keyupdate', function(keyState) {
    if (typeof(player) != 'undefined') {
      player.keyState = keyState;
      player.lastMovedTime = Date.now();
    }
  });
  socket.on('disconnect', function() {
    if (typeof(player) != 'undefined') {
      io.emit('remove player',player.id);
      players.splice(players.indexOf(player), 1);
      if (players.length == 1) console.log('A user disconnected. There is now 1 player.');
      else console.log('A user disconnected. There are now '+(players.length).toString()+' players.');
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
  var width = 6000;
  var height = 6000;
  for (var i = 0; i < numAsteroids; i++) {
    asteroids.push(new Asteroid(genID(),(Math.random()*width)-(width/2),(Math.random()*height)-(height/2),Math.floor(Math.random()*360),i));
  }
  for (var i = 0; i < numResources; i++) {
    resources.push(new Resource(genID(),(Math.random()*width)-(width/2),(Math.random()*height)-(height/2),'standard',i));
  }
}

function movePlayers() {
  for (var i = 0; i < players.length; i++) {
    var p = players[i];
    var delta = (Date.now()-p.lastMovedTime)/1000.0;
    if (Date.now() - p.lastCollisionTime > 500) {
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
      p.lastMovedTime = Date.now();
    }
  }
}

function sortObjectsIntoGrids(objects) {
  var grids = [];
  for (var w = mapCurrXLimits[0]; w <= mapCurrXLimits[1]; w += gridSize) {
    var gridCol = [];
    for (var h = mapCurrXLimits[0]; h <= mapCurrXLimits[1]; h += gridSize) {
      gridCol.push([]);
    }
    grids.push(gridCol);
  }
  var numNegXGrids = -Math.min(mapCurrXLimits[0]/gridSize,0);
  var numNegYGrids = -Math.min(mapCurrYLimits[0]/gridSize,0);
  for (var i = 0; i < objects.length; i++) {
    grids[Math.floor(objects[i].x/gridSize)+numNegXGrids][Math.floor(objects[i].y/gridSize)+numNegYGrids].push(objects[i]);
  }
  return grids;
}

function calculateRequiredObjects(p,gridPlayers,gridAsteroids,gridResources) {
  var playersToSend = [];
  var asteroidsToSend = [];
  var resourcesToSend = [];
  var numNegXGrids = -Math.min(mapCurrXLimits[0]/gridSize,0);
  var numNegYGrids = -Math.min(mapCurrYLimits[0]/gridSize,0);
  var lastXGridIndex = Math.ceil((mapCurrXLimits[1]-mapCurrXLimits[0])/gridSize);
  var lastYGridIndex = Math.ceil((mapCurrYLimits[1]-mapCurrYLimits[0])/gridSize);
  var startXGrid = Math.max(Math.floor((p.x-(p.canvasSize.width/2))/gridSize)+numNegXGrids,0);
  var endXGrid = Math.min(Math.floor((p.x+(p.canvasSize.width/2))/gridSize)+numNegXGrids,lastXGridIndex);
  var startYGrid = Math.max(Math.floor((p.y-(p.canvasSize.height/2))/gridSize)+numNegYGrids,0);
  var endYGrid = Math.min(Math.floor((p.y+(p.canvasSize.height/2))/gridSize)+numNegYGrids,lastYGridIndex);
  for (var x = startXGrid; x <= endXGrid; x++) {
    for (var y = startYGrid; y <= endYGrid; y++) {
      playersToSend = playersToSend.concat(gridPlayers[x][y]);
      asteroidsToSend = asteroidsToSend.concat(gridAsteroids[x][y]);
      resourcesToSend = resourcesToSend.concat(gridResources[x][y]);
    }
  }
  return {
    players: playersToSend,
    asteroids: asteroidsToSend,
    resources: resourcesToSend
  };
}

function checkForCollosions(p,objects) {
  for (var i = 0; i < objects.length; i++) {
    var o = objects[i];
    var xDiff = p.x - o.x;
    var yDiff = p.y - o.y;
    var collDist = (o.width/2)*0.85 + (p.width/2)*0.85;
    if (o.health > 0 && xDiff*xDiff + yDiff*yDiff < collDist*collDist) {
      // Collision has occurred!
      if (o.type == 'standard') {
        if (p.hullCapacity > p.junk) {
          o.health -= 100;
          p.junk += 1;
        }
      } else if (o.type == 'asteroid') {
        o.health -= 100;
        p.lastCollisionTime = Date.now();
        if (p.shield >= 20) p.shield -= 20;
        else if (p.shield == 0) p.health -= 20;
        else {
          p.health -= (20-p.shield);
          p.shield = 0;
        }
      }
    }
  }
}

function sendUpdates() {
  for (var i = 0; i < asteroids.length; i++) {
    asteroids[i].ind = i;
  }
  for (var i = 0; i < resources.length; i++) {
    resources[i].ind = i;
  }
  var deleteAsteroidList = [];
  var deleteResourceList = [];
  var gridPlayers = sortObjectsIntoGrids(players);
  var gridAsteroids = sortObjectsIntoGrids(asteroids);
  var gridResources = sortObjectsIntoGrids(resources);

  for (var i = 0; i < players.length; i++) {
    var p = players[i];
    var socket = io.sockets.connected[p.id];
    
    // Find out what each user should be able to see
    var objsToSend = calculateRequiredObjects(p,gridPlayers,gridAsteroids,gridResources);

    checkForCollosions(p,objsToSend.asteroids);
    checkForCollosions(p,objsToSend.resources);

    for (var j = 0; j < objsToSend.asteroids.length; j++) {
      var ind = objsToSend.asteroids[j].ind;
      if (asteroids[ind].health <= 0) {
        if (asteroids[ind].timeOfDeath == null) {
          asteroids[ind].timeOfDeath = Date.now();
        } else {
          asteroids[ind].timeSinceDeath = Date.now() - asteroids[ind].timeOfDeath;
        }
        if (asteroids[ind].timeSinceDeath > 400) deleteAsteroidList.push(ind);
      }
    }

    for (var j = 0; j < objsToSend.resources.length; j++) {
      var ind = objsToSend.resources[j].ind;
      if (resources[ind].health <= 0) deleteResourceList.push(ind);
    }

    // Send updates
    if (typeof(socket) != 'undefined') {
      socket.emit('player',p);
      objects.scores = scores;
      socket.emit('gamedata',objsToSend);
    } else {
      console.log('Warning: Socket undefined.')
    }
  }
  for (var i = 0; i < spectators.length; i++) {
    var s = spectators[i];
    var socket = io.sockets.connected[s.id];
    var objsToSend = calculateRequiredObjects(s,gridPlayers,gridAsteroids,gridResources);
    objects.scores = scores;
    if (typeof(socket) != 'undefined') {
      socket.emit('gamedata',objsToSend);
    }
  }
  // Check for destroyed asteroids
  for(var i = deleteAsteroidList.length-1; i >= 0; i--) {
    asteroids.splice(deleteAsteroidList[i],1);
  }
  for(var i = deleteResourceList.length-1; i >= 0; i--) {
    resources.splice(deleteResourceList[i],1);
  }
}

function checkPlayers() {
  for (var i = 0; i < players.length; i++) {
    if (players[i].health <= 0) {
      players.splice(i,1);
      break;
    }
  }
}

function getScores() {
  if (players.length != 0) {
    scores = [[players[0].name,players[0].score]];
    for (var i = 1; i < players.length; i++) {
      for (var j = 0; j < scores.length + 1; j++) {
        if (j == scores.length || players[i].score > scores[j][1]) {
          scores.splice(j,0,[players[i].name,players[i].score]);
          break;
        }
      }
    }
    scores = scores.splice(0,10);
  }
}

function gameLoop() {
  checkPlayers();
  movePlayers();
  getScores();
  sendUpdates();
}
