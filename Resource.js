function Resource(x,y,id,type) {
  this.id = id;
  this.x = 0;
  this.y = 0;
  this.type = type;

  return {
    id: this.id,
    x: this.x,
    y: this.y,
    type: this.type
  }
}