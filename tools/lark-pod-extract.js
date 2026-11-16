/* Chạy trong tab Lark "FULLFILLMENT (THẢO)" (Claude in Chrome · javascript_tool). Đọc các tab tháng đã tải,
   trả về window.__E = [chuỗi JSON nén mỗi tháng]. Sau đó dán từng chuỗi vào tab web Nexa và gọi podDecodeSave (xem cuối file). */
const pad=n=>String(n).padStart(2,"0");const dsNorm=s=>String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/đ/gi,"d").toLowerCase().replace(/\s+/g," ").trim();
const podN=v=>{const s=String(v??"").replace(/[^0-9.-]/g,"");const n=+s;return s&&s!=="-"&&isFinite(n)?n:0};
function podDate(v){const s=String(v||"").trim();let m=/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/.exec(s);if(m)return`${m[3].length===2?"20"+m[3]:m[3]}-${pad(+m[1])}-${pad(+m[2])}`;
  m=/^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(s);if(m)return`${m[1]}-${pad(+m[2])}-${pad(+m[3])}`;if(/^\d{5}(\.\d+)?$/.test(s)){const d=new Date(Math.round((+s-25569)*864e5));return`${d.getUTCFullYear()}-${pad(d.getUTCMonth()+1)}-${pad(d.getUTCDate())}`}return null}
function podParse(grid,tab){const norm=x=>dsNorm(x),G=r=>grid[r]||[];let hr=-1;
  /* Dòng tiêu đề: ô đầu là "Date" và có ít nhất 2 cột "Shop …" */
  for(let r=0;r<Math.min(grid.length,10);r++)if(norm(G(r)[0])==="date"&&G(r).filter(c=>/^shop/.test(norm(c))).length>=2){hr=r;break}
  if(hr<0)return{err:`Tab "${tab}": không thấy dòng tiêu đề "Date | Shop …"`};
  const H=G(hr),sr=[hr-1,hr+1].find(r=>r>=0&&norm(G(r)[0])==="seller"),SR=sr!=null?G(sr):[];
  const isEnd=c=>/tong don|^coc$|^phi full/.test(norm(H[c]))||/tong don/.test(norm(SR[c]));
  let tot=1;while(tot<H.length&&!isEnd(tot)&&!(norm(H[tot])==="date"))tot++;
  const shops=[];let lastSel="";for(let c=1;c<tot;c++){let n=String(H[c]||"").trim();if(!n)continue;let sel=String(SR[c]||"").trim();
    if(sr!=null){if(sel)lastSel=sel;else sel=lastSel} /* ô Seller gộp nhiều cột: dùng tên ở ô đầu */
    const m=/^(.*?)\s*\(([^)]+)\)\s*$/.exec(n);if(m){n=m[1].trim();sel=sel||m[2].trim()}shops.push({c,name:n,seller:sel})}
  const leftFee=H.findIndex((c,i)=>i>=tot&&/^phi full/.test(norm(c))&&!H.slice(1,i).some(x=>norm(x)==="date"));
  /* Bảng phí bên phải: cột "Date" thứ hai (có thể nằm ở dòng trên/dưới dòng tiêu đề) */
  let fr=-1,d2=-1;for(const r of [hr,hr-1,hr+1,hr-2,hr+2]){if(r<0)continue;const k=G(r).findIndex((c,i)=>i>tot&&norm(c)==="date");if(k>0){fr=r;d2=k;break}}
  const fee={};let feeCol=-1,extraCol=-1,noteCol=-1;
  if(d2>0){const FH=G(fr);for(let c=d2+1;c<FH.length;c++){const n=norm(FH[c]);if(!n)continue;if(/^phi full/.test(n))feeCol=c;else if(/phat sinh/.test(n))extraCol=c;else if(/ghi chu/.test(n))noteCol=c;else if(feeCol<0&&/^shop/.test(n))fee[String(FH[c]).replace(/\s*\(.*\)\s*$/,"").trim()]=c}}
  const counts={},fees={},day={};let month="";
  for(let r=hr+1;r<grid.length;r++){const row=G(r);const d=podDate(row[0]);if(!d)continue;
    const cn={};shops.forEach(s=>{const v=podN(row[s.c]);if(v)cn[s.name]=v});if(Object.keys(cn).length)counts[d]=cn;
    let t=leftFee>=0?podN(row[leftFee]):0,x=0,no="";
    if(d2>0){const fd=podDate(row[d2])===d?row:(grid.find(z=>podDate((z||[])[d2])===d)||[]);
      const fe={};Object.entries(fee).forEach(([n,c])=>{const v=podN(fd[c]);if(v)fe[n]=v});if(Object.keys(fe).length)fees[d]=fe;
      if(feeCol>=0)t=podN(fd[feeCol])||t;x=extraCol>=0?podN(fd[extraCol]):0;no=noteCol>=0?String(fd[noteCol]||"").trim():""}
    if(t||x||no)day[d]={fee:t,extra:x,note:no.slice(0,120)};month=month||d.slice(0,7)}
  if(!month)return{err:`Tab "${tab}": không đọc được ngày nào`};
  return{month,tab,shops:shops.map(({name,seller})=>({name,seller})),counts,fees,day}}

