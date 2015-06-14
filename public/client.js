"use strict"
//Game objects
var playerPresets = {x:0, y:0, angle:270, fuel:100, junk:0, health:100 ,keyState:{}, ping:0, holdLevel:0, weaponLevel:0, engineLevel:0, starterShip:true};
var player = playerPresets;
var players = []; //Other players
var asteroids = [];
var resources = [];
var scores = [];
var canvas = $("#game-canvas")[0];
var canvasSize = {height:0, width:0}
var ctx = canvas.getContext("2d");
var keyState = {};
var socket;
var frameDelay = 25;
var lastMovedTime = Date.now();
var musicWaitStartTime = Date.now();
var musicGameStartTime = Date.now();
var name = 'Bob';
var lastCollisionTime = 0;
var state = 0;
var shipAudioStartTime = Date.now();
var shopOpen = true;
var soundMuted = false;
var musicMuted = false;

//Load images
var spaceshipStationary = new Image(); spaceshipStationary.src = 'images/FirstSpace_NoFlame.png';
var spaceshipLeft = new Image(); spaceshipLeft.src = 'images/FirstSpace_RightFlame.png';
var spaceshipRight = new Image(); spaceshipRight.src = 'images/FirstSpace_LeftFlame.png';
var spaceshipForward = new Image(); spaceshipForward.src = 'images/FirstSpace.png';
var spaceship = [spaceshipStationary,spaceshipLeft,spaceshipRight,spaceshipForward]; // useful format
var asteroidImage = new Image; asteroidImage.src = 'images/Asteroid.png';
var asteroidHalfExpImage = new Image; asteroidHalfExpImage.src = 'images/AsteroidHalfExplode.png';
var asteroidExpImage = new Image; asteroidExpImage.src = 'images/AsteroidExplode.png';
var asteroid = [asteroidImage,asteroidHalfExpImage,asteroidExpImage];
var resourceImage = new Image; resourceImage.src = 'images/Resource.png';
var shieldImage = new Image; shieldImage.src = 'images/ShieldIcon.png';
var healthImage = new Image; healthImage.src = 'images/HealthIcon.png';
var fuelImage = new Image; fuelImage.src = 'images/FuelIcon.png';
var junkImage = new Image; junkImage.src = 'images/JunkIcon.png';
var blueBarImage = new Image; blueBarImage.src = 'images/BlueBar.png';
var pinkBarImage = new Image; pinkBarImage.src = 'images/PinkBar.png';
var blueWideBarImage = new Image; blueWideBarImage.src = 'images/BlueWideBar.png';
var spawnImage = new Image; spawnImage.src = 'images/spawn.png';
var arrowImage = new Image; arrowImage.src = 'images/Arrow.png';

//Modular ship images
var shipCockpit = new Image(); shipCockpit.src = 'images/ShipCockpit.png';
var shipEngines = [];
var shipStorage = [];
var shipWeapons = [];
for (var i = 1; i <= 3; i++) {
	var shipEngineOff = new Image(); shipEngineOff.src = 'images/ShipEngine'+i.toString()+'Off.png';
	var shipEngineLeft = new Image(); shipEngineLeft.src = 'images/ShipEngine'+i.toString()+'Right.png';
	var shipEngineRight = new Image(); shipEngineRight.src = 'images/ShipEngine'+i.toString()+'Left.png';
	var shipEngineBoth = new Image(); shipEngineBoth.src = 'images/ShipEngine'+i.toString()+'Both.png';
	shipEngines.push([shipEngineOff,shipEngineLeft,shipEngineRight,shipEngineBoth]);
	var shipStorageImage = new Image(); shipStorageImage.src = 'images/ShipStorage'+i.toString()+'.png';
	shipStorage.push(shipStorageImage);
	var shipWeapon = new Image(); shipWeapon.src = 'images/ShipWeapon'+i.toString()+'.png';
	shipWeapons.push(shipWeapon);
}

