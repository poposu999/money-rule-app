const KEY="moneyRuleAppV2";
const state=JSON.parse(localStorage.getItem(KEY)||'{"settings":{"minimumTakeHome":250000,"fixedCosts":150000,"savingsTarget":50000,"extraAllowancePercent":50,"extraSavingsPercent":50},"income":0,"expenses":[]}');
const $=id=>document.getElementById(id);
const yen=n=>"¥"+Math.round(n).toLocaleString("ja-JP");
const today=new Date().toISOString().slice(0,10);
$("expenseDate").value=today;

function save(){localStorage.setItem(KEY,JSON.stringify(state));}
function monthKey(date=today){return date.slice(0,7);}
function monthExpenses(key=monthKey()){return state.expenses.filter(e=>e.date.slice(0,7)===key);}
function monthDateLabel(key){const [y,m]=key.split("-");return `${y}/${Number(m)}`;}
function calc(){
  const s=state.settings, income=Number(state.income)||0;
  const extra=Math.max(0,income-s.minimumTakeHome);
  const allowance=extra*s.extraAllowancePercent/100;
  const extraSavings=extra*s.extraSavingsPercent/100;
  const plannedSavings=s.savingsTarget+extraSavings;
  const budget=income-s.fixedCosts-s.savingsTarget+allowance;
  const es=monthExpenses();
  const spent=es.reduce((a,e)=>a+e.amount,0);
  const remaining=budget-spent;
  const d=new Date(), last=new Date(d.getFullYear(),d.getMonth()+1,0).getDate(), day=d.getDate();
  const daily=Math.max(0,remaining)/(last-day+1);
  $("incomeView").textContent=yen(income);
  $("extraIncome").textContent=yen(extra);
  $("plannedSavings").textContent=yen(plannedSavings);
  $("spendingBudget").textContent=yen(budget);
  $("monthSpent").textContent=yen(spent);
  $("remainingBudget").textContent=yen(remaining);
  $("dailyBudget").textContent=yen(daily);
  $("expenseCount").textContent=es.length+"件";
  renderBudgetProgress(budget,spent);
  renderCategoryChart(es);
  renderDailyChart(es,budget);
  renderMonthlyChart();
  renderSavingsChart();
}
function loadSettings(){
  const s=state.settings;
  $("minimumTakeHome").value=s.minimumTakeHome;
  $("fixedCosts").value=s.fixedCosts;
  $("savingsTarget").value=s.savingsTarget;
  $("extraAllowancePercent").value=s.extraAllowancePercent;
  $("extraSavingsPercent").value=s.extraSavingsPercent;
  $("income").value=state.income||"";
}
function renderExpenses(){
  const list=$("expenseList"), es=monthExpenses().slice().reverse();
  if(!es.length){list.innerHTML='<div class="muted">まだ支出はありません。</div>';return}
  list.innerHTML=es.map((e)=>`<div class="expense" data-id="${e.id||""}"><div><b>${escapeHtml(e.category)}</b><div class="muted">${e.date}${e.memo?"・"+escapeHtml(e.memo):""}</div></div><div class="expense-right"><strong>${yen(e.amount)}</strong><button type="button" class="edit-btn" data-edit="${e.id}">編集</button><button type="button" class="delete-btn" data-delete="${e.id}">削除</button></div></div>`).join("");
}

