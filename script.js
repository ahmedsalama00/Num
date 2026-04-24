// ─── HELPERS ───────────────────────────────────────────────────────────────
function parseF(expr){
  let s=expr.replace(/\^/g,'**').replace(/\bsin\b/g,'Math.sin').replace(/\bcos\b/g,'Math.cos').replace(/\btan\b/g,'Math.tan').replace(/\bexp\b/g,'Math.exp').replace(/\blog\b/g,'Math.log').replace(/\bsqrt\b/g,'Math.sqrt').replace(/\babs\b/g,'Math.abs').replace(/\bPI\b/g,'Math.PI');
  return new Function('x','return '+s+';');
}
function numDeriv(f,x){const h=1e-7;return(f(x+h)-f(x-h))/(2*h);}
function fmt(v,d=8){if(typeof v!=='number')return v;return parseFloat(v.toFixed(d));}
function showPanel(id){
  document.querySelectorAll('.panel').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
  document.getElementById('panel-'+id).classList.add('active');
  event.currentTarget.classList.add('active');
  closeSidebar();
}
function openSidebar(){document.getElementById('sidebar').classList.add('open');document.getElementById('overlay').classList.add('open');}
function closeSidebar(){document.getElementById('sidebar').classList.remove('open');document.getElementById('overlay').classList.remove('open');}
function showResult(id,html){document.getElementById(id).innerHTML=html;}
function makeTable(cols,rows){
  let h=`<div class="result-box result-success"><table class="iter-table"><thead><tr>${cols.map(c=>`<th>${c}</th>`).join('')}</tr></thead><tbody>`;
  rows.forEach(r=>{h+=`<tr>${r.map(c=>`<td>${c}</td>`).join('')}</tr>`;});
  return h+'</tbody></table></div>';
}
function resultBox(val,label,extra=''){return `<div class="result-box result-success"><div class="result-label">${label}</div><div class="result-value">${val}</div>${extra}</div>`;}
function errorBox(msg){return `<div class="result-box result-error"><div class="result-label">Error — invalid input</div><div class="result-value" style="font-size:15px">${msg}</div></div>`;}

// ─── CHART REGISTRY ────────────────────────────────────────────────────────
const _charts={};
function destroyChart(id){if(_charts[id]){_charts[id].destroy();delete _charts[id];}}
function makeChart(canvasId,cfg){
  destroyChart(canvasId);
  const ctx=document.getElementById(canvasId).getContext('2d');
  _charts[canvasId]=new Chart(ctx,cfg);
}
const C={accent:'#4f8ef7',accent2:'#7c5cfc',accent3:'#22d3a5',warn:'#f6ad55',danger:'#f56565',text2:'#94a3c0',grid:'rgba(30,45,74,0.8)'};
function baseChartOpts(xLabel,yLabel){
  return{responsive:true,plugins:{legend:{labels:{color:C.text2,font:{family:'Sora',size:11}}}},scales:{x:{ticks:{color:C.text2,font:{family:'JetBrains Mono',size:10}},grid:{color:C.grid},title:{display:!!xLabel,text:xLabel,color:C.text2}},y:{ticks:{color:C.text2,font:{family:'JetBrains Mono',size:10}},grid:{color:C.grid},title:{display:!!yLabel,text:yLabel,color:C.text2}}}};
}
function showPlot(wrapId){document.getElementById(wrapId).style.display='block';}

// Plot f(x) curve + root marker for root-finding methods
function plotRootMethod(canvasId,wrapId,f,a,b,root){
  showPlot(wrapId);
  const pts=200;
  const margin=Math.max((b-a)*0.4,0.5);
  const x0=a-margin,x1=b+margin,step=(x1-x0)/pts;
  const labels=[],dataF=[];
  for(let i=0;i<=pts;i++){
    const x=x0+i*step;
    labels.push(fmt(x,4));
    try{const y=f(x);dataF.push(isFinite(y)&&Math.abs(y)<1e6?y:null);}catch{dataF.push(null);}
  }
  const rootIdx=Math.round((root-x0)/step);
  const rootData=labels.map((_,i)=>i===rootIdx?0:null);
  const rootRadius=labels.map((_,i)=>i===rootIdx?8:0);
  const datasets=[
    {label:'f(x)',data:dataF,borderColor:C.accent,backgroundColor:'transparent',borderWidth:2,pointRadius:0,tension:0.3},
    {label:'y = 0',data:labels.map(()=>0),borderColor:C.text2,backgroundColor:'transparent',borderWidth:1,borderDash:[4,4],pointRadius:0},
    {label:'Root \u2248 '+fmt(root,6),data:rootData,pointRadius:rootRadius,pointBackgroundColor:C.accent3,pointBorderColor:'#fff',pointBorderWidth:2,borderColor:'transparent',showLine:false}
  ];
  makeChart(canvasId,{type:'line',data:{labels,datasets},options:baseChartOpts('x','f(x)')});
}

// Plot convergence (error vs iteration)
function plotConvergence(canvasId,wrapId,errors,label){
  showPlot(wrapId);
  makeChart(canvasId,{type:'line',data:{
    labels:errors.map((_,i)=>i+1),
    datasets:[{label:label||'Max Error',data:errors,borderColor:C.accent3,backgroundColor:'rgba(34,211,165,0.08)',borderWidth:2,pointRadius:3,fill:true,tension:0.3}]
  },options:{...baseChartOpts('Iteration','Error'),scales:{...baseChartOpts('Iteration','Error').scales,y:{...baseChartOpts('Iteration','Error').scales.y,type:'logarithmic'}}}});
}

// Plot bar chart of solution values
function plotSolutionBars(canvasId,wrapId,x,labels){
  showPlot(wrapId);
  makeChart(canvasId,{type:'bar',data:{
    labels:labels||x.map((_,i)=>`x${i+1}`),
    datasets:[{label:'Solution',data:x,backgroundColor:x.map((_,i)=>['rgba(79,142,247,0.6)','rgba(124,92,252,0.6)','rgba(34,211,165,0.6)','rgba(246,173,85,0.6)','rgba(245,101,101,0.6)','rgba(100,200,255,0.6)','rgba(200,100,200,0.6)','rgba(100,255,150,0.6)'][i%8]),borderColor:x.map((_,i)=>[C.accent,C.accent2,C.accent3,C.warn,C.danger,'#64c8ff','#c864c8','#64ff96'][i%8]),borderWidth:2}]
  },options:baseChartOpts('Variable','Value')});
}

// Plot interpolation: data points + interpolated point
function plotInterpolation(canvasId,wrapId,xs,ys,xval,result){
  showPlot(wrapId);
  const sorted=[...xs.map((x,i)=>({x,y:ys[i]}))].sort((a,b)=>a.x-b.x);
  makeChart(canvasId,{type:'line',data:{
    labels:sorted.map(p=>fmt(p.x,4)),
    datasets:[
      {label:'Data Points',data:sorted.map(p=>p.y),borderColor:C.accent,backgroundColor:'rgba(79,142,247,0.15)',borderWidth:2,pointRadius:5,tension:0.4,fill:true},
      {label:`f(${fmt(xval,4)}) ≈ ${fmt(result,6)}`,data:sorted.map(p=>Math.abs(p.x-xval)<1e-10?result:null),pointRadius:sorted.map(p=>Math.abs(p.x-xval)<1e-10?10:0),pointBackgroundColor:C.accent3,borderColor:'transparent',showLine:false}
    ]
  },options:baseChartOpts('x','f(x)')});
}