//Load sound effects
var audioEngineStart = new Audio('sound/engine_start.mp3');
var audioEngineStop = new Audio('sound/engine_stop.mp3');
var audioEngineOn = new Audio('sound/engine_on.mp3');
var audioCrash = new Audio('sound/crash.mp3');
var audioCollectJunk = new Audio('sound/collect_junk.mp3');
var audioGameOver = new Audio('sound/gameover.mp3');
var audioMusic_Wait = new Audio('sound/music_spacetechno.mp3');
var audioMusic_Game = new Audio('sound/music_spaceventure.mp3');
var audioError = new Audio('sound/error.mp3');
var audioMoney = new Audio('sound/money.mp3');
var audioUpgrade = new Audio('sound/upgrade.mp3');
var audioHeal = new Audio('sound/heal.mp3');
var audioFuel = new Audio('sound/fuel.mp3');

//Utilities
var usedKeys = [37, 38, 39, 40];
var KEY_CODES = {
  LEFT: 37,
  UP: 38,
  RIGHT: 39,
  DOWN: 40,
  SPACE: 32
}
var TO_RADIANS = Math.PI/180; 

window.addEventListener('keydown',function(e){
	if (usedKeys.indexOf(e.which) != -1 && !keyState[e.which]) {
		keyState[e.which] = true;
		socket.emit('keyupdate', keyState);
		lastMovedTime = Date.now();
	}
},true);
window.addEventListener('keyup',function(e){
	if (usedKeys.indexOf(e.which) != -1 && keyState[e.which]) {
		keyState[e.which] = false;
		socket.emit('keyupdate', keyState);
		lastMovedTime = Date.now();
	}
},true);
window.addEventListener("resize", function(){
	updateCanvasSize();
},true);
window.addEventListener("blur", function(){
	keyState = {}
});

$(function() {
	registerSocketHooks();
	updateCanvasSize();
	loadOverlay(false);
	
	setInterval(updateCanvas, frameDelay);
	setInterval(handleMusic, 1655);
	
	playMusic('wait');
});

function handleMusic() {
	if (!audioMusic_Wait.paused) {
		if (Date.now() > musicWaitStartTime + 26400) {
			stopMusic();
			musicWaitStartTime = Date.now();
			audioMusic_Wait.play();
		}
	}
	
	if (!audioMusic_Game.paused) {
		if (Date.now() > musicGameStartTime + 52400) {
			stopMusic();
			musicGameStartTime = Date.now();
			audioMusic_Game.play();
		}
	}
}

function playMusic(type) {
	if (!musicMuted) {
		stopMusic();
		if (type == 'wait') {
			musicWaitStartTime = Date.now();
			audioMusic_Wait.play();
		} else if (type == 'game') {
			musicGameStartTime = Date.now();
			audioMusic_Game.play();
		}
	}
}

function stopMusic() {
	audioMusic_Game.pause();
	audioMusic_Game.currentTime = 0;
	audioMusic_Wait.pause();
	audioMusic_Wait.currentTime = 0;
}

function toggleMute() {
	if (soundMuted) {
		soundMuted = false;
	} else {
		soundMuted = true;
	}
	$('.audio-mute').toggleClass('hidden');
}

function toggleMusicMute() {
	if (musicMuted) {
		musicMuted = false;
		playMusic('game');
	} else {
		musicMuted = true;
		stopMusic();
	}
	$('.music-mute').toggleClass('hidden');
}

function start() {
	name = $("#start-popup-name")[0].value;
	socket.emit('start', name);
	socket.on('validation response', function(response){
		if (response.answer == true) {
			$('#start-popup').popup('hide');
			playMusic('game');
		} else {
			$('#game-popup-response').html(response.message);
		}
    });
}

function loadOverlay(died) {
	$('#game-popup-response').html("");
	if (died){
		$('#shop-popup').popup('hide');
		$('#game-popup-response').html("You died!");
		if (!soundMuted) audioGameOver.play();
		playMusic('wait');
	}
	player = playerPresets;
	$('#start-popup').removeClass('hidden');
	$('#start-popup').popup({
		transition: 'all 0.3s',
		autoopen: true,
		escape: false,
		blur: false
	});
}

