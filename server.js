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
var asteroidBelts = [
  [ 500,1000 ,0.00002,0.00001,1],
  [1000,1100 ,0.0004 ,0.     ,1], /* Dense belt */
  [1100,2000 ,0.00006,0.00004,1],
  [2000,2100 ,0.0004 ,0      ,1], /* Dense belt */
  [2100,3000 ,0.00008,0.00004,1],
  [3000,3100 ,0.0004 ,0      ,1], /* Dense belt */
  [3100,4950 ,0.00001,0.00004,1],
  [4950,5000 ,0.0004 ,0      ,1] /* Dense belt */
];
var baseRadius = 300;
var baseShieldRadius = 400
var junkPrice = 20;
var gridSize = 200;
var idCounter = 0;
var frameDelay = 30;
var missileSpeed = 100;
var fireRates = [0,1,2,3];
var fuelCapacities = [60,120,240,480];
var junkCapacities = [5,10,20,40];
//var weaponDamage = [0,20,40,60]
var STARTER_SHIP = 0;
var KEY_CODES = {
  LEFT: 37,
  UP: 38,
  RIGHT: 39,
  DOWN: 40,
  SPACE: 32
};
var TO_RADIANS = Math.PI/180; 
var mapCurrXLimits = [-10000,10000];
var mapCurrYLimits = [-10000,10000];

var asteroidClass = {
  id: 0,
  ind: 1,
  x: 2,
  y: 3,
  health: 4,
  angle: 5,
  width: 6,
  height: 7,
  timeOfDeath: 8,
  timeSinceDeath: 9,
  lastMoveTime: 10,
  type: 11,
  imageNum: 12
};

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
  var spectator = new Player(socket.id,'spectator');
  spectators.push(spectator);
  if (spectators.length + players.length == 1) console.log('A user connected. There is now 1 user.');
  else console.log('A user connected. There are now '+(spectators.length + players.length).toString()+' users.');
  var player;

  socket.on('start', function(name) {
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
          spectator = null
          spectators.splice(spectators.indexOf(spectator),1);
          player = new Player(socket.id,name);
          players.push(player);
          socket.emit('player',player);
          socket.emit('ping','');
          player.pingStart = Date.now();
          if (players.length == 1) console.log('Player added. There is now 1 player.');
          else console.log('Player added. There are now '+(players.length).toString()+' players.');
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
      players.splice(players.indexOf(player), 1);
      if (spectators.length + players.length == 1) console.log('A user disconnected. There is now 1 user.');
      else console.log('A user disconnected. There are now '+(spectators.length + players.length).toString()+' users.');
    } else if (spectator != null) {
      spectator = null;
      spectators.splice(spectators.indexOf(spectator),1);
      if (spectators.length + players.length == 1) console.log('A user disconnected. There is now 1 user.');
      else console.log('A user disconnected. There are now '+(spectators.length + players.length).toString()+' users.');
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
    if (player.cash >= healPrice && player.health < healthLimit && playerIsNearShop) {
      player.health = Math.min(player.health+20,healthLimit);
      player.cash -= 20;
      socket.emit('refillhealth',true);
    } else {
      socket.emit('refillhealth',false);
    }
  });
  socket.on('upgradeshield', function(data){
    var playerIsNearShop = (player.x*player.x + player.y*player.y < baseShieldRadius*baseShieldRadius)
    if (player.cash >= shieldPrice && playerIsNearShop && player.shield < shieldLimit ) {
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
    if (b[4]) {
      var width = b[1]-b[0];
      var area = Math.PI*(b[1]*b[1] - b[0]*b[0]);
      var numAsteroids = area*b[2];
      var numResources = area*b[3];
      for (var j = 0; j < numAsteroids; j++) {
        var r = Math.random()*(b[1]-b[0])+b[0];
        var angle = Math.random()*360;
        asteroids.push(new Asteroid(genID(),r*Math.cos(angle),r*Math.sin(angle),Math.random()*360,Math.floor(Math.random()*3)));
      }
      for (var j = 0; j < numResources; j++) {
        var r = Math.random()*(b[1]-b[0])+b[0];
        var angle = Math.random()*360;
        resources.push(new Resource(genID(),r*Math.cos(angle),r*Math.sin(angle),'s'));
      }
    }
  }
}

function isNearPlayers(x,y,dist) {
  for (var i = 0; i < players.length; i++) {
    var xDiff = (x-players[i].x);
    var yDiff = (y-players[i].y);
    if (xDiff*xDiff + yDiff*yDiff < dist*dist) return true;
  }
  return false
}

function genPositionAwayFromPlayers(minRad,maxRad) {
  var r = Math.random()*(maxRad-minRad)+minRad;
  var angle = Math.random()*360;
  var x = r*Math.cos(angle);
  var y = r*Math.sin(angle);
  var nearPlayer = false;
  var dist = 1000;
  var i = 0;
  while (isNearPlayers(x,y,dist)) {
    r = Math.random()*(maxRad-minRad)+minRad;
    angle = Math.random()*360;
    x = r*Math.cos(angle);
    y = r*Math.sin(angle);
    i++;
    if (i % 5 == 0) dist *= 0.75;
  }
  return {x:x,y:y};
}

function genAsteroid(minRad,maxRad) {
  var pos = genPositionAwayFromPlayers(minRad,maxRad);
  asteroids.push(new Asteroid(genID(),pos.x,pos.y,Math.random()*360,Math.floor(Math.random()*3)));
}

function genResource(minRad,maxRad) {
  var pos = genPositionAwayFromPlayers(minRad,maxRad);
  resources.push(new Resource(genID(),pos.x,pos.y,'s'));
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
      p.x += p.speedX*delta;
      p.y += p.speedY*delta;
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
      if (m.x < mapCurrXLimits[0] || m.x > mapCurrXLimits[1] || m.y < mapCurrYLimits[0] || m.y > mapCurrYLimits[1]) {
        missiles.splice(i,1);
        i--;
        continue;
      } else if (m.x*m.x + m.y*m.y < baseShieldRadius*baseShieldRadius) {
        m.health = 0;
        m.displayExplosion = true;
      }
    }
  }
}