// ─── DYNAMIC MATRIX UI ─────────────────────────────────────────────────────


function buildMatrixUI(containerId,aPrefix,bPrefix,n){
  n=parseInt(n)||3;
  n=Math.max(2,Math.min(8,n));
  const el=document.getElementById(containerId);
  if(!el)return;
  const defaults={
    'jacobi-matrix':{A:[[10,-1,2],[-1,11,-1],[2,-1,10]],b:[6,25,-11]},
    'gs-matrix':{A:[[10,-1,2],[-1,11,-1],[2,-1,10]],b:[6,25,-11]},
    'lu-matrix':{A:[[2,1,-1],[-3,-1,2],[-2,1,2]],b:[8,-11,-3]}
  };
  const def=defaults[containerId]||{A:[],b:[]};
  let html='';
  for(let i=0;i<n;i++){
    html+='<div class="matrix-row">';
    for(let j=0;j<n;j++){
      const val=(def.A[i]&&def.A[i][j]!==undefined&&i<3&&j<3)?def.A[i][j]:0;
      html+=`<input value="${val}" id="${aPrefix}${i}${j}" style="width:${Math.max(52,70-n*3)}px">`;
    }
    const bval=(def.b[i]!==undefined&&i<3)?def.b[i]:0;
    html+=`<span class="matrix-eq">|</span><input value="${bval}" id="${bPrefix}${i}" class="matrix-rhs" style="width:${Math.max(52,70-n*3)}px">`;
    html+='</div>';
  }
  el.innerHTML=html;
}

function readMatrixN(aPrefix,bPrefix,n){
  let A=[],b=[];
  for(let i=0;i<n;i++){
    let row=[];
    for(let j=0;j<n;j++)row.push(parseFloat(document.getElementById(aPrefix+i+j).value||0));
    A.push(row);
    b.push(parseFloat(document.getElementById(bPrefix+i).value||0));
  }
  return{A,b};
}

function getMatrixN(nInputId){return parseInt(document.getElementById(nInputId).value)||3;}

function checkDiagDom(A,strict){
  for(let i=0;i<A.length;i++){
    let s=A[i].reduce((acc,v,j)=>i!==j?acc+Math.abs(v):acc,0);
    if(strict&&Math.abs(A[i][i])<=s)return false;
    if(!strict&&Math.abs(A[i][i])<s)return false;
  }
  return true;
}

function tryMakeDiagonallyDominant(A,b){
  const n=A.length;
  const used=new Array(n).fill(false);
  const newOrder=new Array(n).fill(-1);
  for(let i=0;i<n;i++){
    let best=-1,bestRatio=-1;
    for(let r=0;r<n;r++){
      if(used[r])continue;
      const diag=Math.abs(A[r][i]);
      const offsum=A[r].reduce((acc,v,j)=>j!==i?acc+Math.abs(v):acc,0);
      const ratio=diag/(offsum||1e-14);
      if(ratio>bestRatio){bestRatio=ratio;best=r;}
    }
    if(best===-1)return null;
    newOrder[i]=best;used[best]=true;
  }
  return{A:newOrder.map(r=>A[r].slice()),b:newOrder.map(r=>b[r]),order:newOrder};
}

function writeMatrixN(aPrefix,bPrefix,A,b){
  const n=A.length;
  for(let i=0;i<n;i++){
    for(let j=0;j<n;j++){const el=document.getElementById(aPrefix+i+j);if(el)el.value=A[i][j];}
    const el=document.getElementById(bPrefix+i);if(el)el.value=b[i];
  }
}

// ─── BISECTION ─────────────────────────────────────────────────────────────
function solveBisection(){
  try{
    const fStr=document.getElementById('bis-fx').value;
    let a=parseFloat(document.getElementById('bis-a').value);
    let b=parseFloat(document.getElementById('bis-b').value);
    const eps=parseFloat(document.getElementById('bis-eps').value);
    const maxIt=parseInt(document.getElementById('bis-max').value);
    const f=parseF(fStr);
    if(isNaN(a)||isNaN(b)||isNaN(eps)){showResult('bis-result',errorBox('Invalid numeric inputs'));return;}
    if(a>=b){showResult('bis-result',errorBox('a must be less than b'));return;}
    const fa=f(a),fb=f(b);
    if(fa*fb>=0){showResult('bis-result',errorBox(`f(a)·f(b) must be < 0. Got f(${a})=${fmt(fa,5)}, f(${b})=${fmt(fb,5)}. Same sign — no guaranteed root.`));return;}
    let rows=[],c,fc,it=0,a0=a,b0=b;
    const minN=Math.log((b-a)/eps)/Math.log(2);
    while(it<maxIt){
      c=(a+b)/2;fc=f(c);
      rows.push([it+1,fmt(a,6),fmt(b,6),fmt(c,8),fmt(fc,8),fmt(Math.abs(b-c),8)]);
      if(Math.abs(b-c)<eps||Math.abs(fc)<eps)break;
      if(fa*fc<0)b=c;else a=c;
      it++;
    }
    showResult('bis-result',resultBox(`x ≈ ${fmt(c,8)}`,'Root found',`<div class="status-row"><div class="dot"></div><span>Converged in ${it+1} iterations. Min needed: ${Math.ceil(minN)}</span></div>`)+makeTable(['n','a','b','c=(a+b)/2','f(c)','|b-c|'],rows));
    plotRootMethod('bis-plot','bis-plot-wrap',f,a0,b0,c);
  }catch(e){showResult('bis-result',errorBox('Invalid function: '+e.message));}
}

// ─── FALSE POSITION ────────────────────────────────────────────────────────
function solveFalsePos(){
  try{
    const fStr=document.getElementById('fp-fx').value;
    let a=parseFloat(document.getElementById('fp-a').value);
    let b=parseFloat(document.getElementById('fp-b').value);
    const eps=parseFloat(document.getElementById('fp-eps').value);
    const maxIt=parseInt(document.getElementById('fp-max').value);
    const f=parseF(fStr);
    if(isNaN(a)||isNaN(b)||isNaN(eps)){showResult('fp-result',errorBox('Invalid inputs'));return;}
    if(a>=b){showResult('fp-result',errorBox('a must be less than b'));return;}
    const fa0=f(a),fb0=f(b);
    if(fa0*fb0>=0){showResult('fp-result',errorBox(`f(a)·f(b) must be < 0. Got f(${a})=${fmt(fa0,5)}, f(${b})=${fmt(fb0,5)}.`));return;}
    let rows=[],xs,fa=fa0,fb=fb0,it=0,a0=a,b0=b;
    while(it<maxIt){
      if(Math.abs(fb-fa)<1e-14){showResult('fp-result',errorBox('f(b)-f(a) ≈ 0, division by zero'));return;}
      xs=(a*fb-b*fa)/(fb-fa);
      const fxs=f(xs);
      rows.push([it+1,fmt(a,6),fmt(b,6),fmt(xs,8),fmt(fxs,8)]);
      if(Math.abs(fxs)<eps||(rows.length>1&&Math.abs(xs-rows[rows.length-2][3])<eps))break;
      if(fa*fxs<0){b=xs;fb=fxs;}else{a=xs;fa=fxs;}
      it++;
    }
    showResult('fp-result',resultBox(`x ≈ ${fmt(xs,8)}`,'Root found',`<div class="status-row"><div class="dot"></div><span>Converged in ${it+1} iterations</span></div>`)+makeTable(['n','a','b','xs','f(xs)'],rows));
    plotRootMethod('fp-plot','fp-plot-wrap',f,a0,b0,xs);
  }catch(e){showResult('fp-result',errorBox('Invalid function: '+e.message));}
}

