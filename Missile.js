function Missile(id,x,y,angle,shooterID) {
  this.id = id;
  this.x = x;
  this.y = y;
  this.health = 20;
  this.ind = null;
  this.angle = angle;
  this.width = 10;
  this.height = 25;
  this.type = 'missile';
  this.timeOfDeath = null;
  this.timeSinceDeath = null;
  this.lastMovedTime = Date.now();
  this.shooterID = shooterID;
  
  return {
    id: this.id,
    ind: this.ind,
    x: this.x,
    y: this.y,
    health: this.health,
    angle: this.angle,
    width: this.width,
    height: this.height,
    type: this.type,
    timeOfDeath: this.timeOfDeath,
    timeSinceDeath: this.timeSinceDeath,
    lastMovedTime: this.lastMovedTime,
    shooterID: this.shooterID
  };
}
exports.Missile = Missile;