function sortObjectsIntoGrids(objects) {
  var grids = [];
  for (var w = mapCurrXLimits[0]; w <= mapCurrXLimits[1]+1; w += gridSize) {
    var gridCol = [];
    for (var h = mapCurrYLimits[0]; h <= mapCurrYLimits[1]+1; h += gridSize) {
      gridCol.push([]);
    }
    grids.push(gridCol);
  }
  var numNegXGrids = -Math.min(Math.floor(mapCurrXLimits[0]/gridSize),0);
  var numNegYGrids = -Math.min(Math.floor(mapCurrYLimits[0]/gridSize),0);
  for (var i = 0; i < objects.length; i++) {
    grids[Math.floor(objects[i].x/gridSize)+numNegXGrids][Math.floor(objects[i].y/gridSize)+numNegYGrids].push(i);
  }
  return grids;
}

function calculateRequiredObjects(p,gridPlayers,gridAsteroids,gridResources,gridMissiles) {
  var playersToSend = [];
  var playersToSendInds = [];
  var asteroidsToSend = [];
  var asteroidsToSendInds = [];
  var resourcesToSend = [];
  var resourcesToSendInds = [];
  var missilesToSend = [];
  var missilesToSendInds = [];
  var startXGrid = Math.max(Math.floor((p.x-(p.canvasSize.width/2))/gridSize)+numNegXGrids,0);
  var endXGrid = Math.min(Math.floor((p.x+(p.canvasSize.width/2))/gridSize)+numNegXGrids,lastXGridIndex);
  var startYGrid = Math.max(Math.floor((p.y-(p.canvasSize.height/2))/gridSize)+numNegYGrids,0);
  var endYGrid = Math.min(Math.floor((p.y+(p.canvasSize.height/2))/gridSize)+numNegYGrids,lastYGridIndex);
  for (var x = startXGrid; x <= endXGrid; x++) {
    for (var y = startYGrid; y <= endYGrid; y++) {
      for (var i = 0; i < gridPlayers[x][y].length; i++) {
        var o = players[gridPlayers[x][y][i]];
        //if (typeof(o) != 'undefined') {
          var arrayOfValues = [
            o.x,
            o.y,
            o.width,
            Math.floor(o.angle),
            o.health,
            o.name,
            o.holdLevel,
            o.weaponLevel,
            o.engineLevel,
            o.starterShip,
            o.state
          ];
          //playersToSend.push(players[gridPlayers[x][y][i]]);
          playersToSend.push(arrayOfValues);
        //} else {
        //  console.log('WARNING: Player in grid is undefined at line 485.')
        //}
      }
      playersToSendInds = playersToSendInds.concat(gridPlayers[x][y])
      
      for (var i = 0; i < gridAsteroids[x][y].length; i++) {
        var o = asteroids[gridAsteroids[x][y][i]];
        var arrayOfValues = [
          Math.floor(o.x),
          Math.floor(o.y),
          o.width,
          Math.floor(o.angle),
          o.health,
          o.type,
          o.timeSinceDeath,
          o.imageNum
        ];
        //asteroidsToSend.push(asteroids[gridAsteroids[x][y][i]]);
        asteroidsToSend.push(arrayOfValues);
      }
      asteroidsToSendInds = asteroidsToSendInds.concat(gridAsteroids[x][y])
      
      for (var i = 0; i < gridResources[x][y].length; i++) {
        var o = resources[gridResources[x][y][i]];
        var arrayOfValues = [
          Math.floor(o.x),
          Math.floor(o.y),
          o.width,
          Math.floor(o.angle),
          o.health,
          o.type
        ];
        //resourcesToSend.push(resources[gridResources[x][y][i]]);
        resourcesToSend.push(arrayOfValues);
      }
      resourcesToSendInds = resourcesToSendInds.concat(gridResources[x][y])
      
      for (var i = 0; i < gridMissiles[x][y].length; i++) {
        var o = missiles[gridMissiles[x][y][i]];
        var arrayOfValues = [
          Math.floor(o.x),
          Math.floor(o.y),
          o.width,
          Math.floor(o.angle),
          o.health,
          o.type,
          o.timeSinceDeath,
          o.imageNum,
          o.shooterID,
          o.displayExplosion
        ];
        //missilesToSend.push(missiles[gridMissiles[x][y][i]]);
        missilesToSend.push(arrayOfValues);
      }
      missilesToSendInds = missilesToSendInds.concat(gridMissiles[x][y])
    }
  }
  return {
    objectsToSend: {
      players: playersToSend,
      asteroids: asteroidsToSend,
      resources: resourcesToSend,
      missiles: missilesToSend,
    },
    inds: {
      playerInds: playersToSendInds,
      asteroidInds: asteroidsToSendInds,
      resourceInds: resourcesToSendInds,
      missileInds: missilesToSendInds
    }
  };
}

