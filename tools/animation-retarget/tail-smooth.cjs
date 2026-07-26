// Spatially smooth the tail surface (positions + normals) so the bumpy
// reconstructed tail reads as plush like the body. Operates only on tail verts.
const path=require('path');
const { NodeIO } = require(path.resolve('/home/user/monster/node_modules/@gltf-transform/core'));
const ALL = require(path.resolve('/home/user/monster/node_modules/@gltf-transform/extensions'));
const [,,inGlb,outGlb,itersArg,blendArg]=process.argv;
const ITERS=+(itersArg||3), BLEND=+(blendArg||0.5);
(async()=>{
  const io=new NodeIO().registerExtensions(ALL.ALL_EXTENSIONS);
  const doc=await io.read(inGlb);
  const prim=doc.getRoot().listMeshes()[0].listPrimitives()[0];
  const pos=prim.getAttribute('POSITION'); const nrm=prim.getAttribute('NORMAL');
  const n=pos.getCount();
  const P=new Float32Array(pos.getArray()); const N=new Float32Array(nrm.getArray());
  const v=[0,0,0];
  // tail base
  let bx=0,by=0,bz=0,bc=0;
  for(let i=0;i<n;i++){pos.getElement(i,v); if(-v[2]>0.055&&v[1]>0.15&&v[1]<0.20){bx+=v[0];by+=v[1];bz+=v[2];bc++;}}
  bx/=bc;by/=bc;bz/=bc;
  const tail=[];
  for(let i=0;i<n;i++){const x=P[i*3],y=P[i*3+1],z=P[i*3+2];
    if(-z>0.055&&y>0.15&&Math.hypot(x-bx,z-bz)<0.085) tail.push(i);}
  // spatial hash
  const CELL=0.012; const key=(x,y,z)=>((x/CELL)|0)+'_'+((y/CELL)|0)+'_'+((z/CELL)|0);
  const build=()=>{const g=new Map(); for(const i of tail){const k=key(P[i*3],P[i*3+1],P[i*3+2]); (g.get(k)||g.set(k,[]).get(k)).push(i);} return g;};
  const R=0.016, R2=R*R;
  for(let it=0;it<ITERS;it++){
    const g=build(); const nP=new Float32Array(P.length);
    for(const i of tail){const x=P[i*3],y=P[i*3+1],z=P[i*3+2];
      let sx=0,sy=0,sz=0,c=0;
      const cx=(x/CELL)|0, cy=(y/CELL)|0, cz=(z/CELL)|0;
      for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++)for(let dz=-1;dz<=1;dz++){
        const arr=g.get((cx+dx)+'_'+(cy+dy)+'_'+(cz+dz)); if(!arr)continue;
        for(const j of arr){const ddx=P[j*3]-x,ddy=P[j*3+1]-y,ddz=P[j*3+2]-z; if(ddx*ddx+ddy*ddy+ddz*ddz<R2){sx+=P[j*3];sy+=P[j*3+1];sz+=P[j*3+2];c++;}}
      }
      if(c>0){nP[i*3]=x+(sx/c-x)*BLEND; nP[i*3+1]=y+(sy/c-y)*BLEND; nP[i*3+2]=z+(sz/c-z)*BLEND;}
      else{nP[i*3]=x;nP[i*3+1]=y;nP[i*3+2]=z;}
    }
    for(const i of tail){P[i*3]=nP[i*3];P[i*3+1]=nP[i*3+1];P[i*3+2]=nP[i*3+2];}
  }
  // smooth normals spatially over the tail
  const g=build(); const nN=new Float32Array(N.length);
  for(const i of tail){const x=P[i*3],y=P[i*3+1],z=P[i*3+2];
    let sx=0,sy=0,sz=0; const cx=(x/CELL)|0,cy=(y/CELL)|0,cz=(z/CELL)|0;
    for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++)for(let dz=-1;dz<=1;dz++){
      const arr=g.get((cx+dx)+'_'+(cy+dy)+'_'+(cz+dz)); if(!arr)continue;
      for(const j of arr){const ddx=P[j*3]-x,ddy=P[j*3+1]-y,ddz=P[j*3+2]-z; if(ddx*ddx+ddy*ddy+ddz*ddz<R2){sx+=N[j*3];sy+=N[j*3+1];sz+=N[j*3+2];}}
    }
    const len=Math.hypot(sx,sy,sz)||1; nN[i*3]=sx/len;nN[i*3+1]=sy/len;nN[i*3+2]=sz/len;
  }
  for(const i of tail){N[i*3]=nN[i*3];N[i*3+1]=nN[i*3+1];N[i*3+2]=nN[i*3+2];}
  prim.setAttribute('POSITION', doc.createAccessor().setType('VEC3').setArray(P));
  prim.setAttribute('NORMAL', doc.createAccessor().setType('VEC3').setArray(N));
  await io.write(outGlb,doc);
  console.log('smoothed tail verts:', tail.length, 'iters', ITERS);
})();