// ─── NEWTON-RAPHSON (auto derivative) ──────────────────────────────────────
function solveNewton(){
  try{
    const fStr=document.getElementById('nr-fx').value;
    let x=parseFloat(document.getElementById('nr-x0').value);
    const eps=parseFloat(document.getElementById('nr-eps').value);
    const maxIt=parseInt(document.getElementById('nr-max').value);
    const f=parseF(fStr);
    if(isNaN(x)||isNaN(eps)){showResult('nr-result',errorBox('Invalid inputs'));return;}
    let rows=[],xprev,it=0,x0=x;
    while(it<maxIt){
      const fx=f(x),dfx=numDeriv(f,x);
      if(Math.abs(dfx)<1e-12){showResult('nr-result',errorBox(`f'(x) ≈ 0 at x=${fmt(x,6)}. Method fails — derivative is zero.`));return;}
      const xn=x-fx/dfx;
      rows.push([it+1,fmt(x,8),fmt(fx,8),fmt(dfx,8),fmt(xn,8),fmt(Math.abs(xn-x),8)]);
      xprev=x;x=xn;
      if(Math.abs(xn-xprev)<eps||Math.abs(fx)<eps)break;
      it++;
    }
    const a=Math.min(x0,x)-Math.abs(x0-x)*0.5,b=Math.max(x0,x)+Math.abs(x0-x)*0.5;
    showResult('nr-result',resultBox(`x ≈ ${fmt(x,8)}`,'Root found',`<div class="status-row"><div class="dot"></div><span>Converged in ${it+1} iterations (derivative computed numerically)</span></div>`)+makeTable(['n','xₙ','f(xₙ)','f\'(xₙ) [auto]','xₙ₊₁','|xₙ₊₁-xₙ|'],rows));
    plotRootMethod('nr-plot','nr-plot-wrap',f,a,b,x);
  }catch(e){showResult('nr-result',errorBox('Invalid function: '+e.message));}
}

// ─── SECANT ────────────────────────────────────────────────────────────────
function solveSecant(){
  try{
    const fStr=document.getElementById('sec-fx').value;
    let x0=parseFloat(document.getElementById('sec-x0').value);
    let x1=parseFloat(document.getElementById('sec-x1').value);
    const eps=parseFloat(document.getElementById('sec-eps').value);
    const maxIt=parseInt(document.getElementById('sec-max').value);
    const f=parseF(fStr);
    if(isNaN(x0)||isNaN(x1)){showResult('sec-result',errorBox('Invalid inputs'));return;}
    if(x0===x1){showResult('sec-result',errorBox('x₀ and x₁ must be different'));return;}
    let rows=[],it=1,x0i=x0,x1i=x1;
    while(it<=maxIt){
      const f0=f(x0),f1=f(x1);
      if(Math.abs(f1-f0)<1e-14){showResult('sec-result',errorBox('f(x₁)-f(x₀) ≈ 0, division by zero'));return;}
      const x2=x1-f1*(x1-x0)/(f1-f0);
      rows.push([it,fmt(x0,8),fmt(x1,8),fmt(x2,8),fmt(Math.abs(x2-x1),8)]);
      if(Math.abs(x2-x1)<eps||Math.abs(f(x2))<eps){x1=x2;break;}
      x0=x1;x1=x2;it++;
    }
    showResult('sec-result',resultBox(`x ≈ ${fmt(x1,8)}`,'Root found',`<div class="status-row"><div class="dot"></div><span>Converged in ${it} iterations</span></div>`)+makeTable(['n','xₙ₋₁','xₙ','xₙ₊₁','|xₙ₊₁-xₙ|'],rows));
    const a=Math.min(x0i,x1)-0.5,b=Math.max(x1i,x1)+0.5;
    plotRootMethod('sec-plot','sec-plot-wrap',f,a,b,x1);
  }catch(e){showResult('sec-result',errorBox('Invalid function: '+e.message));}
}

// ─── JACOBI (N×N) ──────────────────────────────────────────────────────────
function autoReorderJacobi(){
  const n=getMatrixN('jac-n');
  const{A,b}=readMatrixN('jA','jb',n);
  const result=tryMakeDiagonallyDominant(A,b);
  if(!result){showResult('jac-result',errorBox('Cannot reorder rows to satisfy diagonal dominance.'));return;}
  writeMatrixN('jA','jb',result.A,result.b);
  showResult('jac-result',`<div class="result-box result-success"><div class="result-label">Rows Reordered</div><div style="font-size:13px;color:var(--text2);font-family:'JetBrains Mono',monospace">New order: [${result.order.map(r=>r+1).join(', ')}] — diagonal dominance satisfied. Click Solve.</div></div>`);
}

function solveJacobi(){
  const n=getMatrixN('jac-n');
  const{A,b}=readMatrixN('jA','jb',n);
  const eps=parseFloat(document.getElementById('jac-eps').value);
  const maxIt=parseInt(document.getElementById('jac-max').value);
  for(let r of A)for(let v of r)if(isNaN(v)){showResult('jac-result',errorBox('Invalid matrix values'));return;}
  if(!checkDiagDom(A,true)){showResult('jac-result',errorBox('Matrix is NOT strictly diagonally dominant. Jacobi may not converge.'));return;}
  let x=new Array(n).fill(0),rows=[],errors=[];
  const xLabels=x.map((_,i)=>`x${i+1}`);
  const colHeaders=['n',...xLabels,'max error'];
  for(let it=0;it<maxIt;it++){
    let xn=x.slice();
    for(let i=0;i<n;i++){
      let s=b[i];
      for(let j=0;j<n;j++)if(j!==i)s-=A[i][j]*x[j];
      xn[i]=s/A[i][i];
    }
    const err=Math.max(...xn.map((v,i)=>Math.abs(v-x[i])));
    errors.push(err);
    rows.push([it+1,...xn.map(v=>fmt(v,6)),fmt(err,8)]);
    x=xn;
    if(err<eps)break;
  }
  const solStr=x.map((v,i)=>`x${i+1}=${fmt(v,6)}`).join(', ');
  showResult('jac-result',resultBox(solStr,'Solution','')+makeTable(colHeaders,rows));
  plotConvergence('jac-plot','jac-plot-wrap',errors,'Max Error per Iteration');
}