function checkForCollosions(p,objects,objectInds) {
  var socket = io.sockets.connected[p.id];
  for (var i = 0; i < objectInds.length; i++) {
    var o = objects[objectInds[i]];
    var xDiff = p.x - o.x;
    var yDiff = p.y - o.y;
    var collDist = (o.width/2)*0.85 + (p.width/2)*0.85;
    if (o.health > 0 && xDiff*xDiff + yDiff*yDiff < collDist*collDist) {
      // Collision has occurred!
      if (o.type == 's') {
        if (p.starterShip) var junkCapacity = junkCapacities[STARTER_SHIP];
        else var junkCapacity = junkCapacities[p.holdLevel+1];
        if (junkCapacity > p.junk) {
          socket.emit('junkpickup',true);
          o.health -= 20;
          p.junk += 1;
        } 
      } else if (o.type == 'a') {
        socket.emit('asteroidHit',true);
        o.health -= 20;
        p.lastCollisionTime = Date.now();
        if (p.shield >= 20) p.shield -= 20;
        else if (p.shield == 0) p.health -= 20;
        else {
          p.health -= (20-p.shield);
          p.shield = 0;
        }
      } else if (o.type == 'm' && o.shooterID != p.id) {
        o.displayExplosion = true;
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
      // For each grid ^^
      for (var i = 0; i < gridAsteroids[x][y].length; i++) {
        // For each asteroid in the grid ^^
        for (var j = 0; j < gridMissiles[x][y].length; j++) {
          //For each missile in the grid ^^
          var a = asteroids[gridAsteroids[x][y][i]];
          var m = missiles[gridMissiles[x][y][j]];
          var xDiff = a.x - m.x;
          var yDiff = a.y - m.y;
          var collDist = (a.width/2) + (m.width/2);
          if (a.health > 0 && m.health > 0 && xDiff*xDiff + yDiff*yDiff < collDist*collDist) {
            a.health -= 20;
            m.health = 0;
          }
        }
      }
    }
  }
}

function sendUpdates() {
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

    var dist = Math.sqrt(p.x*p.x + p.y*p.y);
    if (dist > p.furthestDistance) p.furthestDistance = dist;
    
    // Find out what each user should be able to see
    var objs = calculateRequiredObjects(p,gridPlayers,gridAsteroids,gridResources,gridMissiles);
    var objsToSend = objs.objectsToSend;
    var inds = objs.inds;

    checkForCollosions(p,asteroids,inds.asteroidInds);
    checkForCollosions(p,resources,inds.resourceInds);
    checkForCollosions(p,missiles,inds.missileInds);

    for (var j = 0; j < inds.asteroidInds.length; j++) {
      var ind = inds.asteroidInds[j]
      if (asteroids[ind].health <= 0) {
        if (asteroids[ind].timeOfDeath == null) {
          asteroids[ind].timeOfDeath = Date.now();
          socket.emit('asteroidHit',true);
        }
        asteroids[ind].timeSinceDeath = Date.now() - asteroids[ind].timeOfDeath;
        if (asteroids[ind].timeSinceDeath >= 400 && !asteroids[ind].destroyed) {
          asteroids[ind].destroyed = true;
          deleteAsteroidList.push(ind);
        }
      }
    }

    for (var j = 0; j < inds.resourceInds.length; j++) {
      var ind = inds.resourceInds[j];
      if (resources[ind].health <= 0 && !resources[ind].destroyed) {
        resources[ind].destroyed = true;
        deleteResourceList.push(ind); 
      }
    }

    for (var j = 0; j < inds.missileInds.length; j++) {
      var ind = inds.missileInds[j];
      if (missiles[ind].health <= 0) {
        if (missiles[ind].timeOfDeath == null) {
          missiles[ind].timeOfDeath = Date.now();
        }
        missiles[ind].timeSinceDeath = Date.now() - missiles[ind].timeOfDeath;
        if ((missiles[ind].timeSinceDeath >= 400 || !missiles[ind].displayExplosion) && !missiles[ind].destroyed) {
          missiles[ind].destroyed = true;
          deleteMissilesList.push(ind);
        }
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
    var a = asteroids[deleteAsteroidList[i]];
    var belt = findBelt(a)
    asteroids.splice(deleteAsteroidList[i],1);
    setTimeout(function(){genAsteroid(asteroidBelts[belt][0],asteroidBelts[belt][1])},30000)
  }
  for(var i = deleteResourceList.length-1; i >= 0; i--) {
    var r = resources[deleteResourceList[i]];
    var belt = findBelt(r)
    resources.splice(deleteResourceList[i],1);
    setTimeout(function(){genResource(asteroidBelts[belt][0],asteroidBelts[belt][1])},30000)
  }
  for(var i = deleteMissilesList.length-1; i >= 0; i--) {
    missiles.splice(deleteMissilesList[i],1);
  }
}

function findBelt(object) {
  if (typeof(object) != 'undefined') {
    var dist = Math.sqrt(object.x*object.x + object.y*object.y);
    for (var j = 0; j < asteroidBelts.length; j++) {
      if (dist >= asteroidBelts[j][0] && dist <= asteroidBelts[j][1]) return j;
    }
  }
  return 0;
}

function checkPlayers() {
  for (var i = 0; i < players.length; i++) {
    if (players[i].health <= 0) {
      players.splice(i,1);
      if (players.length == 1) console.log('Player died. There is now 1 player.');
      else console.log('Player died. There are now '+(players.length).toString()+' players.');
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

function clearJunk() {
  for (var i = 0; i < players.length; i++) {
    var p = players[i];
    if (p.x*p.x + p.y*p.y < baseShieldRadius*baseShieldRadius) {
      if (p.furthestDistance > p.score) {
        p.score = Math.floor(p.furthestDistance);
      }
      p.furthestDistance = 0;
      if (p.junk > 0) {
        var socket = io.sockets.connected[p.id];
        socket.emit('moneyaudio',true);
      } 
      p.cash += p.junk*junkPrice;
      p.junk = 0;
      if (!p.hitShop && p.x*p.x + p.y*p.y < baseRadius*baseRadius) {
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

function fireMissiles() {
  for (var i = 0; i < players.length; i++) {
    var p = players[i];
    if (p.starterShip) var fireRate = fireRates[STARTER_SHIP];
    else var fireRate = fireRates[p.weaponLevel+1];
    if (p.keyState[KEY_CODES.SPACE] && Date.now() - p.lastFiredTime > 1000/fireRate && p.x*p.x + p.y*p.y > baseShieldRadius*baseShieldRadius) {
      //Create missile
      var socket = io.sockets.connected[p.id];
      socket.emit('newmissile',true);
      var missile = new Missile(genID(),p.x+5*Math.cos(p.angle*TO_RADIANS),p.y+5*Math.sin(p.angle*TO_RADIANS),p.angle,p.id);
      missiles.push(missile);
      p.lastFiredTime = Date.now();
    }
  }
}

function removeAsteroidsAndMissiles() {
  for (var i = 0; i < asteroids.length; i++) {
    if (asteroids[i].destroyed && asteroids[i].timeSinceDeath > 400) {
      var belt = findBelt(asteroids[i])
      setTimeout(function(){genAsteroid(asteroidBelts[belt][0],asteroidBelts[belt][1])},30000)
      asteroids.splice(i,1);
      i--;
      continue;
    }
  }
  for (var i = 0; i < missiles.length; i++) {
    if (missiles[i].destroyed && missiles[i].timeSinceDeath > 400) {
      missiles.splice(i,1);
      i--;
      continue;
    }
  }
}

function gameLoop() {
  //console.log(asteroids.length)
  removeAsteroidsAndMissiles();
  fireMissiles();
  clearJunk();
  checkPlayers();
  acceleratePlayers();
  moveMissiles();
  getScores();
  sendUpdates();

}