const __grid=i=>{const ws=window.spread.sheets[i],R=Math.min(ws.getRowCount(),70),C=ws.getColumnCount(),g=[];for(let r=0;r<R;r++){const row=[];for(let c=0;c<C;c++){let t="";try{t=ws.getText(r,c)}catch(e){}row.push(String(t??""))}g.push(row)}return g};
const __enc=p=>{const names=[...new Set([...p.shops.map(s=>s.name),...Object.values(p.fees).flatMap(o=>Object.keys(o))])];const ix=n=>names.indexOf(n),dd=d=>+d.slice(8);
  return{m:p.month,t:p.tab,n:names,s:p.shops.map(s=>s.seller),c:Object.entries(p.counts).map(([d,o])=>[dd(d),...Object.entries(o).flatMap(([k,v])=>[ix(k),v])]),f:Object.entries(p.fees).map(([d,o])=>[dd(d),...Object.entries(o).flatMap(([k,v])=>[ix(k),v])]),d:Object.entries(p.day).map(([d,o])=>[dd(d),o.fee,o.extra,o.note])}};
window.__P=window.spread.sheets.map((s,i)=>/^t\s*\d{1,2}[.\/-]\d{4}/i.test(s.name())?podParse(__grid(i),s.name()):null).filter(Boolean);
window.__E=window.__P.map(p=>p.err?null:JSON.stringify(__enc(p)));
window.__P.map((p,i)=>p.err||`${p.tab}: ${Object.values(p.counts).reduce((a,o)=>a+Object.values(o).reduce((x,y)=>x+y,0),0)} đơn, len ${window.__E[i].length}`).join(" | ");
/* --- Dán vào tab web Nexa (đã đăng nhập giám đốc), thay E bằng mảng các object JSON đọc được:
const dec=e=>{const D=d=>`${e.m}-${String(d).padStart(2,"0")}`;const pairs=a=>{const o={};for(let i=1;i<a.length;i+=2)o[e.n[a[i]]]=a[i+1];return o};
 return{month:e.m,tab:e.t,shops:e.n.slice(0,e.s.length).map((n,i)=>({name:n,seller:e.s[i]||""})),counts:Object.fromEntries(e.c.map(a=>[D(a[0]),pairs(a)])),fees:Object.fromEntries(e.f.map(a=>[D(a[0]),pairs(a)])),day:Object.fromEntries(e.d.map(a=>[D(a[0]),{fee:a[1],extra:a[2],note:a[3]}]))}};
await podSave(E.map(dec),"tự động từ Lark");
--- */