// ─── GAUSS-SEIDEL (N×N) ────────────────────────────────────────────────────
function autoReorderGaussSeidel(){
  const n=getMatrixN('gs-n');
  const{A,b}=readMatrixN('gsA','gsb',n);
  const result=tryMakeDiagonallyDominant(A,b);
  if(!result){showResult('gs-result',errorBox('Cannot reorder rows to satisfy diagonal dominance.'));return;}
  writeMatrixN('gsA','gsb',result.A,result.b);
  showResult('gs-result',`<div class="result-box result-success"><div class="result-label">Rows Reordered</div><div style="font-size:13px;color:var(--text2);font-family:'JetBrains Mono',monospace">New order: [${result.order.map(r=>r+1).join(', ')}] — diagonal dominance satisfied. Click Solve.</div></div>`);
}

function solveGaussSeidel(){
  const n=getMatrixN('gs-n');
  const{A,b}=readMatrixN('gsA','gsb',n);
  const eps=parseFloat(document.getElementById('gs-eps').value);
  const maxIt=parseInt(document.getElementById('gs-max').value);
  for(let r of A)for(let v of r)if(isNaN(v)){showResult('gs-result',errorBox('Invalid matrix values'));return;}
  if(!checkDiagDom(A,false)){showResult('gs-result',errorBox('Matrix is NOT diagonally dominant. Gauss-Seidel may diverge.'));return;}
  let x=new Array(n).fill(0),rows=[],errors=[];
  const xLabels=x.map((_,i)=>`x${i+1}`);
  for(let it=0;it<maxIt;it++){
    let xold=x.slice();
    for(let i=0;i<n;i++){
      let s=b[i];
      for(let j=0;j<n;j++)if(j!==i)s-=A[i][j]*x[j];
      x[i]=s/A[i][i];
    }
    const err=Math.max(...x.map((v,i)=>Math.abs(v-xold[i])));
    errors.push(err);
    rows.push([it+1,...x.map(v=>fmt(v,6)),fmt(err,8)]);
    if(err<eps)break;
  }
  const solStr=x.map((v,i)=>`x${i+1}=${fmt(v,6)}`).join(', ');
  showResult('gs-result',resultBox(solStr,'Solution','')+makeTable(['n',...xLabels,'max error'],rows));
  plotConvergence('gs-plot','gs-plot-wrap',errors,'Max Error per Iteration');
}

// ─── LU DECOMPOSITION (N×N) ────────────────────────────────────────────────
function solveLU(){
  const n=getMatrixN('lu-n');
  const{A,b}=readMatrixN('luA','lub',n);
  for(let r of A)for(let v of r)if(isNaN(v)){showResult('lu-result',errorBox('Invalid matrix values'));return;}
  let L=Array.from({length:n},(_,i)=>Array.from({length:n},(_,j)=>i===j?1:0));
  let U=A.map(r=>r.slice());
  for(let j=0;j<n;j++){
    for(let i=j+1;i<n;i++){
      if(Math.abs(U[j][j])<1e-14){showResult('lu-result',errorBox(`Pivot U[${j}][${j}] ≈ 0. LU fails.`));return;}
      L[i][j]=U[i][j]/U[j][j];
      for(let k=j;k<n;k++)U[i][k]-=L[i][j]*U[j][k];
    }
  }
  let y=new Array(n).fill(0);
  for(let i=0;i<n;i++){y[i]=b[i];for(let j=0;j<i;j++)y[i]-=L[i][j]*y[j];}
  let x=new Array(n).fill(0);
  for(let i=n-1;i>=0;i--){
    if(Math.abs(U[i][i])<1e-14){showResult('lu-result',errorBox('U diagonal zero — no unique solution.'));return;}
    x[i]=y[i];
    for(let j=i+1;j<n;j++)x[i]-=U[i][j]*x[j];
    x[i]/=U[i][i];
  }
  const fmtM=m=>m.map(r=>r.map(v=>fmt(v,4)));
  const matStr=(m,name)=>`<div style="margin-top:12px;font-size:12px;color:var(--text2)">${name}:<br><span style="font-family:'JetBrains Mono',monospace;font-size:11px">${fmtM(m).map(r=>'[ '+r.join(', ')+' ]').join('<br>')}</span></div>`;
  const solStr=x.map((v,i)=>`x${i+1}=${fmt(v,6)}`).join(', ');
  showResult('lu-result',resultBox(solStr,'Solution via LU Decomposition',matStr(L,'L matrix')+matStr(U,'U matrix')+`<div style="margin-top:8px;font-size:12px;color:var(--text2)">y = [${y.map(v=>fmt(v,4)).join(', ')}]</div>`));
  plotSolutionBars('lu-plot','lu-plot-wrap',x,x.map((_,i)=>`x${i+1}`));
}

// ─── THOMAS ALGORITHM ──────────────────────────────────────────────────────
function solveThomas(){
  const n=4;
  let a=[],diag=[],sup=[],b_=[];
  for(let i=0;i<n;i++){
    a.push(parseFloat(document.getElementById('thA'+i+'0').value));
    diag.push(parseFloat(document.getElementById('thA'+i+'1').value));
    sup.push(parseFloat(document.getElementById('thA'+i+'2').value));
    b_.push(parseFloat(document.getElementById('thb'+i).value));
  }
  if([...a,...diag,...sup,...b_].some(v=>isNaN(v))){showResult('th-result',errorBox('Invalid inputs'));return;}
  if(a[0]!==0){showResult('th-result',errorBox('First row sub-diagonal must be 0.'));return;}
  if(sup[n-1]!==0){showResult('th-result',errorBox('Last row super-diagonal must be 0.'));return;}
  let y=[diag[0]];
  for(let i=1;i<n;i++){
    if(Math.abs(y[i-1])<1e-14){showResult('th-result',errorBox(`y[${i-1}] ≈ 0, division by zero`));return;}
    y.push(diag[i]-a[i]*sup[i-1]/y[i-1]);
  }
  if(Math.abs(diag[0])<1e-14){showResult('th-result',errorBox('Main diagonal element is zero'));return;}
  let z=[b_[0]/diag[0]];
  for(let i=1;i<n;i++){
    if(Math.abs(y[i])<1e-14){showResult('th-result',errorBox(`y[${i}] ≈ 0, division by zero`));return;}
    z.push((b_[i]-a[i]*z[i-1])/y[i]);
  }
  let x=new Array(n);x[n-1]=z[n-1];
  for(let i=n-2;i>=0;i--){
    if(Math.abs(y[i])<1e-14){showResult('th-result',errorBox('Division by zero in back substitution'));return;}
    x[i]=z[i]-sup[i]*x[i+1]/y[i];
  }
  const rows=[['y values',y.map(v=>fmt(v,4)).join(', ')],['z values',z.map(v=>fmt(v,4)).join(', ')],['x (solution)',x.map(v=>fmt(v,6)).join(', ')]];
  showResult('th-result',resultBox(`x = [${x.map(v=>fmt(v,6)).join(', ')}]`,'Solution (Thomas Algorithm)',`<table class="iter-table" style="margin-top:12px"><tbody>${rows.map(r=>`<tr><td style="font-weight:600;color:var(--text)">${r[0]}</td><td>${r[1]}</td></tr>`).join('')}</tbody></table>`));
  plotSolutionBars('th-plot','th-plot-wrap',x,x.map((_,i)=>`x${i+1}`));
}

