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
var Missile = require('./Missile.js').Missile;
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
var missiles = [];
var scores = [];
//var numAsteroids = 1000;
var healthLimit = 100;
var shieldLimit = 200;
var numResources = 200;
var asteroidBelts = [[500,1000,0.00002,0.00001,0,360],[1000,1100,0.0004,0.00001,0,360],[1150,2000,0.00006,0.00006,0,360],[2200,3000,0.0001,0.0001,0,360]];
var baseRadius = 300;
var baseShieldRadius = 400
var junkPrice = 10;
var gridSize = 500;
var idCounter = 0;
var frameDelay = 40;
var missileSpeed = 100;
var fireRates = [0,1,2,3];
var fuelCapacities = [60,120,240,480];
var junkCapacities = [5,10,20,40];
var weaponDamage = [0,20,40,60]
var STARTER_SHIP = 0;
var KEY_CODES = {
  LEFT: 37,
  UP: 38,
  RIGHT: 39,
  DOWN: 40,
  SPACE: 32
};
var TO_RADIANS = Math.PI/180; 
var mapCurrXLimits = [-3000,3000];
var mapCurrYLimits = [-3000,3000];

//Prices
var fuelPrice = 20;
var healPrice = 20;
var shieldPrice = 50;
var holdPrice = 100;
var weaponPrice = 100;
var enginePrice = 100;

