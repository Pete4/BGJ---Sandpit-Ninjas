$(function() {
	$("#game-canvas").css('height', $(window).height());
	$("#game-canvas").css('width', $(window).width());
	
	//socket.emit('name', object);
	//socket.on('name', function to handle object);
	
	//Join player to game
	var socket = io();
	
	//Game objects
	var players = [];
	
	//Hooks for websocket
	socket.on('players', function(p) {
		players.push(p);
	})
	
	
	//Place player on screen
	
	
	
	//Start timed canvas updates for UI
});