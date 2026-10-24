// Walking routes use only mapped OSM edges; no straight-line fallback.
export function createWalkingRouter(graph) {
  const n=graph.points.length,base=Array.from({length:n},()=>[]);
  const link=(list,a,b,d,e)=>list[a].push({to:b,d,e});
  graph.edges.forEach(([a,b,d,name,direction=0],e)=>{if(direction!==-1)link(base,a,b,d,e);if(direction!==1)link(base,b,a,d,e);});
  return (startIndex,endIndex)=>{
    if(startIndex===endIndex)throw new Error('Choose two different buildings.');
    const a=graph.access[startIndex],b=graph.access[endIndex];
    if(!a||!b)throw new Error('No nearby connected walking path is mapped for one of these buildings. Try another building or open OpenStreetMap.');
    const adj=base.map(neighbors=>neighbors.slice());adj.push([],[]);
    const start=n,end=n+1;
    const [aa,ab,ad,,adir=0]=graph.edges[a.edge], [ba,bb,bd,,bdir=0]=graph.edges[b.edge];
    if(adir!==1)link(adj,start,aa,ad*a.t,a.edge);
    if(adir!==-1)link(adj,start,ab,ad*(1-a.t),a.edge);
    if(bdir!==-1)link(adj,ba,end,bd*b.t,b.edge);
    if(bdir!==1)link(adj,bb,end,bd*(1-b.t),b.edge);
    if(a.edge===b.edge&&((b.t>=a.t&&adir!==-1)||(b.t<=a.t&&adir!==1)))link(adj,start,end,ad*Math.abs(a.t-b.t),a.edge);
    const distance=new Float64Array(n+2).fill(Infinity),previous=new Int32Array(n+2).fill(-1),via=new Int32Array(n+2).fill(-1),heap=[];
    function push(node,d){heap.push([d,node]);let i=heap.length-1;while(i>0){const p=(i-1)>>1;if(heap[p][0]<=d)break;[heap[i],heap[p]]=[heap[p],heap[i]];i=p;}}
    function pop(){const first=heap[0],last=heap.pop();if(heap.length){heap[0]=last;let i=0;while(true){let k=i,l=i*2+1,r=l+1;if(l<heap.length&&heap[l][0]<heap[k][0])k=l;if(r<heap.length&&heap[r][0]<heap[k][0])k=r;if(k===i)break;[heap[i],heap[k]]=[heap[k],heap[i]];i=k;}}return first;}
    distance[start]=0;push(start,0);
    while(heap.length){const [d,u]=pop();if(d>distance[u])continue;if(u===end)break;for(const edge of adj[u]){const next=d+edge.d;if(next<distance[edge.to]){distance[edge.to]=next;previous[edge.to]=u;via[edge.to]=edge.e;push(edge.to,next);}}}
    if(!Number.isFinite(distance[end]))throw new Error('No connected walking route is mapped between these buildings.');
    const nodes=[];for(let u=end;u!==-1;u=previous[u])nodes.push(u);nodes.reverse();
    const points=[a.door,...nodes.map(u=>u===start?a.point:u===end?b.point:graph.points[u]),b.door];
    const steps=[];
    for(let i=1;i<nodes.length;i++){const node=nodes[i],edge=graph.edges[via[node]],name=graph.names[edge[3]],meters=distance[node]-distance[nodes[i-1]];if(meters<.1)continue;const prior=steps.at(-1);if(prior?.name===name)prior.meters+=meters;else steps.push({name,meters});}
    return {points,meters:distance[end]+a.connector_m+b.connector_m,minutes:(distance[end]+a.connector_m+b.connector_m)/(graph.walking_m_per_min||75),steps,access:[a,b]};
  };
}