//Grid variables
var numNegXGrids = -Math.min(Math.floor(mapCurrXLimits[0]/gridSize),0);
var numNegYGrids = -Math.min(Math.floor(mapCurrYLimits[0]/gridSize),0);
var lastXGridIndex = Math.ceil((mapCurrXLimits[1]-mapCurrXLimits[0])/gridSize);
var lastYGridIndex = Math.ceil((mapCurrYLimits[1]-mapCurrYLimits[0])/gridSize);

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
  socket.on('refillfuel', function(response){
    var playerIsNearShop = (player.x*player.x + player.y*player.y < baseShieldRadius*baseShieldRadius)
    if (player.starterShip) var fuelCapacity = fuelCapacities[STARTER_SHIP];
    else var fuelCapacity = fuelCapacities[player.holdLevel+1];
    if (player.cash >= fuelPrice && player.fuel < fuelCapacity && playerIsNearShop) {
      player.fuel = Math.min(player.fuel+20,fuelCapacity);
      player.cash -= 20;
      socket.emit('refillfuel',true);
    } else {
      socket.emit('refillfuel',false);
    }
  });
  socket.on('refillhealth', function(response){
    var playerIsNearShop = (player.x*player.x + player.y*player.y < baseShieldRadius*baseShieldRadius)
    if (player.cash >= healPrice && player.health <= healthLimit && playerIsNearShop) {
      player.health = Math.min(player.health+20,healthLimit);
      player.cash -= 20;
      socket.emit('refillhealth',true);
    } else {
      socket.emit('refillhealth',false);
    }
  });
  socket.on('upgradeshield', function(data){
    var playerIsNearShop = (player.x*player.x + player.y*player.y < baseShieldRadius*baseShieldRadius)
    if (player.cash >= shieldPrice && playerIsNearShop && player.shield <= shieldLimit ) {
      player.shield = Math.min(player.shield+20,shieldLimit);
      player.cash -= 50;
      socket.emit('upgradeshield',true);
    } else {
      socket.emit('upgradeshield',false);
    }
  });
  socket.on('upgradeship', function(response){
    var playerIsNearShop = (player.x*player.x + player.y*player.y < baseShieldRadius*baseShieldRadius)
    if (player.starterShip && player.cash >= holdPrice && playerIsNearShop) {
      player.starterShip = false;
      player.junkCapacity += 20;
      player.fuelCapacity += 20;
      player.cash -= 100;
      socket.emit('upgradeship',true);
    } else {
      socket.emit('upgradeship',false);
    }
  });
  socket.on('upgradehold', function(response){
    var playerIsNearShop = (player.x*player.x + player.y*player.y < baseShieldRadius*baseShieldRadius)
    if (!player.starterShip && player.cash >= holdPrice && player.holdLevel < 2 && playerIsNearShop) {
      player.holdLevel += 1;
      player.cash -= 100;
      socket.emit('upgradehold',true);
    } else {
      socket.emit('upgradehold',false);
    }
  });
  socket.on('upgradeweapon', function(response){
    var playerIsNearShop = (player.x*player.x + player.y*player.y < baseShieldRadius*baseShieldRadius)
    if (!player.starterShip && player.cash >= weaponPrice && player.weaponLevel < 2 && playerIsNearShop) {
      player.weaponLevel += 1;
      player.weaponDamage += 100
      player.cash -= 100;
      socket.emit('upgradeweapon',true);
    } else {
      socket.emit('upgradeweapon',false);
    }
  });
  socket.on('upgradeengine', function(response){
    var playerIsNearShop = (player.x*player.x + player.y*player.y < baseShieldRadius*baseShieldRadius)
    if (!player.starterShip && player.cash >= enginePrice && player.engineLevel < 2 && playerIsNearShop) {
      player.engineLevel += 1;
      player.accelerationX += 20;
      player.accelerationY += 20;
      player.cash -= 100;
      socket.emit('upgradeengine',true);
    } else {
      socket.emit('upgradeengine',false);
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
  for (var i = 0; i < asteroidBelts.length; i++) {
    var b = asteroidBelts[i];
    var width = b[1]-b[0];
    var area = Math.PI*(b[1]*b[1] - b[0]*b[0]);
    var numAsteroids = area*b[2];
    var numResources = area*b[3];
    for (var j = 0; j < numAsteroids; j++) {
      var r = Math.random()*(b[1]-b[0])+b[0];
      var angle = Math.floor(Math.random()*360);
      asteroids.push(new Asteroid(genID(),r*Math.cos(angle),r*Math.sin(angle),Math.floor(Math.random()*360),i));
    }
    for (var j = 0; j < numResources; j++) {
      var r = Math.random()*(b[1]-b[0])+b[0];
      var angle = Math.floor(Math.random()*360);
      resources.push(new Resource(genID(),r*Math.cos(angle),r*Math.sin(angle),'standard',i));
    }
  }
  /*for (var i = 0; i < numAsteroids; i++) {
    asteroids.push(new Asteroid(genID(),(Math.random()*width)-(width/2),(Math.random()*height)-(height/2),Math.floor(Math.random()*360),i));
  }*/
  /*for (var i = 0; i < numResources; i++) {
    resources.push(new Resource(genID(),(Math.random()*width)-(width/2),(Math.random()*height)-(height/2),'standard',i));
  }*/
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

function acceleratePlayers() {
  for (var i = 0; i < players.length; i++) {
    var p = players[i];
    var delta = (Date.now()-p.lastMovedTime)/1000.0;
    if (Date.now() - p.lastCollisionTime > 500) {
      if (p.keyState[KEY_CODES.LEFT]) {
        if (p.fuel >= delta) {
          p.fuel -= delta;
          p.state = 1;
          p.angle = (p.angle - p.rotationSpeed*delta) % 360;
          if (p.angle < 0) p.angle += 360;
        }
      } else if (p.keyState[KEY_CODES.RIGHT]) {
        if (p.fuel >= delta) {
          p.fuel -= delta;
          p.state = 2;
          p.angle = (p.angle + p.rotationSpeed*delta) % 360;
          if (p.angle < 0) p.angle += 360;
        }
      } else if (p.keyState[KEY_CODES.UP]) {
        if (p.fuel >= delta) {
          p.speedX += p.accelerationX*delta*Math.cos(TO_RADIANS*p.angle);
          p.speedY += p.accelerationY*delta*Math.sin(TO_RADIANS*p.angle);
          p.fuel -= delta;
          p.state = 3;
        }
      } else {
        p.state = 0;
      }
      p.x += p.speedX*delta;//*Math.cos(TO_RADIANS*p.angle);
      p.y += p.speedY*delta;//*Math.sin(TO_RADIANS*p.angle);
      p.lastMovedTime = Date.now();
      if (p.x - p.canvasSize.width/2 - 100 < mapCurrXLimits[0]) {
        mapCurrXLimits[0] = p.x - p.canvasSize.width/2 - 100;
        updateGrids();
      }
      if (p.x + p.canvasSize.width/2 + 100 > mapCurrXLimits[1]) {
        mapCurrXLimits[1] = p.x + p.canvasSize.width/2 + 100;
        updateGrids();
      }
      if (p.y - p.canvasSize.height/2 - 100 < mapCurrYLimits[0]) {
        mapCurrYLimits[0] = p.y - p.canvasSize.height/2 - 100;
        updateGrids();
      }
      if (p.y + p.canvasSize.height/2 + 100 > mapCurrYLimits[1]) {
        mapCurrYLimits[1] = p.y + p.canvasSize.height/2 + 100;
        updateGrids();
      }
    } else {
      p.lastMovedTime = Date.now();
    }
  } 
}

function updateGrids() {
  numNegXGrids = -Math.min(Math.floor(mapCurrXLimits[0]/gridSize),0);
  numNegYGrids = -Math.min(Math.floor(mapCurrYLimits[0]/gridSize),0);
  lastXGridIndex = Math.ceil((mapCurrXLimits[1]-mapCurrXLimits[0])/gridSize);
  lastYGridIndex = Math.ceil((mapCurrYLimits[1]-mapCurrYLimits[0])/gridSize);
}

function moveMissiles() {
  for (var i = 0; i < missiles.length; i++) {
    var m = missiles[i];
    if (m.health > 0) {
      var delta = (Date.now()-m.lastMovedTime)/1000.0;
      m.x += missileSpeed*delta*Math.cos(TO_RADIANS*m.angle);
      m.y += missileSpeed*delta*Math.sin(TO_RADIANS*m.angle);
      m.lastMovedTime = Date.now();
      if (m.x < mapCurrXLimits[0] || m.x > mapCurrXLimits[1] || m.y < mapCurrYLimits[0] || m.y > mapCurrYLimits[1] || m.x*m.x + m.y*m.y < baseShieldRadius*baseShieldRadius) {
        m.health = 0;
      }
    }
  }
}

function sortObjectsIntoGrids(objects) {
  var grids = [];
  for (var w = mapCurrXLimits[0]; w <= mapCurrXLimits[1]; w += gridSize) {
    var gridCol = [];
    for (var h = mapCurrYLimits[0]; h <= mapCurrYLimits[1]; h += gridSize) {
      gridCol.push([]);
    }
    grids.push(gridCol);
  }
  var numNegXGrids = -Math.min(Math.floor(mapCurrXLimits[0]/gridSize),0);
  var numNegYGrids = -Math.min(Math.floor(mapCurrYLimits[0]/gridSize),0);
  for (var i = 0; i < objects.length; i++) {
    grids[Math.floor(objects[i].x/gridSize)+numNegXGrids][Math.floor(objects[i].y/gridSize)+numNegYGrids].push(objects[i]);
  }
  return grids;
}

function calculateRequiredObjects(p,gridPlayers,gridAsteroids,gridResources,gridMissiles) {
  var playersToSend = [];
  var asteroidsToSend = [];
  var resourcesToSend = [];
  var missilesToSend = [];
  var startXGrid = Math.max(Math.floor((p.x-(p.canvasSize.width/2))/gridSize)+numNegXGrids,0);
  var endXGrid = Math.min(Math.floor((p.x+(p.canvasSize.width/2))/gridSize)+numNegXGrids,lastXGridIndex);
  var startYGrid = Math.max(Math.floor((p.y-(p.canvasSize.height/2))/gridSize)+numNegYGrids,0);
  var endYGrid = Math.min(Math.floor((p.y+(p.canvasSize.height/2))/gridSize)+numNegYGrids,lastYGridIndex);
  for (var x = startXGrid; x <= endXGrid; x++) {
    for (var y = startYGrid; y <= endYGrid; y++) {
      playersToSend = playersToSend.concat(gridPlayers[x][y]);
      asteroidsToSend = asteroidsToSend.concat(gridAsteroids[x][y]);
      resourcesToSend = resourcesToSend.concat(gridResources[x][y]);
      missilesToSend = missilesToSend.concat(gridMissiles[x][y]);
    }
  }
  return {
    players: playersToSend,
    asteroids: asteroidsToSend,
    resources: resourcesToSend,
    missiles: missiles
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
        if (p.starterShip) var junkCapacity = junkCapacities[STARTER_SHIP];
        else var junkCapacity = junkCapacities[p.holdLevel+1];
        if (junkCapacity > p.junk) {
          o.health -= 20;
          p.junk += 1;
        }
      } else if (o.type == 'asteroid') {
        o.health -= 20;
        p.lastCollisionTime = Date.now();
        if (p.shield >= 20) p.shield -= 20;
        else if (p.shield == 0) p.health -= 20;
        else {
          p.health -= (20-p.shield);
          p.shield = 0;
        }
      } else if (o.type == 'missile' && o.shooterID != p.id) {
        o.health -= 20;
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

function asteroidMissileCollisions(gridAsteroids,gridMissiles) {
  for (var x = 0; x < gridAsteroids.length; x++) {
    for (var y = 0; y < gridAsteroids[x].length; y++) {
      for (var i = 0; i < gridAsteroids[x][y].length; i++) {
        for (var j = 0; j < gridMissiles[x][y].length; j++) {
          var a = gridAsteroids[x][y][i];
          var m = gridMissiles[x][y][j];
          var xDiff = a.x - m.x;
          var yDiff = a.y - m.y;
          var collDist = (a.width/2) + (m.width/2);
          if (a.health > 0 && m.health > 0 && xDiff*xDiff + yDiff*yDiff < collDist*collDist) {
            a.health -= 20;
            m.health = 0;
            m.timeOfDeath = Date.now()-401;
            m.timeSinceDeath = 401;
          }
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
  for (var i = 0; i < missiles.length; i++) {
    missiles[i].ind = i;
  }
  var deleteAsteroidList = [];
  var deleteResourceList = [];
  var deleteMissilesList = [];
  var gridPlayers = sortObjectsIntoGrids(players);
  var gridAsteroids = sortObjectsIntoGrids(asteroids);
  var gridResources = sortObjectsIntoGrids(resources);
  var gridMissiles = sortObjectsIntoGrids(missiles);

  asteroidMissileCollisions(gridAsteroids,gridMissiles);

  for (var i = 0; i < players.length; i++) {
    var p = players[i];
    var socket = io.sockets.connected[p.id];
    
    // Find out what each user should be able to see
    var objsToSend = calculateRequiredObjects(p,gridPlayers,gridAsteroids,gridResources,gridMissiles);

    checkForCollosions(p,objsToSend.asteroids);
    checkForCollosions(p,objsToSend.resources);
    checkForCollosions(p,objsToSend.missiles);

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

    for (var j = 0; j < objsToSend.missiles.length; j++) {
      var ind = objsToSend.missiles[j].ind;
      if (missiles[ind].health <= 0) {
        if (missiles[ind].timeOfDeath == null) {
          missiles[ind].timeOfDeath = Date.now();
        } else {
          missiles[ind].timeSinceDeath = Date.now() - missiles[ind].timeOfDeath;
        }
        if (missiles[ind].timeSinceDeath > 400) deleteMissilesList.push(ind);
      }
    }

    // Send updates
    if (typeof(socket) != 'undefined') {
      socket.emit('player',p);
      objsToSend.scores = scores;
      socket.emit('gamedata',objsToSend);
    } else {
      console.log('Warning: Socket undefined.')
      players.splice(i);
      i--;
    }
  }
  for (var i = 0; i < spectators.length; i++) {
    var s = spectators[i];
    var socket = io.sockets.connected[s.id];
    var objsToSend = calculateRequiredObjects(s,gridPlayers,gridAsteroids,gridResources,gridMissiles);
    objsToSend.scores = scores;
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
  for(var i = deleteMissilesList.length-1; i >= 0; i--) {
    missiles.splice(deleteMissilesList[i],1);
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
    scores = [[players[0].name,players[0].cash]];
    for (var i = 1; i < players.length; i++) {
      for (var j = 0; j < scores.length + 1; j++) {
        if (j == scores.length || players[i].cash > scores[j][1]) {
          scores.splice(j,0,[players[i].name,players[i].cash]);
          break;
        }
      }
    }
    scores = scores.splice(0,10);
  }
}

function clearJunk() {
  for (var i = 0; i < players.length; i++) {
    var p = players[i];
    if (p.x*p.x + p.y*p.y < baseRadius*baseRadius) {
      p.cash += p.junk*junkPrice;
      p.junk = 0;
      if (!p.hitShop) {
        p.hitShop = true;
        p.keyState = {};
        p.speedX = 0;
        p.speedY = 0;
      }
    } else {
      p.hitShop = false;
    }
  }
}

function regenObjects() {
  //var belts = []
  //for (var i = 0; i < asteroids; i++) {
  //}
  //run every 10 seconds
  // calculate density of asteroids in each ring, compare to set levels
}

function fireMissiles() {
  for (var i = 0; i < players.length; i++) {
    var p = players[i];
    if (p.starterShip) var fireRate = fireRates[STARTER_SHIP];
    else var fireRate = fireRates[p.weaponLevel+1];
    if (p.keyState[KEY_CODES.SPACE] && Date.now() - p.lastFiredTime > 1000/fireRate) {
      //Create missile
      var missile = new Missile(genID(),p.x+5*Math.cos(p.angle*TO_RADIANS),p.y+5*Math.sin(p.angle*TO_RADIANS),p.angle,missiles.length,p.id);
      missiles.push(missile);
      p.lastFiredTime = Date.now();
    }
  }
}

function gameLoop() {
  fireMissiles();
  regenObjects();
  clearJunk();
  checkPlayers();
  acceleratePlayers();
  moveMissiles();
  getScores();
  sendUpdates();
}
