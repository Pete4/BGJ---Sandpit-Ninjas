function Asteroid(id,x,y,angle,ind) {
  this.id = id;
  this.ind = ind;
  this.x = x;
  this.y = y;
  this.health = 100;
  this.angle = angle;
  this.width = 64;
  this.height = 64;
  this.timeOfDeath = null;
  this.timeSinceDeath = null;
  
  return {
    id: this.id,
    ind: this.ind,
    x: this.x,
    y: this.y,
    health: this.health,
    angle: this.angle,
    width: this.width,
    height: this.height,
    timeOfDeath: this.timeOfDeath,
    timeSinceDeath: this.timeSinceDeath
  };
}
exports.Asteroid = Asteroid;