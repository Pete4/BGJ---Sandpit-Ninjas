//Game objects
var players = [];
var asteroids = [];
var canvas = $("#game-canvas");
var ctx = canvas.getContext("2d");

$(function() {
	$("#game-canvas").css('height', $(window).height());
	$("#game-canvas").css('width', $(window).width());
	
	addPlayerToGame();
	
	//Start timed canvas updates for UI
	setInterval(updateCanvas, 30);
});

function addPlayerToGame() {
	//Set players' location to center of screen
	var spaceship = new Image();
	spaceship.src = '/images/FirstSpace.png';
	
	ctx.drawImage(spaceship,10,10);
	
	registerSocketHooks();
}

function registerSocketHooks() {
	//socket.emit('name', object);
	//socket.on('name', function to handle object);
	
	//Join player to game
	var socket = io();
	
	//Hooks for websocket
	socket.on('players', function(p) {
		players = p;
	})
	socket.on('gamedata', function(obj) {
		players = obj.players;
		asteroids = obj.asteroids;
	})
}

function 