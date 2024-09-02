export class Quaternion {
  constructor(v) {
    this.q = new Float32Array(v);
  }

  norm2() {
    return this.q[0] * this.q[0] + this.q[1] * this.q[1] + this.q[2] * this.q[2]+ this.q[3] * this.q[3];
  }

  norm(){
    return Math.sqrt(this.norm2());
  }

  mult(v){
    return new Quaternion([-v.q[1] * this.q[1] - v.q[2] * this.q[2] - v.q[3] * this.q[3] + v.q[0] * this.q[0],
                        v.q[1] * this.q[0] + v.q[2] * this.q[3] - v.q[3] * this.q[2] + v.q[0] * this.q[1],
                        -v.q[1] * this.q[3] + v.q[2] * this.q[0] + v.q[3] * this.q[1] + v.q[0] * this.q[2],
                        v.q[1] * this.q[2] - v.q[2] * this.q[1] + v.q[3] * this.q[0] + v.q[0] * this.q[3]]);
  }

  scalmult(scal){
    return new Quaternion([this.q[0]*scal, this.q[1]*scal, this.q[2]*scal, this.q[3]*scal]);
  }

  conjugate(){
    return new Quaternion([this.q[0], - this.q[1], -this.q[2], -this.q[3]]);
  }

  inv(){
    return this.conjugate().scalmult(1.0 / this.norm2());
  }

  normalize(){
    return this.scalmult(1.0 / this.norm());
  }

}

export function rotationQuaternion(x, y, z, alpha){
    let sinAlpha = Math.sin(alpha/2.0);
    return new Quaternion([Math.cos(alpha/2.0), x * sinAlpha, y * sinAlpha, z * sinAlpha]);
}


function test(){
    let q1 = new Quaternion([1.0 ,2.0, 3.0, 4.0]);
    let inv_q1 = q1.inv();
    let q2 = q1.mult(inv_q1);
    console.log(q2);
}
