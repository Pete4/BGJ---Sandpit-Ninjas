function Player(id,name) {
  this.id = id;
  this.x = 0;
  this.y = -1;
  this.angle = 270;
  this.name = name;
  this.score = 0;
  this.furthestDistance = 0;
  this.canvasSize = {width:1980,height:1024};
  this.fuel = 60;
  this.junk = 0;
  this.health = 100;
  this.shield = 0;
  this.cash = 50;
  this.width = 64;
  this.height = 64;
  this.accelerationX = 20; //fixed
  this.accelerationY = 20; //fixed
  this.speedX = 0;
  this.speedY = 0;
  this.rotationSpeed = 160; // deg/sec
  this.lastMovedTime = Date.now();
  this.ping = 0;
  this.pingStart = 0;
  this.keyState = {};
  this.state = 0;
  this.holdLevel = 0;
  this.weaponLevel = 0;
  this.engineLevel = 0;
  this.starterShip = true;
  this.lastCollisionTime = 0;
  this.hitShop = false;
  this.lastFiredTime = 0;

  return {
    id: this.id,
    x: this.x,
    y: this.y,
    angle: this.angle,
    name: this.name,
    score: this.score,
    furthestDistance: this.furthestDistance,
    canvasSize: this.canvasSize,
    fuel: this.fuel,
    junk: this.junk,
    health: this.health,
    shield: this.shield,
    cash: this.cash,
    width: this.width,
    height: this.height,
    accelerationX: this.accelerationX,
    accelerationY: this.accelerationY,
    speedX: this.speedX,
    speedY: this.speedY,
    rotationSpeed: this.rotationSpeed,
    lastMovedTime: this.lastMovedTime,
    ping: this.ping,
    pingStart: this.pingStart,
    keyState: this.keyState,
    state: this.state,
    weaponLevel: this.weaponLevel,
    holdLevel: this.holdLevel,
    engineLevel: this.engineLevel,
    starterShip: this.starterShip,
    lastCollisionTime: this.lastCollisionTime,
    hitShop: this.hitShop,
    lastFiredTime: this.lastFiredTime
  };
}
exports.Player = Player;