// ─── DIFFERENCE TABLE HELPERS ──────────────────────────────────────────────
function buildDiffTable(ys){
  let t=[ys.slice()];
  while(t[t.length-1].length>1){const prev=t[t.length-1];t.push(prev.slice(1).map((v,i)=>v-prev[i]));}
  return t;
}
function diffTableHTML(xs,ys,label){
  const dt=buildDiffTable(ys);
  const n=ys.length;
  let h=`<div class="diff-table-wrap"><table class="diff-table"><thead><tr><th>x</th><th>y</th>`;
  for(let k=1;k<n;k++)h+=`<th>${label}${k===1?'':k}y</th>`;
  h+='</tr></thead><tbody>';
  for(let i=0;i<n;i++){
    h+=`<tr><td>${fmt(xs[i],4)}</td><td>${fmt(ys[i],6)}</td>`;
    for(let k=1;k<n;k++){
      if(k<dt.length&&i<dt[k].length)h+=`<td class="highlight">${fmt(dt[k][i],6)}</td>`;
      else h+='<td></td>';
    }
    h+='</tr>';
  }
  return h+'</tbody></table></div>';
}
function parseXY(xstr,ystr){
  return{xs:xstr.split(',').map(v=>parseFloat(v.trim())),ys:ystr.split(',').map(v=>parseFloat(v.trim()))};
}
function checkEqualSpacing(xs){
  const h=xs[1]-xs[0];
  for(let i=2;i<xs.length;i++)if(Math.abs((xs[i]-xs[i-1])-h)>1e-8)return false;
  return true;
}

// ─── FORWARD DIFFERENCES ───────────────────────────────────────────────────
function solveForward(){
  const{xs,ys}=parseXY(document.getElementById('fwd-xs').value,document.getElementById('fwd-ys').value);
  const xval=parseFloat(document.getElementById('fwd-xval').value);
  if(xs.some(isNaN)||ys.some(isNaN)){showResult('fwd-result',errorBox('Invalid X or Y values'));return;}
  if(xs.length!==ys.length){showResult('fwd-result',errorBox('X and Y must have same count'));return;}
  if(!checkEqualSpacing(xs)){showResult('fwd-result',errorBox('X values must be equally spaced.'));return;}
  const n=xs.length,h=xs[1]-xs[0],p=(xval-xs[0])/h;
  const dt=buildDiffTable(ys);
  let result=ys[0],coeff=p,fact=1;
  for(let k=1;k<n&&k<dt.length;k++){fact*=k;result+=coeff*dt[k][0]/fact;coeff*=(p-k);}
  showResult('fwd-result',resultBox(`f(${xval}) ≈ ${fmt(result,8)}`,'Forward Interpolation Result',`<div class="status-row"><div class="dot"></div><span>p = ${fmt(p,6)}, x₀ = ${xs[0]}</span></div>`)+diffTableHTML(xs,ys,'Δ'));
  plotInterpolation('fwd-plot','fwd-plot-wrap',xs,ys,xval,result);
}

// ─── BACKWARD DIFFERENCES ──────────────────────────────────────────────────
function solveBackward(){
  const{xs,ys}=parseXY(document.getElementById('bwd-xs').value,document.getElementById('bwd-ys').value);
  const xval=parseFloat(document.getElementById('bwd-xval').value);
  if(xs.some(isNaN)||ys.some(isNaN)){showResult('bwd-result',errorBox('Invalid X or Y values'));return;}
  if(xs.length!==ys.length){showResult('bwd-result',errorBox('X and Y must have same count'));return;}
  if(!checkEqualSpacing(xs)){showResult('bwd-result',errorBox('X values must be equally spaced.'));return;}
  const n=xs.length,h=xs[1]-xs[0],xn=xs[n-1],p=(xval-xn)/h;
  const dt=buildDiffTable(ys);
  let result=ys[n-1],coeff=p,fact=1;
  for(let k=1;k<n&&k<dt.length;k++){
    fact*=k;
    if(n-k-1>=0&&dt[k].length>n-k-1)result+=coeff*dt[k][n-1-k]/fact;
    coeff*=(p+k);
  }
  showResult('bwd-result',resultBox(`f(${xval}) ≈ ${fmt(result,8)}`,'Backward Interpolation Result',`<div class="status-row"><div class="dot"></div><span>p = ${fmt(p,6)}, xₙ = ${xn}</span></div>`)+diffTableHTML(xs,ys,'∇'));
  plotInterpolation('bwd-plot','bwd-plot-wrap',xs,ys,xval,result);
}

// ─── STIRLING ──────────────────────────────────────────────────────────────
function solveStirling(){
  const{xs,ys}=parseXY(document.getElementById('stir-xs').value,document.getElementById('stir-ys').value);
  const xval=parseFloat(document.getElementById('stir-xval').value);
  if(xs.some(isNaN)||ys.some(isNaN)){showResult('stir-result',errorBox('Invalid X or Y values'));return;}
  if(xs.length!==ys.length){showResult('stir-result',errorBox('X and Y must have same count'));return;}
  if(xs.length%2===0){showResult('stir-result',errorBox('Number of points must be odd for Stirling.'));return;}
  if(!checkEqualSpacing(xs)){showResult('stir-result',errorBox('X values must be equally spaced.'));return;}
  const n=xs.length,h=xs[1]-xs[0],mid=Math.floor(n/2),x0=xs[mid],p=(xval-x0)/h;
  const dt=buildDiffTable(ys);
  let result=ys[mid];
  if(n>=3&&dt[1].length>mid){result+=p*(( dt[1][mid]??0)+(dt[1][mid-1]??0))/2;}
  if(n>=3&&dt[2]&&dt[2].length>mid-1&&mid-1>=0){result+=(p*p/2)*dt[2][mid-1];}
  if(n>=5&&dt[3]&&dt[3].length>mid-1&&mid-2>=0){result+=p*(p*p-1)/6*((dt[3][mid-1]??0)+(dt[3][mid-2]??0))/2;}
  if(n>=5&&dt[4]&&dt[4].length>mid-2&&mid-2>=0){result+=(p*p*(p*p-1)/24)*(dt[4][mid-2]??0);}
  showResult('stir-result',resultBox(`f(${xval}) ≈ ${fmt(result,8)}`,'Stirling Central Interpolation',`<div class="status-row"><div class="dot"></div><span>x₀ = ${x0}, p = ${fmt(p,6)}</span></div>`)+diffTableHTML(xs,ys,'Δ'));
  plotInterpolation('stir-plot','stir-plot-wrap',xs,ys,xval,result);
}

