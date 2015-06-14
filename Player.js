function Player(id,name) {
  this.id = id;
  this.x = 0;
  this.y = 0;
  this.angle = 270;
  this.name = name;
  this.canvasSize = {width:1980,height:1024};
  this.fuel = 100;
  this.junk = 0;
  this.health = 100;
  this.shield = 0;
  this.cash = 50;
  this.width = 64;
  this.height = 64;
  this.forwardSpeed = 100; // px/sec
  this.rotationSpeed = 160; // deg/sec
  this.lastMovedTime = Date.now();
  this.ping = 0;
  this.pingStart = 0;
  this.keyState = {};
  this.state = 0;
  this.fuelCapacity = 60;
  this.hullCapacity = 5;
  this.gunDamage = 10;
  this.lastCollisionTime = 0;

  return {
    id: this.id,
    x: this.x,
    y: this.y,
    angle: this.angle,
    name: this.name,
    canvasSize: this.canvasSize,
    fuel: this.fuel,
    junk: this.junk,
    health: this.health,
    shield: this.shield,
    cash: this.cash,
    width: this.width,
    height: this.height,
    forwardSpeed: this.forwardSpeed,
    rotationSpeed: this.rotationSpeed,
    lastMovedTime: this.lastMovedTime,
    ping: this.ping,
    pingStart: this.pingStart,
    keyState: this.keyState,
    state: this.state,
    fuelCapacity: this.fuelCapacity,
    hullCapacity: this.hullCapacity,
    gunDamage: this.gunDamage,
    lastCollisionTime: this.lastCollisionTime
  };
}
exports.Player = Player;