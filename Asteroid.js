function Asteroid(id,x,y,angle) {
  this.id = id;
  this.x = x;
  this.y = y;
  this.angle = angle;
  this.width = 32;
  this.height = 32;
  
  return {
    id: this.id,
    x: this.x,
    y: this.y,
    angle: this.angle,
    width: this.width,
    height: this.height
  }
}
exports.Asteroid = Asteroid;