// ─── LAGRANGE ──────────────────────────────────────────────────────────────
function lagrangeBuildPoly(xs,ys){
  // Build polynomial coefficients using Lagrange basis numerically (degree n-1)
  // Returns array of coefficients [a0,a1,...,an] for a0+a1*x+a2*x^2+...
  const n=xs.length;
  const deg=n-1;
  let poly=new Array(deg+1).fill(0);
  for(let i=0;i<n;i++){
    // compute Li basis polynomial coefficients
    let basis=[1]; // start with 1
    let denom=1;
    for(let j=0;j<n;j++){
      if(i===j)continue;
      denom*=(xs[i]-xs[j]);
      // multiply basis by (x - xs[j])
      let newBasis=new Array(basis.length+1).fill(0);
      for(let k=0;k<basis.length;k++){
        newBasis[k+1]+=basis[k];
        newBasis[k]+=-xs[j]*basis[k];
      }
      basis=newBasis;
    }
    for(let k=0;k<=deg;k++) poly[k]+=ys[i]*basis[k]/denom;
  }
  return poly;
}
function polyToStr(coeffs,prec=4){
  const n=coeffs.length;
  let terms=[];
  for(let i=n-1;i>=0;i--){
    const c=parseFloat(coeffs[i].toFixed(prec));
    if(Math.abs(c)<1e-10)continue;
    let term='';
    if(i===0) term=`${c}`;
    else if(i===1) term=`${c}x`;
    else term=`${c}x^${i}`;
    terms.push(term);
  }
  return terms.length?terms.join(' + ').replace(/\+ -/g,'- '):'0';
}
function polyDeriv(coeffs){
  // returns derivative coefficients
  return coeffs.slice(1).map((c,i)=>c*(i+1));
}
function polyEval(coeffs,x){
  return coeffs.reduce((s,c,i)=>s+c*Math.pow(x,i),0);
}
function lagrangePlot(xs,ys,poly,xval,containerId){
  const box=document.getElementById(containerId);
  const cid=containerId+'-chart';
  let wrap=document.getElementById(cid+'-wrap');
  if(!wrap){
    wrap=document.createElement('div');
    wrap.id=cid+'-wrap';
    wrap.style.cssText='background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:20px;margin-top:12px';
    wrap.innerHTML=`<div class="card-title">Polynomial Plot</div><canvas id="${cid}" height="240"></canvas>`;
    box.appendChild(wrap);
  }
  const allX = [...xs];
  if(xval!==null&&!isNaN(xval)) allX.push(xval);
  const minX=Math.min(...allX), maxX=Math.max(...allX);
  const range=maxX-minX||1;
  const padding=range*0.1;
  const x0=minX-padding, x1=maxX+padding;
  const pts=150;
  const step=(x1-x0)/pts;
  const labels=[], polyData=[], dataPoints=new Array(pts+1).fill(null);
  const highlightPoints=new Array(pts+1).fill(null), highlightRadius=new Array(pts+1).fill(0), dataRadius=new Array(pts+1).fill(0);

  for(let i=0;i<=pts;i++){
    const x=x0+i*step;
    labels.push(fmt(x,4));
    polyData.push(polyEval(poly,x));
  }
  xs.forEach((x,i)=>{
    const idx=Math.max(0,Math.min(pts,Math.round((x-x0)/step)));
    dataPoints[idx]=ys[i]; dataRadius[idx]=6;
  });
  if(xval!==null&&!isNaN(xval)){
    const idx=Math.max(0,Math.min(pts,Math.round((xval-x0)/step)));
    highlightPoints[idx]=polyEval(poly,xval); highlightRadius[idx]=8;
  }
  const datasets=[
    {label:'f(x) polynomial', data:polyData, borderColor:C.accent, backgroundColor:'transparent', borderWidth:2, pointRadius:0, tension:0.4},
    {label:'Data Points', data:dataPoints, pointRadius:dataRadius, pointBackgroundColor:C.accent3, borderColor:'transparent', showLine:false}
  ];
  if(xval!==null&&!isNaN(xval)){
    datasets.push({label:`f(${fmt(xval,4)}) ≈ ${fmt(highlightPoints.find(v=>v!==null),6)}`, data:highlightPoints, pointRadius:highlightRadius, pointBackgroundColor:C.warn, borderColor:'transparent', showLine:false});
  }
  makeChart(cid,{type:'line', data:{labels, datasets}, options:baseChartOpts('x','f(x)')});
}

function solveLagrange(){
  const{xs,ys}=parseXY(document.getElementById('lag-xs').value,document.getElementById('lag-ys').value);
  const xvalRaw=document.getElementById('lag-xval').value.trim();
  const xval=parseFloat(xvalRaw);
  const mode=document.getElementById('lag-mode').value;
  if(xs.some(isNaN)||ys.some(isNaN)){showResult('lag-result',errorBox('Invalid X or Y values'));return;}
  if(xs.length!==ys.length){showResult('lag-result',errorBox('X and Y must have same count'));return;}
  if(xs.length<2){showResult('lag-result',errorBox('Need at least 2 data points'));return;}
  const n=xs.length;
  const pts_x=mode==='inverse'?ys:xs;
  const pts_y=mode==='inverse'?xs:ys;
  const poly=lagrangeBuildPoly(pts_x,pts_y);
  const polyStr=polyToStr(poly);
  const polyBox=`<div class="result-box result-success" style="margin-top:8px"><div class="result-label">Lagrange Polynomial f(x)</div><div style="font-family:'JetBrains Mono',monospace;font-size:13px;color:var(--accent);word-break:break-all">f(x) = ${polyStr}</div></div>`;
  if(xvalRaw===''||isNaN(xval)){
    showResult('lag-result',polyBox);
    setTimeout(()=>lagrangePlot(pts_x,pts_y,poly,null,'lag-result'),50);
    return;
  }
  let result=0;
  let terms=[];
  for(let i=0;i<n;i++){
    let Li=1;
    for(let j=0;j<n;j++){if(i!==j)Li*=(xval-pts_x[j])/(pts_x[i]-pts_x[j]);}
    result+=Li*pts_y[i];
    terms.push([i,fmt(pts_x[i],4),fmt(pts_y[i],4),fmt(Li,8),fmt(Li*pts_y[i],8)]);
  }
  const label=mode==='inverse'?`x(f=${xval})`:`f(x=${xval})`;
  showResult('lag-result',resultBox(`${label} ≈ ${fmt(result,8)}`,mode==='inverse'?'Inverse Interpolation':'Lagrange Interpolation','')+polyBox+makeTable(['i','xᵢ','yᵢ','Lᵢ(x)','Lᵢ(x)·yᵢ'],terms)+`<div class="result-box result-success" style="margin-top:8px"><div class="result-label">Sum check</div><div style="font-family:'JetBrains Mono',monospace;font-size:13px;color:var(--text2)">Σ Lᵢ(x)·yᵢ = ${fmt(result,8)}</div></div>`);
  setTimeout(()=>lagrangePlot(pts_x,pts_y,poly,xval,'lag-result'),50);
}
function buildDiffTableFull(ys){
  // returns forward diff table dt where dt[0]=ys, dt[1]=Δy, etc.
  const n=ys.length;
  let dt=[ys.slice()];
  for(let k=1;k<n;k++){
    let row=[];
    for(let i=0;i<dt[k-1].length-1;i++) row.push(dt[k-1][i+1]-dt[k-1][i]);
    if(!row.length)break;
    dt.push(row);
  }
  return dt;
}

