const KEY='money-rule-v1';
const base={settings:{minTakeHome:250000,fixedCost:150000,savingTarget:50000,allowPct:50,savePct:50},income:{},expenses:[]};
let d=JSON.parse(localStorage.getItem(KEY)||'null')||base;
const $=id=>document.getElementById(id), yen=n=>'¥'+Math.round(n||0).toLocaleString('ja-JP');
const month=()=>{let x=new Date();return x.getFullYear()+'-'+String(x.getMonth()+1).padStart(2,'0')};
const today=()=>{let x=new Date();return x.toISOString().slice(0,10)};
function save(){localStorage.setItem(KEY,JSON.stringify(d))}
function calc(){let m=month(),s=d.settings,inc=+(d.income[m]||0),extra=Math.max(0,inc-s.minTakeHome);
let allowance=extra*s.allowPct/100,extraSave=extra*s.savePct/100,saving=s.savingTarget+extraSave;
let budget=inc-s.fixedCost-s.savingTarget+allowance,es=d.expenses.filter(x=>x.date.startsWith(m)),spent=es.reduce((a,x)=>a+ +x.amount,0),td=es.filter(x=>x.date===today()).reduce((a,x)=>a+ +x.amount,0);
let now=new Date(),last=new Date(now.getFullYear(),now.getMonth()+1,0).getDate(),days=Math.max(1,last-now.getDate()+1);
return{inc,allowance,saving,budget,spent,td,remaining:budget-spent,daily:Math.max(0,budget-spent)/days,days,es}}
function render(){let c=calc(),m=month();$('month').textContent=new Date().toLocaleDateString('ja-JP',{year:'numeric',month:'long'});
$('remaining').textContent=yen(c.remaining);$('remainingSub').textContent=c.remaining>=0?'残り'+c.days+'日・1日あたり '+yen(c.daily):'予算を超えています';
$('today').textContent=yen(c.td);$('spent').textContent=yen(c.spent);$('daily').textContent=yen(c.daily);$('savings').textContent=yen(c.saving);
$('income').textContent=yen(c.inc);$('fixed').textContent=yen(d.settings.fixedCost);$('saveDetail').textContent=yen(c.saving);$('allowance').textContent=yen(c.allowance);
let a=c.es.slice().sort((x,y)=>y.date.localeCompare(x.date)).slice(0,8);$('list').innerHTML=a.length?a.map(x=>`<div class="expense"><span>${x.category}${x.memo?'・'+esc(x.memo):''}<small>${x.date.slice(5).replace('-','/')}</small></span><b>-${yen(x.amount)}</b></div>`).join(''):'<div class="empty">まだ支出がありません</div>'}
function esc(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
$('add').onclick=()=>{$('expenseForm').reset();$('date').value=today();$('expenseDlg').showModal()};
$('cancelExpense').onclick=()=>$('expenseDlg').close();
$('expenseForm').onsubmit=e=>{e.preventDefault();d.expenses.push({amount:+$('amount').value,category:$('category').value,memo:$('memo').value,date:$('date').value,id:Date.now()});save();$('expenseDlg').close();render()};
$('settings').onclick=()=>{let s=d.settings;minTakeHome.value=s.minTakeHome;fixedCost.value=s.fixedCost;savingTarget.value=s.savingTarget;allowPct.value=s.allowPct;savePct.value=s.savePct;warning.textContent='';settingsDlg.showModal()};
$('cancelSettings').onclick=()=>settingsDlg.close();
$('allowPct').oninput=$('savePct').oninput=()=>{let n=+$('allowPct').value+(+$('savePct').value);warning.textContent=n===100?'':'割合の合計を100%にしてください'};
$('settingsForm').onsubmit=e=>{e.preventDefault();if(+$('allowPct').value+(+$('savePct').value)!==100)return;d.settings={minTakeHome:+minTakeHome.value,fixedCost:+fixedCost.value,savingTarget:+savingTarget.value,allowPct:+allowPct.value,savePct:+savePct.value};save();settingsDlg.close();render()};
render();