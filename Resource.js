function Resource(x,y,id,type) {
  this.x = 0;
  this.y = 0;
  this.id = id;
  this.type = type;

  return {
    x: this.x,
    y: this.y,
    id: this.id,
    type: this.type
  }
}