const KEY="moneyRuleAppV2";
const state=JSON.parse(localStorage.getItem(KEY)||'{"settings":{"minimumTakeHome":250000,"fixedCosts":150000,"savingsTarget":50000,"extraAllowancePercent":50,"extraSavingsPercent":50},"income":0,"expenses":[]}');
const $=id=>document.getElementById(id);
const yen=n=>"¥"+Math.round(n).toLocaleString("ja-JP");
const today=new Date().toISOString().slice(0,10);
$("expenseDate").value=today;

function save(){localStorage.setItem(KEY,JSON.stringify(state));}
function monthKey(){return today.slice(0,7);}
function monthExpenses(){return state.expenses.filter(e=>e.date.slice(0,7)===monthKey());}
function calc(){
  const s=state.settings, income=Number(state.income)||0;
  const extra=Math.max(0,income-s.minimumTakeHome);
  const allowance=extra*s.extraAllowancePercent/100;
  const extraSavings=extra*s.extraSavingsPercent/100;
  const plannedSavings=s.savingsTarget+extraSavings;
  const budget=income-s.fixedCosts-s.savingsTarget+allowance;
  const spent=monthExpenses().reduce((a,e)=>a+e.amount,0);
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
  list.innerHTML=es.map((e,i)=>`<div class="expense"><div><b>${e.category}</b><div class="muted">${e.date}${e.memo?"・"+e.memo:""}</div></div><strong>${yen(e.amount)}</strong></div>`).join("");
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
  state.expenses.push({amount,category:$("expenseCategory").value,memo:$("expenseMemo").value.trim(),date:$("expenseDate").value||today});
  $("expenseAmount").value="";$("expenseMemo").value="";
  save();calc();renderExpenses();
};
loadSettings();calc();renderExpenses();
