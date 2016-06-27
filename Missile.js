function Missile(id,x,y,angle,shooterID) {
  this.id = id;
  this.x = x;
  this.y = y;
  this.gridX = 0;
  this.gridY = 0;
  this.health = 20;
  this.ind = null;
  this.angle = angle;
  this.width = 10;
  this.height = 25;
  this.type = 'm';
  this.timeOfDeath = null;
  this.timeSinceDeath = null;
  this.lastMovedTime = Date.now();
  this.shooterID = shooterID;
  this.destroyed = false;
  this.displayExplosion = false;
  
  return {
    id: this.id,
    x: this.x,
    y: this.y,
    gridX: this.gridX,
    gridY: this.gridY,
    health: this.health,
    angle: this.angle,
    width: this.width,
    height: this.height,
    type: this.type,
    timeOfDeath: this.timeOfDeath,
    timeSinceDeath: this.timeSinceDeath,
    lastMovedTime: this.lastMovedTime,
    shooterID: this.shooterID,
    destroyed: this.destroyed,
    displayExplosion: this.displayExplosion
  };
}
exports.Missile = Missile;