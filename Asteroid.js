function Asteroid(id,x,y) {
  this.id = id;
  this.x = x;
  this.y = y;
  this.width = 64;
  this.height = 64;
  
  return {
    id: this.id,
    x: this.x,
    y: this.y,
    width: this.width,
    height: this.height
  }
}