function escapeHtml(str){
  return String(str).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
}
function renderBudgetProgress(budget,spent){
  const pct=budget>0?Math.min(100,(spent/budget)*100):0;
  $("budgetProgressText").textContent=`${yen(spent)} / ${yen(Math.max(0,budget))}`;
  $("budgetProgressBar").style.width=pct+"%";
  $("budgetProgressPercent").textContent=Math.round(pct)+"%";
  let status="データを入力すると表示されます";
  if(budget<=0) status="予算を設定してください";
  else if(spent>budget) status=`予算を${yen(spent-budget)}オーバー`;
  else {
    const d=new Date(), last=new Date(d.getFullYear(),d.getMonth()+1,0).getDate();
    const day=d.getDate(), elapsedPct=day/last*100;
    status=pct<=elapsedPct+5?"順調なペース":"やや速いペース";
  }
  $("budgetStatus").textContent=status;
}
function renderCategoryChart(es){
  const categories=["食費","日用品","交通費","娯楽","外食","その他"];
  const totals=categories.map(c=>({name:c,value:es.filter(e=>e.category===c).reduce((a,e)=>a+e.amount,0)}));
  const total=totals.reduce((a,x)=>a+x.value,0);
  const chart=$("categoryChart"), legend=$("categoryLegend");
  if(!total){chart.innerHTML='<div class="donut-empty">まだ支出がありません</div>';legend.innerHTML="";return;}
  let cursor=0, stops=[];
  totals.filter(x=>x.value>0).forEach((x,i)=>{
    const start=cursor; cursor+=x.value/total*360;
    stops.push(`hsl(${i*48}, 55%, 55%) ${start}deg ${cursor}deg`);
  });
  chart.innerHTML=`<div class="donut" style="background:conic-gradient(${stops.join(",")})"><div class="donut-hole"><b>${yen(total)}</b><span>今月</span></div></div>`;
  legend.innerHTML=totals.filter(x=>x.value>0).map((x,i)=>`<div class="legend-item"><span class="legend-dot" style="background:hsl(${i*48},55%,55%)"></span><span>${x.name}</span><b>${yen(x.value)}</b><small>${Math.round(x.value/total*100)}%</small></div>`).join("");
}
function svgBase(svg){
  svg.innerHTML="";
  const NS="http://www.w3.org/2000/svg";
  return {
    line:(x1,y1,x2,y2,cls="gridline")=>{const el=document.createElementNS(NS,"line");el.setAttribute("x1",x1);el.setAttribute("y1",y1);el.setAttribute("x2",x2);el.setAttribute("y2",y2);el.setAttribute("class",cls);svg.appendChild(el);return el;},
    text:(x,y,t,cls="axis-label")=>{const el=document.createElementNS(NS,"text");el.setAttribute("x",x);el.setAttribute("y",y);el.setAttribute("class",cls);el.textContent=t;svg.appendChild(el);return el;},
    poly:(points,cls="series")=>{const el=document.createElementNS(NS,"polyline");el.setAttribute("points",points);el.setAttribute("class",cls);el.setAttribute("fill","none");svg.appendChild(el);return el;},
    circle:(cx,cy,r,cls="point")=>{const el=document.createElementNS(NS,"circle");el.setAttribute("cx",cx);el.setAttribute("cy",cy);el.setAttribute("r",r);el.setAttribute("class",cls);svg.appendChild(el);return el;},
    rect:(x,y,w,h,cls="bar")=>{const el=document.createElementNS(NS,"rect");el.setAttribute("x",x);el.setAttribute("y",y);el.setAttribute("width",w);el.setAttribute("height",h);el.setAttribute("rx","3");el.setAttribute("class",cls);svg.appendChild(el);return el;}
  };
}
function renderDailyChart(es,budget){
  const svg=$("dailyChart"), g=svgBase(svg), W=700,H=260,pad={l:55,r:20,t:20,b:42};
  const d=new Date(), days=new Date(d.getFullYear(),d.getMonth()+1,0).getDate();
  const vals=Array.from({length:days},(_,i)=>es.filter(e=>Number(e.date.slice(-2))===i+1).reduce((a,e)=>a+e.amount,0));
  const max=Math.max(1000,...vals);
  for(let i=0;i<=4;i++){const y=pad.t+(H-pad.t-pad.b)*i/4;g.line(pad.l,y,W-pad.r,y);g.text(8,y+4,yen(max*(1-i/4)));}
  const pts=vals.map((v,i)=>`${pad.l+(W-pad.l-pad.r)*(i/(days-1))},${H-pad.b-(H-pad.t-pad.b)*v/max}`).join(" ");
  g.poly(pts);
  vals.forEach((v,i)=>{if(v>0)g.circle(pad.l+(W-pad.l-pad.r)*(i/(days-1)),H-pad.b-(H-pad.t-pad.b)*v/max,3,"point");});
  [1,Math.ceil(days/4),Math.ceil(days/2),Math.ceil(days*3/4),days].forEach(day=>g.text(pad.l+(W-pad.l-pad.r)*((day-1)/(days-1)),H-12,String(day)));
  const total=vals.reduce((a,v)=>a+v,0);
  $("dailyChartSummary").textContent=`今月合計 ${yen(total)}・平均 ${yen(total/days)}/日`;
}
function renderMonthlyChart(){
  const svg=$("monthlyChart"), g=svgBase(svg), W=700,H=260,pad={l:55,r:20,t:20,b:42};
  const now=new Date(), keys=[];
  for(let i=5;i>=0;i--){const d=new Date(now.getFullYear(),now.getMonth()-i,1);keys.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`);}
  const vals=keys.map(k=>monthExpenses(k).reduce((a,e)=>a+e.amount,0));
  const max=Math.max(1000,...vals);
  for(let i=0;i<=4;i++){const y=pad.t+(H-pad.t-pad.b)*i/4;g.line(pad.l,y,W-pad.r,y);g.text(8,y+4,yen(max*(1-i/4)));}
  const pts=vals.map((v,i)=>`${pad.l+(W-pad.l-pad.r)*(i/(vals.length-1))},${H-pad.b-(H-pad.t-pad.b)*v/max}`).join(" ");
  g.poly(pts);
  vals.forEach((v,i)=>{const x=pad.l+(W-pad.l-pad.r)*(i/(vals.length-1)),y=H-pad.b-(H-pad.t-pad.b)*v/max;g.circle(x,y,4,"point");g.text(x,H-12,monthDateLabel(keys[i]),"axis-label center");});
  $("monthlyChartSummary").textContent=`直近6か月の支出合計 ${yen(vals.reduce((a,v)=>a+v,0))}`;
}
function renderSavingsChart(){
  const svg=$("savingsChart"), g=svgBase(svg), W=700,H=260,pad={l:55,r:20,t:20,b:42};
  const now=new Date(), months=[];
  for(let i=5;i>=0;i--){const d=new Date(now.getFullYear(),now.getMonth()-i,1);months.push({key:`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`,income:i===0?Number(state.income)||0:0});}
  const vals=months.map(m=>{
    if(m.key===monthKey()) return Number(state.settings.savingsTarget)||0 + Math.max(0,(Number(state.income)||0)-Number(state.settings.minimumTakeHome)||0)*Number(state.settings.extraSavingsPercent||0)/100;
    return 0;
  });
  const max=Math.max(1000,...vals), barW=(W-pad.l-pad.r)/vals.length*0.62;
  for(let i=0;i<=4;i++){const y=pad.t+(H-pad.t-pad.b)*i/4;g.line(pad.l,y,W-pad.r,y);g.text(8,y+4,yen(max*(1-i/4)));}
  vals.forEach((v,i)=>{const x=pad.l+(W-pad.l-pad.r)*(i+.5)/vals.length-barW/2;const h=(H-pad.t-pad.b)*v/max;g.rect(x,H-pad.b-h,barW,h,"bar");g.text(x+barW/2,H-12,monthDateLabel(months[i].key),"axis-label center");});
  const current=vals[vals.length-1];
  $("savingsChartSummary").textContent=`今月の貯金予定 ${yen(current)}`;
}
$("saveIncome").onclick=()=>{state.income=Math.max(0,Number($("income").value)||0);save();calc();};
$("saveSettings").onclick=()=>{
  state.settings={
    minimumTakeHome:Math.max(0,Number($("minimumTakeHome").value)||0),
    fixedCosts:Math.max(0,Number($("fixedCosts").value)||0),
    savingsTarget:Math.max(0,Number($("savingsTarget").value)||0),
    extraAllowancePercent:Math.min(100,Math.max(0,Number($("extraAllowancePercent").value)||0)),
    extraSavingsPercent:Math.min(100,Math.max(0,Number($("extraSavingsPercent").value)||0))
  };
  save();calc();
};
$("addExpense").onclick=()=>{
  const amount=Math.max(0,Number($("expenseAmount").value)||0);
  if(!amount){alert("金額を入力してください");return}
  state.expenses.push({id:Date.now()+Math.random(),amount,category:$("expenseCategory").value,memo:$("expenseMemo").value.trim(),date:$("expenseDate").value||today});
  $("expenseAmount").value="";$("expenseMemo").value="";
  save();calc();renderExpenses();
};
loadSettings();calc();renderExpenses();

const sectionPrefs=JSON.parse(localStorage.getItem("moneyRuleSectionPrefs")||"{}");
const statPrefs=JSON.parse(localStorage.getItem("moneyRuleStatPrefs")||"{}");
function applyStatPrefs(){
  const hidden=statPrefs.income===true;
  $("incomeStat").classList.toggle("stat-hidden",hidden);
  $("extraIncomeStat").classList.toggle("stat-hidden",hidden);
  const btn=document.querySelector('.stat-toggle-btn[data-stat="income"]');
  if(btn){
    btn.textContent=hidden?"＋":"−";
    btn.title=hidden?"表示する":"非表示にする";
  }
}
function applySectionPrefs(){
  document.querySelectorAll("[data-section-content]").forEach(el=>{
    const key=el.dataset.sectionContent;
    el.querySelectorAll(":scope > *:not(.section-title)").forEach(child=>child.classList.toggle("section-body-hidden",sectionPrefs[key]===true));
  });
  document.querySelectorAll(".minus-btn").forEach(btn=>{
    const key=btn.dataset.section;
    btn.textContent=sectionPrefs[key]===true?"＋":"−";
    btn.title=sectionPrefs[key]===true?"表示する":"非表示にする";
  });
}
document.querySelectorAll(".minus-btn").forEach(btn=>btn.onclick=()=>{
  const key=btn.dataset.section;
  sectionPrefs[key]=sectionPrefs[key]!==true;
  localStorage.setItem("moneyRuleSectionPrefs",JSON.stringify(sectionPrefs));
  applySectionPrefs();
});
document.querySelector('.stat-toggle-btn[data-stat="income"]').onclick=()=>{
  statPrefs.income=statPrefs.income!==true;
  localStorage.setItem("moneyRuleStatPrefs",JSON.stringify(statPrefs));
  applyStatPrefs();
};
function openEdit(id){
  const e=state.expenses.find(x=>String(x.id)===String(id));
  if(!e)return;
  $("editModal").dataset.id=String(id);
  $("editAmount").value=e.amount;
  $("editCategory").value=e.category;
  $("editMemo").value=e.memo||"";
  $("editDate").value=e.date;
  $("editModal").classList.remove("hidden");
}
function closeEdit(){$("editModal").classList.add("hidden");}
$("closeModal").onclick=closeEdit;
$("cancelEdit").onclick=closeEdit;
$("editModal").onclick=e=>{if(e.target===$("editModal"))closeEdit();};
$("saveEdit").onclick=()=>{
  const id=$("editModal").dataset.id;
  const e=state.expenses.find(x=>String(x.id)===String(id));
  const amount=Math.max(0,Number($("editAmount").value)||0);
  if(!e||!amount){alert("金額を入力してください");return}
  e.amount=amount;
  e.category=$("editCategory").value;
  e.memo=$("editMemo").value.trim();
  e.date=$("editDate").value||today;
  save();closeEdit();calc();renderExpenses();
};
applySectionPrefs();
applyStatPrefs();

$("expenseList").addEventListener("click",e=>{
  const edit=e.target.closest("[data-edit]");
  const del=e.target.closest("[data-delete]");
  if(edit){openEdit(edit.dataset.edit);return;}
  if(del){
    const id=del.dataset.delete;
    const idx=state.expenses.findIndex(x=>String(x.id)===String(id));
    if(idx>=0){
      state.expenses.splice(idx,1);
      save();calc();renderExpenses();
    }
  }
});
applySectionPrefs();
applyStatPrefs();
