const KEY="moneyRuleAppV2";
const defaultState={settings:{minimumTakeHome:250000,fixedCosts:150000,savingsTarget:50000,extraAllowancePercent:50,extraSavingsPercent:50},income:0,bonus:0,expenses:[]};
let state;
try{state=JSON.parse(localStorage.getItem(KEY)||JSON.stringify(defaultState));}catch(e){state=JSON.parse(JSON.stringify(defaultState));}
state.settings={...defaultState.settings,...(state.settings||{})};
state.expenses=(Array.isArray(state.expenses)?state.expenses:[]).filter(e=>e&&typeof e==="object").map(e=>({...e,amount:Number(e.amount)||0,date:String(e.date||today||""),category:String(e.category||"その他"),memo:String(e.memo||"")}));
if(state.bonus===undefined) state.bonus=0;
const $=id=>document.getElementById(id);
const yen=n=>"¥"+Math.round(Number(n)||0).toLocaleString("ja-JP");
const today=new Date().toISOString().slice(0,10);
$("expenseDate").value=today;
function save(){localStorage.setItem(KEY,JSON.stringify(state));}
function monthKey(date=today){return String(date).slice(0,7);}
function monthExpenses(key=monthKey()){return state.expenses.filter(e=>e&&String(e.date||"").slice(0,7)===key);}
function monthDateLabel(key){const [y,m]=key.split("-");return `${y}/${Number(m)}`;}
function getNumbers(){
  const s=state.settings;
  const income=Number(state.income)||0, bonus=Number(state.bonus)||0, totalIncome=income+bonus;
  const minimum=Number(s.minimumTakeHome)||0, fixed=Number(s.fixedCosts)||0, target=Number(s.savingsTarget)||0;
  const allowancePct=Number(s.extraAllowancePercent)||0, savingsPct=Number(s.extraSavingsPercent)||0;
  const extra=Math.max(0,totalIncome-minimum);
  const allowance=extra*allowancePct/100;
  const extraSavings=extra*savingsPct/100;
  const plannedSavings=target+extraSavings;
  const variableBudget=Math.max(0,totalIncome-fixed-target+allowance);
  const es=monthExpenses();
  const spent=es.reduce((a,e)=>a+(Number(e.amount)||0),0);
  const remaining=variableBudget-spent;
  return {s,totalIncome,minimum,fixed,target,extra,allowance,extraSavings,plannedSavings,variableBudget,es,spent,remaining};
}
function getDayInfo(){
  const d=new Date(), last=new Date(d.getFullYear(),d.getMonth()+1,0).getDate(), day=d.getDate();
  return {day,last,remainingDays:last-day+1};
}
function calc(){
  const n=getNumbers(), d=getDayInfo();
  const daily=Math.max(0,n.remaining)/d.remainingDays;
  const elapsed=Math.max(1,d.day);
  const avg=n.spent/elapsed;
  const projected=n.spent/d.day*d.last;
  const todayBudget=n.remaining>0?Math.max(0,n.remaining)/d.remainingDays:0;
  const pacePct=n.variableBudget>0?n.spent/n.variableBudget*100:0;
  const expectedPct=d.day/d.last*100;
  const paceDelta=pacePct-expectedPct;
  $("incomeView").textContent=yen(n.totalIncome);
  $("extraIncome").textContent=yen(n.extra);
  $("plannedSavings").textContent=yen(n.plannedSavings);
  $("spendingBudget").textContent=yen(n.variableBudget);
  $("monthSpent").textContent=yen(n.spent);
  $("remainingBudget").textContent=yen(n.remaining);
  $("dailyBudget").textContent=yen(daily);
  $("expenseCount").textContent=n.es.length+"件";
  $("allowanceStat").textContent=yen(n.allowance);
  $("todayBudget").textContent=yen(todayBudget);
  $("todayBudgetSub").textContent=n.remaining<0?`予算を${yen(Math.abs(n.remaining))}オーバーしています`:`残り${d.remainingDays}日で使える1日あたりの目安`;
  $("dashboardRemaining").textContent=yen(n.remaining);
  $("forecastSpend").textContent=yen(projected);
  $("allowanceView").textContent=yen(n.allowance);
  $("variableRemaining").textContent=yen(n.remaining);
  $("fixedCostsView").textContent=yen(n.fixed);
  $("savingsReserveView").textContent=yen(n.plannedSavings);
  $("variableBudgetView").textContent=yen(n.variableBudget);
  renderSpendingStatus(n,paceDelta,projected,d);
  renderBudgetProgress(n.variableBudget,n.spent);
  renderForecast(n,projected,d);
  try{renderCategoryChart(n.es)}catch(e){console.error("category chart",e)}
  try{renderDailyChart(n.es,n.variableBudget)}catch(e){console.error("daily chart",e)}
  try{renderMonthlyChart()}catch(e){console.error("monthly chart",e)}
  try{renderSavingsChart()}catch(e){console.error("savings chart",e)}
}
function renderSpendingStatus(n,paceDelta,projected,d){
  const el=$("spendingStatus");
  el.className="spending-status";
  if(n.variableBudget<=0){el.classList.add("danger");el.textContent="使える予算を設定してください";return;}
  if(n.spent>n.variableBudget){el.classList.add("danger");el.textContent=`🔴 使いすぎ：予算を${yen(n.spent-n.variableBudget)}オーバー`;
  }else if(paceDelta>10){el.classList.add("warning");el.textContent=`🟡 やや速いペース：このままだと月末${yen(projected-n.variableBudget)}オーバーの見込み`;
  }else{el.classList.add("good");el.textContent=`🟢 順調：このペースなら月末${yen(Math.max(0,n.variableBudget-projected))}ほど余る見込み`;
  }
}
function renderForecast(n,projected,d){
  $("forecastMessage").textContent=n.spent===0?"まだ支出がないため予測できません":projected>n.variableBudget?`このペースだと月末に${yen(projected-n.variableBudget)}オーバー`: `このペースなら月末に${yen(n.variableBudget-projected)}余る見込み`;
  $("forecastDetail").textContent=n.spent===0?"支出を記録すると月末予測が表示されます":`現在の1日平均 ${yen(n.spent/d.day)}・残り${d.remainingDays}日`;
}
function loadSettings(){
  const s=state.settings;
  $("minimumTakeHome").value=s.minimumTakeHome;$("fixedCosts").value=s.fixedCosts;$("savingsTarget").value=s.savingsTarget;
  $("extraAllowancePercent").value=s.extraAllowancePercent;$("extraSavingsPercent").value=s.extraSavingsPercent;
  $("income").value=state.income||"";$("bonus").value=state.bonus||"";
}
function renderExpenses(){
  const list=$("expenseList"), es=monthExpenses().slice().reverse(), total=es.reduce((sum,e)=>sum+(Number(e.amount)||0),0);
  $("expenseTotal").textContent=`合計：${yen(total)}`;
  if(!es.length){list.innerHTML='<div class="muted expense-empty">まだ支出はありません。</div>';return;}
  list.innerHTML=`<table class="expense-table"><thead><tr><th>日付</th><th>メモ</th><th>カテゴリ</th><th class="amount-col">金額</th><th class="action-col"></th></tr></thead><tbody>${es.map(e=>`<tr data-id="${e.id||""}"><td>${escapeHtml(e.date)}</td><td>${e.memo?escapeHtml(e.memo):'<span class="muted">—</span>'}</td><td>${escapeHtml(e.category)}</td><td class="amount-col"><strong>${yen(e.amount)}</strong></td><td class="action-col"><div class="expense-actions"><div class="move-buttons"><button type="button" class="move-btn" data-move="up" data-id="${e.id}" aria-label="同じ日付内で上へ">▲</button><button type="button" class="move-btn" data-move="down" data-id="${e.id}" aria-label="同じ日付内で下へ">▼</button></div><div class="edit-delete-buttons"><button type="button" class="edit-btn" data-edit="${e.id}">編集</button><button type="button" class="delete-btn" data-delete="${e.id}">削除</button></div></div></td></tr>`).join("")}</tbody></table>`;
}
function escapeHtml(str){return String(str).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));}
function renderBudgetProgress(budget,spent){
  const pct=budget>0?Math.min(100,spent/budget*100):0;$("budgetProgressText").textContent=`${yen(spent)} / ${yen(Math.max(0,budget))}`;$("budgetProgressBar").style.width=pct+"%";$("budgetProgressPercent").textContent=Math.round(pct)+"%";
  const d=getDayInfo();let status="データを入力すると表示されます";if(budget<=0)status="予算を設定してください";else if(spent>budget)status=`予算を${yen(spent-budget)}オーバー`;else status=pct<=d.day/d.last*100+5?"順調なペース":"やや速いペース";$("budgetStatus").textContent=status;
}
function renderCategoryChart(es){
  const categories=["食費","日用品","交通費","娯楽","外食","その他"], totals=categories.map(c=>({name:c,value:es.filter(e=>e.category===c).reduce((a,e)=>a+(Number(e.amount)||0),0)})),total=totals.reduce((a,x)=>a+x.value,0),chart=$("categoryChart"),legend=$("categoryLegend");
  if(!total){chart.innerHTML='<div class="donut-empty">まだ支出がありません</div>';legend.innerHTML="";return;}
  let cursor=0,stops=[];totals.filter(x=>x.value>0).forEach((x,i)=>{const start=cursor;cursor+=x.value/total*360;stops.push(`hsl(${i*48},55%,55%) ${start}deg ${cursor}deg`);});
  chart.innerHTML=`<div class="donut" style="background:conic-gradient(${stops.join(",")})"><div class="donut-hole"><b>${yen(total)}</b><span>今月</span></div></div>`;
  legend.innerHTML=totals.filter(x=>x.value>0).map((x,i)=>`<div class="legend-item"><span class="legend-dot" style="background:hsl(${i*48},55%,55%)"></span><span>${x.name}</span><b>${yen(x.value)}</b><small>${Math.round(x.value/total*100)}%</small></div>`).join("");
}
function svgBase(svg){svg.innerHTML="";const NS="http://www.w3.org/2000/svg";return{line:(x1,y1,x2,y2,cls="gridline")=>{const el=document.createElementNS(NS,"line");Object.entries({x1,y1,x2,y2}).forEach(([k,v])=>el.setAttribute(k,v));el.setAttribute("class",cls);svg.appendChild(el);return el;},text:(x,y,t,cls="axis-label")=>{const el=document.createElementNS(NS,"text");el.setAttribute("x",x);el.setAttribute("y",y);el.setAttribute("class",cls);el.textContent=t;svg.appendChild(el);return el;},poly:(points,cls="series")=>{const el=document.createElementNS(NS,"polyline");el.setAttribute("points",points);el.setAttribute("class",cls);el.setAttribute("fill","none");svg.appendChild(el);return el;},circle:(cx,cy,r,cls="point")=>{const el=document.createElementNS(NS,"circle");el.setAttribute("cx",cx);el.setAttribute("cy",cy);el.setAttribute("r",r);el.setAttribute("class",cls);svg.appendChild(el);return el;},rect:(x,y,w,h,cls="bar")=>{const el=document.createElementNS(NS,"rect");Object.entries({x,y,width:w,height:h}).forEach(([k,v])=>el.setAttribute(k,v));el.setAttribute("rx","3");el.setAttribute("class",cls);svg.appendChild(el);return el;}};}
function renderDailyChart(es,budget){
  const svg=$("dailyChart"),g=svgBase(svg),W=700,H=260,pad={l:55,r:20,t:20,b:42},d=new Date(),days=new Date(d.getFullYear(),d.getMonth()+1,0).getDate();
  const vals=Array.from({length:days},(_,i)=>es.filter(e=>Number(String(e.date).slice(-2))===i+1).reduce((a,e)=>a+(Number(e.amount)||0),0)),max=Math.max(1000,...vals);
  for(let i=0;i<=4;i++){const y=pad.t+(H-pad.t-pad.b)*i/4;g.line(pad.l,y,W-pad.r,y);g.text(8,y+4,yen(max*(1-i/4)));}
  const pts=vals.map((v,i)=>`${pad.l+(W-pad.l-pad.r)*(i/(days-1))},${H-pad.b-(H-pad.t-pad.b)*v/max}`).join(" ");g.poly(pts);vals.forEach((v,i)=>{if(v>0)g.circle(pad.l+(W-pad.l-pad.r)*(i/(days-1)),H-pad.b-(H-pad.t-pad.b)*v/max,3,"point")});
  [1,Math.ceil(days/4),Math.ceil(days/2),Math.ceil(days*3/4),days].forEach(day=>g.text(pad.l+(W-pad.l-pad.r)*((day-1)/(days-1)),H-12,String(day)));const total=vals.reduce((a,v)=>a+v,0);$("dailyChartSummary").textContent=`今月合計 ${yen(total)}・平均 ${yen(total/days)}/日`;
}
function renderMonthlyChart(){
  const svg=$("monthlyChart"),g=svgBase(svg),W=700,H=260,pad={l:55,r:20,t:20,b:42},now=new Date(),keys=[];for(let i=5;i>=0;i--){const d=new Date(now.getFullYear(),now.getMonth()-i,1);keys.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`);}
  const vals=keys.map(k=>monthExpenses(k).reduce((a,e)=>a+(Number(e.amount)||0),0)),max=Math.max(1000,...vals);for(let i=0;i<=4;i++){const y=pad.t+(H-pad.t-pad.b)*i/4;g.line(pad.l,y,W-pad.r,y);g.text(8,y+4,yen(max*(1-i/4)));}
  const pts=vals.map((v,i)=>`${pad.l+(W-pad.l-pad.r)*(i/(vals.length-1))},${H-pad.b-(H-pad.t-pad.b)*v/max}`).join(" ");g.poly(pts);vals.forEach((v,i)=>{const x=pad.l+(W-pad.l-pad.r)*(i/(vals.length-1)),y=H-pad.b-(H-pad.t-pad.b)*v/max;g.circle(x,y,4,"point");g.text(x,H-12,monthDateLabel(keys[i]),"axis-label center")});$("monthlyChartSummary").textContent=`直近6か月の支出合計 ${yen(vals.reduce((a,v)=>a+v,0))}`;
}
function renderSavingsChart(){
  const svg=$("savingsChart"),g=svgBase(svg),W=700,H=260,pad={l:55,r:20,t:20,b:42},now=new Date(),months=[];for(let i=5;i>=0;i--){const d=new Date(now.getFullYear(),now.getMonth()-i,1);months.push({key:`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`});}
  const n=getNumbers(),vals=months.map(m=>m.key===monthKey()?n.plannedSavings:0),max=Math.max(1000,...vals),barW=(W-pad.l-pad.r)/vals.length*.62;for(let i=0;i<=4;i++){const y=pad.t+(H-pad.t-pad.b)*i/4;g.line(pad.l,y,W-pad.r,y);g.text(8,y+4,yen(max*(1-i/4)));}vals.forEach((v,i)=>{const x=pad.l+(W-pad.l-pad.r)*(i+.5)/vals.length-barW/2,h=(H-pad.t-pad.b)*v/max;g.rect(x,H-pad.b-h,barW,h,"bar");g.text(x+barW/2,H-12,monthDateLabel(months[i].key),"axis-label center")});$("savingsChartSummary").textContent=`今月の貯金予定 ${yen(vals[vals.length-1])}`;
}
$("saveIncome").onclick=()=>{state.income=Math.max(0,Number($("income").value)||0);state.bonus=Math.max(0,Number($("bonus").value)||0);save();calc();};
$("saveSettings").onclick=()=>{const allowance=Math.min(100,Math.max(0,Number($("extraAllowancePercent").value)||0)),savings=Math.min(100,Math.max(0,Number($("extraSavingsPercent").value)||0));state.settings={minimumTakeHome:Math.max(0,Number($("minimumTakeHome").value)||0),fixedCosts:Math.max(0,Number($("fixedCosts").value)||0),savingsTarget:Math.max(0,Number($("savingsTarget").value)||0),extraAllowancePercent:allowance,extraSavingsPercent:savings};save();calc();};
$("addExpense").onclick=()=>{const amount=Math.max(0,Number($("expenseAmount").value)||0);if(!amount){alert("金額を入力してください");return}state.expenses.push({id:Date.now()+Math.random(),amount,category:$("expenseCategory").value,memo:$("expenseMemo").value.trim(),date:$("expenseDate").value||today});$("expenseAmount").value="";$("expenseMemo").value="";save();calc();renderExpenses();};
$("categoryQuick").addEventListener("click",e=>{const btn=e.target.closest("[data-category]");if(!btn)return;$("expenseCategory").value=btn.dataset.category;document.querySelectorAll("#categoryQuick button").forEach(b=>b.classList.toggle("selected",b===btn));});
loadSettings();renderExpenses();calc();
const sectionPrefs=JSON.parse(localStorage.getItem("moneyRuleSectionPrefs")||"{}"),statPrefs=JSON.parse(localStorage.getItem("moneyRuleStatPrefs")||"{}");
function applyStatPrefs(){const hidden=statPrefs.income===true;$("incomeStat").classList.toggle("stat-hidden",hidden);$("extraIncomeStat").classList.toggle("stat-hidden",hidden);$("incomeRestore").classList.toggle("hidden",!hidden);}
function applySectionPrefs(){document.querySelectorAll("[data-section-content]").forEach(section=>{const key=section.dataset.sectionContent,hidden=sectionPrefs[key]===true;section.querySelectorAll(":scope > *:not(.section-title)").forEach(child=>child.classList.toggle("section-body-hidden",hidden));});document.querySelectorAll(".minus-btn").forEach(btn=>{const hidden=sectionPrefs[btn.dataset.section]===true;btn.textContent=hidden?"＋":"−";btn.title=hidden?"表示する":"非表示にする";btn.setAttribute("aria-label",hidden?"表示する":"非表示にする")});}
function toggleSection(key){if(!key)return;sectionPrefs[key]=sectionPrefs[key]!==true;localStorage.setItem("moneyRuleSectionPrefs",JSON.stringify(sectionPrefs));applySectionPrefs();}
function toggleIncomeStat(hidden){statPrefs.income=hidden;localStorage.setItem("moneyRuleStatPrefs",JSON.stringify(statPrefs));applyStatPrefs();}
document.addEventListener("click",event=>{const minus=event.target.closest(".minus-btn");if(minus){toggleSection(minus.dataset.section);return}const statToggle=event.target.closest('.stat-toggle-btn[data-stat="income"]');if(statToggle){toggleIncomeStat(true);return}const restore=event.target.closest("#incomeRestore button");if(restore){toggleIncomeStat(false);return}});
function openEdit(id){const e=state.expenses.find(x=>String(x.id)===String(id));if(!e)return;$("editModal").dataset.id=String(id);$("editAmount").value=e.amount;$("editCategory").value=e.category;$("editMemo").value=e.memo||"";$("editDate").value=e.date;$("editModal").classList.remove("hidden");}
function closeEdit(){$("editModal").classList.add("hidden");}
$("closeModal").onclick=closeEdit;$("cancelEdit").onclick=closeEdit;$("editModal").onclick=e=>{if(e.target===$("editModal"))closeEdit()};
$("saveEdit").onclick=()=>{const id=$("editModal").dataset.id,e=state.expenses.find(x=>String(x.id)===String(id)),amount=Math.max(0,Number($("editAmount").value)||0);if(!e||!amount){alert("金額を入力してください");return}e.amount=amount;e.category=$("editCategory").value;e.memo=$("editMemo").value.trim();e.date=$("editDate").value||today;save();closeEdit();calc();renderExpenses();};
function moveExpense(id,direction){const current=state.expenses.findIndex(x=>String(x.id)===String(id));if(current<0)return;const date=String(state.expenses[current].date||"");const step=direction==="up"?-1:1;let target=current+step;while(target>=0&&target<state.expenses.length&&String(state.expenses[target].date||"")!==date){target+=step;}if(target<0||target>=state.expenses.length)return;const tmp=state.expenses[current];state.expenses[current]=state.expenses[target];state.expenses[target]=tmp;save();renderExpenses();calc();}
$("expenseList").addEventListener("click",event=>{const move=event.target.closest("[data-move]"),edit=event.target.closest("[data-edit]"),del=event.target.closest("[data-delete]");if(move){event.preventDefault();moveExpense(move.dataset.id,move.dataset.move);return}if(edit){event.preventDefault();openEdit(edit.dataset.edit);return}if(del){event.preventDefault();const id=del.dataset.delete,idx=state.expenses.findIndex(x=>String(x.id)===String(id));if(idx>=0){state.expenses.splice(idx,1);save();calc();renderExpenses();}}});
applySectionPrefs();applyStatPrefs();