function loadShop() {
	shopOpen = true;
	updateDisplayedShopItems();
	if (player.junk) {
		if (!soundMuted) audioMoney.play();
	}
	$('#shop-popup').removeClass('hidden');
	$('#shop-popup').popup({
		transition: 'all 0.3s',
		autoopen: true
	});
}

function updateDisplayedShopItems() {
	console.log('Shop items refreshed');
	if (player.starterShip) {
		$("#shop-ship-upgrade").removeClass('hidden');
		$("#shop-hold-upgrade").addClass('hidden');
		$("#shop-weapon-upgrade").addClass('hidden');
		$("#shop-engine-upgrade").addClass('hidden');
	} else {
		$("#shop-ship-upgrade").addClass('hidden');
		$("#shop-hold-upgrade").removeClass('hidden');
		$("#shop-weapon-upgrade").removeClass('hidden');
		$("#shop-engine-upgrade").removeClass('hidden');
	}
}

function refillFuel() {
	socket.emit('refillfuel', true);
	socket.on('refillfuel', function(response){
		if (response.answer == true) {
			if (!soundMuted) audioMoney.play();
			if (!soundMuted) audioFuel.play();
		} else {
			if (!soundMuted) audioError.play();
		}
		updateDisplayedShopItems();
    });
}

function refillHealth() {
	socket.emit('refillhealth', true);
	socket.on('refillhealth', function(response){
		if (response.answer == true) {
			if (!soundMuted) audioMoney.play();
			if (!soundMuted) audioHeal.play();
		} else {
			if (!soundMuted) audioError.play();
		}
		updateDisplayedShopItems();
    });
}

function upgradeShield() {
	socket.emit('upgradeshield', true);
	socket.on('upgradeshield', function(response){
		if (response.answer == true) {
			if (!soundMuted) audioMoney.play();
			if (!soundMuted) audioUpgrade.play();
		} else {
			if (!soundMuted) audioError.play();
		}
		updateDisplayedShopItems();
    });
}

function upgradeShip() {
	socket.emit('upgradeship', true);
	socket.on('upgradeship', function(response){
		if (response.answer == true) {
			player.starterShip = false;
			console.log("money sound played");
			if (!soundMuted) audioMoney.play();
			if (!soundMuted) audioUpgrade.play();
		} else {
			console.log("error sound played");
			if (!soundMuted) audioError.play();
		}
		updateDisplayedShopItems();
    });
}

function upgradeHold() {
	socket.emit('upgradehold', true);
	socket.on('upgradehold', function(response){
		if (response.answer == true) {
			if (!soundMuted) audioMoney.play();
			if (!soundMuted) audioUpgrade.play();
		} else {
			if (!soundMuted) audioError.play();
		}
		updateDisplayedShopItems();
    });
}

function upgradeWeapon() {
	socket.emit('upgradeweapon', true);
	socket.on('upgradeweapon', function(response){
		if (response.answer == true) {
			if (!soundMuted) audioMoney.play();
			if (!soundMuted) audioUpgrade.play();
		} else {
			if (!soundMuted) audioError.play();
		}
		updateDisplayedShopItems();
    });
}

function updateCanvasSize() {
	canvas.height = $(window).height();
	canvas.width = $(window).width();
	canvasSize.height = canvas.height;
	canvasSize.width = canvas.width;
	
	socket.emit('canvassize',canvasSize);
}

function registerSocketHooks() {
	//socket.emit('name', object);
	//socket.on('name', function to handle object);
	
	//Join player to game
	socket = io();
	
	//Hooks for websocket
	socket.on('player', function(p) {
		player = p;
	})
	socket.on('players', function(p) {
		players = p;
	})
	socket.on('gamedata', function(obj) {
		players = obj.players;
		asteroids = obj.asteroids;
		resources = obj.resources;
		scores = obj.scores;
	})
	socket.on('ping', function(p){
      socket.emit('ping response',p);
    });
}

