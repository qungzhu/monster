// Remap tail vertex UVs to sample a clean body-fur patch, so the tail
// shows the same plush fur as the body instead of its muddy reconstruction.
const path=require('path');
const { NodeIO } = require(path.resolve('/home/user/monster/node_modules/@gltf-transform/core'));
const ALL = require(path.resolve('/home/user/monster/node_modules/@gltf-transform/extensions'));
const [,,inGlb,outGlb,U0,V0,WW,WH]=process.argv;
const u0=+U0, v0=+V0, ww=+WW, wh=+WH;
(async()=>{
  const io=new NodeIO().registerExtensions(ALL.ALL_EXTENSIONS);
  const doc=await io.read(inGlb);
  const prim=doc.getRoot().listMeshes()[0].listPrimitives()[0];
  const pos=prim.getAttribute('POSITION'); const uv=prim.getAttribute('TEXCOORD_0');
  const n=pos.getCount(); const v=[0,0,0];
  // tail base + tip
  let bx=0,by=0,bz=0,bc=0,tip=0;
  for(let i=0;i<n;i++){pos.getElement(i,v); if(-v[2]>0.055&&v[1]>0.15){tip=Math.max(tip,v[1]); if(v[1]<0.20){bx+=v[0];by+=v[1];bz+=v[2];bc++;}}}
  bx/=bc;by/=bc;bz/=bc;
  const tb={x:bx,z:bz};
  const U=new Float32Array(uv.getArray());
  let cnt=0;
  const t=[0,0];
  for(let i=0;i<n;i++){pos.getElement(i,v);
    const inTail=(-v[2]>0.055)&&(v[1]>0.15)&&(Math.hypot(v[0]-tb.x,v[2]-tb.z)<0.085);
    if(!inTail) continue;
    const h=Math.max(0,Math.min(1,(v[1]-by)/(tip-by+1e-6)));
    let a=Math.atan2(v[0]-tb.x, v[2]-tb.z)/(Math.PI*2); if(a<0)a+=1; // 0..1 around axis
    // fold angle so seam is hidden (0..0.5..0 triangle wave)
    const af=1-Math.abs(a*2-1);
    U[i*2]=u0+af*ww;
    U[i*2+1]=v0+h*wh;
    cnt++;
  }
  prim.setAttribute('TEXCOORD_0', doc.createAccessor().setType('VEC2').setArray(U));
  await io.write(outGlb,doc);
  console.log('tail UVs remapped:', cnt);
})();