function diffTableHTML2(xs,dt,sym){
  let h=`<div class="diff-table-wrap"><table class="diff-table"><thead><tr><th>x</th><th>y</th>`;
  for(let k=1;k<dt.length;k++) h+=`<th>${sym}${k>1?k:''}y</th>`;
  h+=`</tr></thead><tbody>`;
  for(let i=0;i<xs.length;i++){
    h+=`<tr><td>${fmt(xs[i],4)}</td><td>${fmt(dt[0][i],6)}</td>`;
    for(let k=1;k<dt.length;k++) h+=`<td class="${dt[k][i]!==undefined?'highlight':''}">${dt[k][i]!==undefined?fmt(dt[k][i],6):''}</td>`;
    h+=`</tr>`;
  }
  return h+`</tbody></table></div>`;
}

function diffResultBox(fp,fpp,xval){
  return `<div class="result-box result-success"><div class="result-label">Derivatives at x = ${xval}</div>
    <div style="display:flex;gap:24px;flex-wrap:wrap;margin-top:8px">
      <div><div style="font-size:11px;color:var(--text3);letter-spacing:1px">f'(${xval})</div><div class="result-value">${fmt(fp,6)}</div></div>
      <div><div style="font-size:11px;color:var(--text3);letter-spacing:1px">f''(${xval})</div><div class="result-value">${fmt(fpp,6)}</div></div>
    </div></div>`;
}

function diffPlot(xs,ys,fp_vals,fpp_vals,containerId){
  const box=document.getElementById(containerId);
  const cid=containerId+'-chart';
  let wrap=document.getElementById(cid+'-wrap');
  if(!wrap){
    wrap=document.createElement('div');
    wrap.id=cid+'-wrap';
    wrap.style.cssText='background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:20px;margin-top:12px';
    wrap.innerHTML=`<div class="card-title">Derivatives Plot</div><canvas id="${cid}" height="240"></canvas>`;
    box.appendChild(wrap);
  }
  const labels=xs.map(x=>fmt(x,4));
  const datasets=[{label:'f(x)', data:ys, borderColor:C.accent, backgroundColor:'transparent', borderWidth:2, pointRadius:4, tension:0.4}];
  if(fp_vals) datasets.push({label:"f'(x)", data:fp_vals, borderColor:C.accent3, backgroundColor:'transparent', borderWidth:2, pointRadius:4, tension:0.4});
  if(fpp_vals) datasets.push({label:"f''(x)", data:fpp_vals, borderColor:C.warn, backgroundColor:'transparent', borderWidth:2, pointRadius:4, tension:0.4});
  makeChart(cid,{type:'line', data:{labels, datasets}, options:baseChartOpts('x','Value')});
}

// --- FORWARD DIFF ---
function solveDiffForward(){
  const{xs,ys}=parseXY(document.getElementById('dfwd-xs').value,document.getElementById('dfwd-ys').value);
  const xval=parseFloat(document.getElementById('dfwd-xval').value);
  if(xs.some(isNaN)||ys.some(isNaN)){showResult('dfwd-result',errorBox('Invalid X or Y values'));return;}
  if(!checkEqualSpacing(xs)){showResult('dfwd-result',errorBox('X values must be equally spaced'));return;}
  const h=xs[1]-xs[0];
  const dt=buildDiffTableFull(ys);
  // find index of xval
  let idx=xs.findIndex(x=>Math.abs(x-xval)<1e-9);
  if(idx<0){showResult('dfwd-result',errorBox(`x = ${xval} is not in the table. Use a tabulated x value.`));return;}
  // f' at idx (use dt[k][idx])
  const D=dt;
  let fp=0,fpp=0;
  const coef1=[1,-1/2,1/3,-1/4,1/5];
  const coef2=[1,-1,11/12,-5/6];
  for(let k=1;k<=Math.min(5,D.length-1);k++){
    if(D[k][idx]!==undefined&&!isNaN(D[k][idx])){
      if(k<=coef1.length) fp+=coef1[k-1]*D[k][idx];
    }
  }
  fp/=h;
  for(let k=2;k<=Math.min(5,D.length-1);k++){
    if(D[k][idx]!==undefined&&!isNaN(D[k][idx])){
      if(k-2<coef2.length) fpp+=coef2[k-2]*D[k][idx];
    }
  }
  fpp/=(h*h);
  // compute f' for all points for plot
  const fp_all=xs.map((_,i)=>{
    let s=0;
    for(let k=1;k<=Math.min(5,D.length-1);k++){if(D[k][i]!==undefined&&!isNaN(D[k][i])&&k<=coef1.length)s+=coef1[k-1]*D[k][i];}
    return s/h;
  });
  const fpp_all=xs.map((_,i)=>{
    let s=0;
    for(let k=2;k<=Math.min(5,D.length-1);k++){if(D[k][i]!==undefined&&!isNaN(D[k][i])&&k-2<coef2.length)s+=coef2[k-2]*D[k][i];}
    return s/(h*h);
  });
  showResult('dfwd-result', diffResultBox(fp,fpp,xval)+diffTableHTML2(xs,dt,'Δ'));
  diffPlot(xs,ys,fp_all,fpp_all,'dfwd-result');
}

// --- BACKWARD DIFF ---
function solveDiffBackward(){
  const{xs,ys}=parseXY(document.getElementById('dbwd-xs').value,document.getElementById('dbwd-ys').value);
  const xval=parseFloat(document.getElementById('dbwd-xval').value);
  if(xs.some(isNaN)||ys.some(isNaN)){showResult('dbwd-result',errorBox('Invalid X or Y values'));return;}
  if(!checkEqualSpacing(xs)){showResult('dbwd-result',errorBox('X values must be equally spaced'));return;}
  const h=xs[1]-xs[0];
  const n=xs.length;
  // Build backward diff table (same values, read from bottom)
  const dt=buildDiffTableFull(ys);
  let idx=xs.findIndex(x=>Math.abs(x-xval)<1e-9);
  if(idx<0){showResult('dbwd-result',errorBox(`x = ${xval} is not in the table.`));return;}
  // nabla^k y_n = dt[k][n-1-k] (last diagonal element of order k)
  // For point at idx: nabla^k y_idx = dt[k][idx-k]
  const coef1=[1,1/2,1/3,1/4,1/5];
  const coef2=[1,1,11/12,5/6];
  let fp=0,fpp=0;
  for(let k=1;k<=Math.min(5,dt.length-1);k++){
    const ri=idx-k;
    if(ri>=0&&dt[k][ri]!==undefined&&!isNaN(dt[k][ri])&&k<=coef1.length) fp+=coef1[k-1]*dt[k][ri];
  }
  fp/=h;
  for(let k=2;k<=Math.min(5,dt.length-1);k++){
    const ri=idx-k;
    if(ri>=0&&dt[k][ri]!==undefined&&!isNaN(dt[k][ri])&&k-2<coef2.length) fpp+=coef2[k-2]*dt[k][ri];
  }
  fpp/=(h*h);
  const fp_all=xs.map((_,i)=>{let s=0;for(let k=1;k<=Math.min(5,dt.length-1);k++){const ri=i-k;if(ri>=0&&dt[k][ri]!==undefined&&!isNaN(dt[k][ri])&&k<=coef1.length)s+=coef1[k-1]*dt[k][ri];}return s/h;});
  const fpp_all=xs.map((_,i)=>{let s=0;for(let k=2;k<=Math.min(5,dt.length-1);k++){const ri=i-k;if(ri>=0&&dt[k][ri]!==undefined&&!isNaN(dt[k][ri])&&k-2<coef2.length)s+=coef2[k-2]*dt[k][ri];}return s/(h*h);});
  showResult('dbwd-result', diffResultBox(fp,fpp,xval)+diffTableHTML2(xs,dt,'∇'));
  diffPlot(xs,ys,fp_all,fpp_all,'dbwd-result');
}