function getLocalCoords(x, y) {
	// Return coordinates for the user's canvas based when
	// given global coordinates.
	return {
		x:canvas.width/2 - (player.x-x),
		y:canvas.height/2 - (player.y-y)
	};
}

function acceleratePlayer() {
	var p = player;
	var delta = (Date.now()-lastMovedTime)/1000.0;
	if (Date.now() - p.lastCollisionTime > 500) {
		if (p.keyState[KEY_CODES.LEFT]) {
			p.fuel -= delta;
			playShipSoundEffect(p);
			state = 1;
			p.angle = (p.angle - p.rotationSpeed*delta) % 360;
			if (p.angle < 0) p.angle += 360;
		} else if (p.keyState[KEY_CODES.RIGHT]) {
			p.fuel -= delta;
			playShipSoundEffect(p);
			state = 2;
			p.angle = (p.angle + p.rotationSpeed*delta) % 360;
			if (p.angle < 0) p.angle += 360;
		} else if (p.keyState[KEY_CODES.UP]) {
			p.speedX += p.accelerationX*delta*Math.cos(TO_RADIANS*p.angle);
			p.speedY += p.accelerationY*delta*Math.sin(TO_RADIANS*p.angle);
			p.fuel -= delta;
			playShipSoundEffect(p);
			state = 3;
		} else {
			if (state != 0) {
				stopShipSoundEffects();
				if (!soundMuted) audioEngineStop.play();
			}
			state = 0;
		}
		p.x += p.speedX*delta*Math.cos(TO_RADIANS*p.angle);
		p.y += p.speedY*delta*Math.sin(TO_RADIANS*p.angle);
		lastMovedTime = Date.now();
	}
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
				if (p.junkCapacity > p.junk) {
					console.log('Junk picked up');
					if (!soundMuted) audioCollectJunk.play();
					o.health -= 100;
					p.junk += 1;
				} else {
					if (!soundMuted) audioError.play();
				}
			} else if (o.type == 'asteroid') {
				if (!soundMuted) audioCrash.play();
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

function playShipSoundEffect(p) {
	if (!soundMuted) {
		if (state == 0) {
			if (Date.now() > shipAudioStartTime + 1400) {
				stopShipSoundEffects();
				audioEngineStart.play();
				shipAudioStartTime = Date.now();
			}
		} else {
			if (Date.now() > shipAudioStartTime + 1400) {
				stopShipSoundEffects();
				audioEngineOn.play();
				shipAudioStartTime = Date.now();
			}
		}
	}
}

function stopShipSoundEffects() {
	audioEngineStart.pause();
	audioEngineStop.pause();
	audioEngineOn.pause();
	audioEngineStart.currentTime = 0;
	audioEngineStop.currentTime = 0;
	audioEngineOn.currentTime = 0;
	audioEngineStart.volume = 0.6;
	audioEngineStop.volume = 0.6;
	audioEngineOn.volume = 0.6;
}

function drawObjects() {
	//Draw spawn
	var coords = getLocalCoords(0, 0);
	ctx.drawImage(spawnImage, coords.x-300, coords.y-300, 600, 600);
	
	//Draw resources and asteroids
	for (var i = 0; i < resources.length; i++) {
		var coords = getLocalCoords(resources[i].x, resources[i].y);
		ctx.drawImage(resourceImage, coords.x-16, coords.y-16, 32, 32);
	}
	for (var i = 0; i < asteroids.length; i++) {
		var coords = getLocalCoords(asteroids[i].x, asteroids[i].y);
		if (asteroids[i].timeOfDeath == null) {
			ctx.drawImage(asteroid[0], coords.x-(asteroids[i].width/2), coords.y-(asteroids[i].height/2), asteroids[i].width, asteroids[i].height);
		}else {
			ctx.drawImage(asteroid[1+Math.min(1,Math.floor(asteroids[i].timeSinceDeath/250))], coords.x-(asteroids[i].width/2), coords.y-(asteroids[i].height/2), asteroids[i].width, asteroids[i].height);
		}
	}
}

function drawPlayers() {
	//Draw others spaceships
	for (var i = 0; i < players.length; i++) {
		if (player.id != players[i].id) {
			var coords = getLocalCoords(players[i].x, players[i].y);
			ctx.save();
			ctx.translate(coords.x,coords.y);
			ctx.rotate((players[i].angle+90)*TO_RADIANS);
			if (players[i].starterShip) {
				ctx.drawImage(spaceship[players[i].state], -32, -32, 64, 64);
			} else {
				ctx.drawImage(shipCockpit, -56, -48, 112, 96);
				ctx.drawImage(shipStorage[players[i].holdLevel], -56, -48, 112, 96);
				ctx.drawImage(shipWeapons[players[i].weaponLevel], -56, -48, 112, 96);
				ctx.drawImage(shipEngines[players[i].engineLevel][players[i].state], -56, -48, 112, 96);
			}
			ctx.restore();
			ctx.fillStyle = '#fff';
			ctx.textAlign = 'center';
			ctx.font="bold 16px Arial";
			ctx.fillText(players[i].name, coords.x,coords.y-35);
		}
	}
	
	//Draw our spaceship
    ctx.save();
    ctx.translate(canvas.width/2,canvas.height/2);
    ctx.rotate((player.angle+90)*TO_RADIANS);
	if (player.starterShip) {
		ctx.drawImage(spaceship[player.state], -32, -32, 64, 64);
	} else {
		console.log(player.engineLevel)
		ctx.drawImage(shipCockpit, -56, -48, 112, 96);
		ctx.drawImage(shipStorage[player.holdLevel], -56, -48, 112, 96);
		ctx.drawImage(shipWeapons[player.weaponLevel], -56, -48, 112, 96);
		ctx.drawImage(shipEngines[player.engineLevel][player.state], -56, -48, 112, 96);
	}
    ctx.restore();
	ctx.fillStyle = '#fff';
	ctx.textAlign = 'center';
	ctx.font="bold 16px Arial";
	ctx.fillText(player.name, canvas.width/2, canvas.height/2-35);
}

function updateCanvas() {
	//Clear canvas
	ctx.clearRect(0, 0, canvas.width, canvas.height);
	
	acceleratePlayer();
	checkForCollosions(player,asteroids);
    checkForCollosions(player,resources);
	drawObjects();
	drawPlayers();
	drawUI();
	
	//Check if player is within spawn
	if (((player.x*player.x) + (player.y*player.y)) < 300*300) {
		if (!shopOpen) {
			loadShop();
		}
	} else {
		shopOpen = false;
	}

	if (player.health <= 0) loadOverlay(true);
}

function drawUI() {
	//Display ping, health and sheilds (temporary).
	ctx.fillStyle="#fff";
	ctx.font="12px Arial";
	var pingText = "Ping: " + player.ping;
    ctx.fillText(pingText, 38, 30);
	
	//Display leaderboard
	ctx.textAlign = 'left';
	ctx.font="bold 25px Arial";
	ctx.fillText('Leaderboard', canvas.width-235,50);
	ctx.font="18px Arial";
	var initialScoreboardHeight = 85;
	for (var i = 0; i < scores.length; i++) {
		ctx.fillText((i+1).toString()+'. '+scores[i][0], canvas.width-270,85 + (i*30));
		ctx.fillText(scores[i][1], canvas.width-90,85 + (i*30));
	}
	
	//Display fuel
	var fuelHeightOffset =260;
	var fuelBars = Math.floor(player.fuel/20);
	var fuelExcess = player.fuel % 20;
	if (fuelBars < 1) {
		$("#game-ui-text-fuel").addClass('flash');
	} else {
		$("#game-ui-text-fuel").removeClass('flash');
	}
	for (var i = 1; i <= fuelBars; i++) {
		if (i % 2 == 0) {
			ctx.drawImage(blueBarImage, 110 + (i*20), canvas.height-fuelHeightOffset);
		} else {
			ctx.drawImage(pinkBarImage, 110 + (i*20), canvas.height-fuelHeightOffset);
		}
	}
	if (fuelExcess != 0) {
		if (fuelBars % 2 == 1) {
			ctx.drawImage(blueBarImage, 0, 0, 16*(fuelExcess/20), 32, 110 + ((fuelBars+1)*20), canvas.height-fuelHeightOffset, 16*(fuelExcess/20), 32);
		} else {
			ctx.drawImage(pinkBarImage, 0, 0, 16*(fuelExcess/20), 32, 110 + ((fuelBars+1)*20), canvas.height-fuelHeightOffset, 16*(fuelExcess/20), 32);
		}
	}
	
	//Display health
	var healthHeightOffset = 220;
	var healthBars = Math.floor(player.health/20);
	var healthExcess = player.health % 20;
	if (healthBars <= 1) {
		$("#game-ui-text-health").addClass('flash');
	} else {
		$("#game-ui-text-health").removeClass('flash');
	}
	for (var i = 1; i <= healthBars; i++) {
		if (i % 2 == 0) {
			ctx.drawImage(blueBarImage, 110 + (i*20), canvas.height-healthHeightOffset);
		} else {
			ctx.drawImage(pinkBarImage, 110 + (i*20), canvas.height-healthHeightOffset);
		}
	}
	if (healthExcess != 0) {
		if (healthBars % 2 == 1) {
			ctx.drawImage(blueBarImage, 0, 0, 16*(healthExcess/20), 32, 110 + ((healthBars+1)*20), canvas.height-healthHeightOffset, 16*(healthExcess/20), 32);
		} else {
			ctx.drawImage(pinkBarImage, 0, 0, 16*(healthExcess/20), 32, 110 + ((healthBars+1)*20), canvas.height-healthHeightOffset, 16*(healthExcess/20), 32);
		}
	}
	
	//Display shield
	var shieldHeightOffset = 180;
	var shieldBars = Math.floor(player.shield/20);
	var shieldExcess = player.health % 20;
	ctx.drawImage(shieldImage, 20, canvas.height-shieldHeightOffset);
	for (var i = 1; i <= shieldBars; i++) {
		if (i % 2 == 0) {
			ctx.drawImage(blueBarImage, 110 + (i*20), canvas.height-shieldHeightOffset);
		} else {
			ctx.drawImage(pinkBarImage, 110 + (i*20), canvas.height-shieldHeightOffset);
		}
	}
	if (shieldExcess != 0) {
		if (shieldBars % 2 == 1) {
			ctx.drawImage(blueBarImage, 0, 0, 16*(shieldExcess/20), 32, 110 + ((shieldBars+1)*20), canvas.height-shieldHeightOffset, 16*(shieldExcess/20), 32);
		} else {
			ctx.drawImage(pinkBarImage, 0, 0, 16*(shieldExcess/20), 32, 110 + ((shieldBars+1)*20), canvas.height-shieldHeightOffset, 16*(shieldExcess/20), 32);
		}
	}
	
	//Display cargo
	var junkHeightOffset = 140;
	ctx.drawImage(junkImage, 20, canvas.height-junkHeightOffset);
	for (var i = 1; i <= player.junk; i++) {
		if (i % 2 == 0) {
			ctx.drawImage(blueBarImage, 110 + (i*20), canvas.height-junkHeightOffset);
		} else {
			ctx.drawImage(pinkBarImage, 110 + (i*20), canvas.height-junkHeightOffset);
		}
	}
	
	//Horizontal bar
	ctx.drawImage(blueWideBarImage, 20, canvas.height-100);
	
	//Arrow
	ctx.save();
    ctx.translate(244,canvas.height-43);
    ctx.rotate(Math.atan2(player.y, player.x)-Math.PI/2);
	ctx.drawImage(arrowImage, -24, -37, 48, 75);
    ctx.restore();
	
}