// --- STIRLING DIFF ---
function solveDiffStirling(){
  const{xs,ys}=parseXY(document.getElementById('dstir-xs').value,document.getElementById('dstir-ys').value);
  const xval=parseFloat(document.getElementById('dstir-xval').value);
  if(xs.some(isNaN)||ys.some(isNaN)){showResult('dstir-result',errorBox('Invalid X or Y values'));return;}
  if(!checkEqualSpacing(xs)){showResult('dstir-result',errorBox('X values must be equally spaced'));return;}
  const h=xs[1]-xs[0];
  const n=xs.length;
  const dt=buildDiffTableFull(ys);
  let idx=xs.findIndex(x=>Math.abs(x-xval)<1e-9);
  if(idx<0){showResult('dstir-result',errorBox(`x = ${xval} is not in the table.`));return;}
  // Stirling: x0 is center. idx is x0 in the table
  // f'(x0) = (1/h)[(Δy_{-1}+Δy_0)/2 - (1/6)(Δ³y_{-2}+Δ³y_{-1})/2 + ...]
  // In terms of dt: Δy_{-1} = dt[1][idx-1], Δy_0 = dt[1][idx]
  // Δ³y_{-2}=dt[3][idx-2], Δ³y_{-1}=dt[3][idx-1]
  // Δ²y_{-1}=dt[2][idx-1], Δ⁴y_{-2}=dt[4][idx-2]
  const g=k=>i=>dt[k]&&dt[k][i]!==undefined?dt[k][i]:0;
  const d1=g(1),d2=g(2),d3=g(3),d4=g(4),d5=g(5);
  const i0=idx;
  let fp=(d1(i0-1)+d1(i0))/2 - (1/6)*(d3(i0-2)+d3(i0-1))/2 + (1/30)*(d5(i0-3)+d5(i0-2))/2;
  fp/=h;
  let fpp=d2(i0-1) - (1/12)*d4(i0-2);
  fpp/=(h*h);
  const fp_all=xs.map((_,i)=>{
    let v=(d1(i-1)+d1(i))/2-(1/6)*(d3(i-2)+d3(i-1))/2;
    return v/h;
  });
  const fpp_all=xs.map((_,i)=>{
    return (d2(i-1)-(1/12)*d4(i-2))/(h*h);
  });
  showResult('dstir-result', diffResultBox(fp,fpp,xval)+diffTableHTML2(xs,dt,'Δ'));
  diffPlot(xs,ys,fp_all,fpp_all,'dstir-result');
}

// --- LAGRANGE DIFF ---
function solveDiffLagrange(){
  const{xs,ys}=parseXY(document.getElementById('dlag-xs').value,document.getElementById('dlag-ys').value);
  const xvalRaw=document.getElementById('dlag-xval').value.trim();
  const xval=parseFloat(xvalRaw);
  if(xs.some(isNaN)||ys.some(isNaN)){showResult('dlag-result',errorBox('Invalid X or Y values'));return;}
  if(xs.length!==ys.length||xs.length<2){showResult('dlag-result',errorBox('Need at least 2 valid data points'));return;}
  const poly=lagrangeBuildPoly(xs,ys);
  const dpoly=polyDeriv(poly);
  const ddpoly=polyDeriv(dpoly);
  const polyStr=polyToStr(poly);
  const dpolyStr=polyToStr(dpoly);
  const ddpolyStr=polyToStr(ddpoly);
  const polyBox=`<div class="result-box result-success"><div class="result-label">Lagrange Polynomial f(x)</div>
    <div style="font-family:'JetBrains Mono',monospace;font-size:12px;color:var(--accent);word-break:break-all;margin-bottom:8px">f(x) = ${polyStr}</div>
    <div style="font-family:'JetBrains Mono',monospace;font-size:12px;color:var(--accent3);word-break:break-all;margin-bottom:8px">f'(x) = ${dpolyStr}</div>
    <div style="font-family:'JetBrains Mono',monospace;font-size:12px;color:var(--warn);word-break:break-all">f''(x) = ${ddpolyStr}</div>
  </div>`;
  if(xvalRaw===''||isNaN(xval)){
    showResult('dlag-result',polyBox);
    // plot over data range
    const minX=Math.min(...xs),maxX=Math.max(...xs);
    const plotXs=[],plotYs=[],plotFp=[],plotFpp=[];
    for(let i=0;i<=40;i++){const x=minX+i*(maxX-minX)/40;plotXs.push(x);plotYs.push(polyEval(poly,x));plotFp.push(polyEval(dpoly,x));plotFpp.push(polyEval(ddpoly,x));}
    setTimeout(()=>diffPlot(plotXs,plotYs,plotFp,plotFpp,'dlag-result'),50);
    return;
  }
  const fp_val=polyEval(dpoly,xval);
  const fpp_val=polyEval(ddpoly,xval);
  showResult('dlag-result',diffResultBox(fp_val,fpp_val,xval)+polyBox);
  const minX=Math.min(...xs,xval),maxX=Math.max(...xs,xval);
  const plotXs=[],plotYs=[],plotFp=[],plotFpp=[];
  for(let i=0;i<=40;i++){const x=minX+i*(maxX-minX)/40;plotXs.push(x);plotYs.push(polyEval(poly,x));plotFp.push(polyEval(dpoly,x));plotFpp.push(polyEval(ddpoly,x));}
  setTimeout(()=>diffPlot(plotXs,plotYs,plotFp,plotFpp,'dlag-result'),50);
}
// ─── INIT ──────────────────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded',()=>{
  buildMatrixUI('jacobi-matrix','jA','jb',3);
  buildMatrixUI('gs-matrix','gsA','gsb',3);
  buildMatrixUI('lu-matrix','luA','lub',3);
});
