import { escapeHtml } from './constants';
import type { TokenData } from './types';

export function flowHtml(result: Record<string, unknown>): string {
  const email = escapeHtml(String(result.email ?? ''));
  const coupon = escapeHtml(String(result.coupon_sent ?? ''));
  const orderId = escapeHtml(String(result.order_id ?? ''));
  const payUrl = String(result.pay_url ?? '');
  const product = result.product as Record<string, unknown> | undefined;
  const priceDisplay = product?.price ? (product.price as Record<string, unknown>).display : '';
  const sku = product?.sku ? String(product.sku) : '';
  return `<!doctype html><meta charset='utf-8'><title>进入 Superalink 原付款页</title>
<style>body{font-family:system-ui,-apple-system,Segoe UI,sans-serif;max-width:720px;margin:40px auto;padding:0 16px}.box{border:1px solid #ddd;border-radius:12px;padding:18px;margin:16px 0}a.btn{display:inline-block;background:#0a7cff;color:white;padding:14px 22px;border-radius:10px;text-decoration:none;font-size:18px}code{background:#f5f5f5;padding:2px 4px;border-radius:4px}.muted{color:#666;font-size:14px}</style>
<h2>订单已创建</h2>
<div class=box>
  <p><b>邮箱：</b>${email}</p>
  <p><b>优惠券：</b>${coupon}</p>
  <p><b>订单：</b><code>${orderId}</code></p>
  <p><b>产品：</b>${escapeHtml(sku)} / ${escapeHtml(String(priceDisplay ?? ''))}</p>
</div>
<p><a class=btn href="${escapeHtml(payUrl)}">进入 Superalink 原付款页</a></p>
<p class=muted>支付页面使用 Superalink 官方 checkout，保留银行卡、Apple Pay、Google Pay 等支付方式。本工具只负责预创建订单、预填邮箱和优惠券。</p>
<script>setTimeout(()=>{ location.href = ${JSON.stringify(payUrl)}; }, 800);</script>`;
}

export function payHtml(data: TokenData & { token: string }, stripePk: string): string {
  const safeAmount = escapeHtml(data.amount ?? '฿25.00');
  const safeCoupon = escapeHtml(data.coupon ?? 'HAN000000');
  const product = data.product ?? { country_code: '', sku: '', duration_days: null, option: null, fup_or_data: { amount: null, unit: null } };
  const title = escapeHtml(`Superalink ${product.country_code ?? ''} eSIM`.trim());
  const sku = escapeHtml(product.sku ?? '');
  const days = product.duration_days ?? '';
  const fup = product.fup_or_data ?? { amount: null, unit: null };
  const fupText = escapeHtml(`${days}天・${product.option ?? ''}・${fup.amount ?? ''}${fup.unit ?? ''}`.replace('UNLIMITED', '无限流量').replace('QUOTA', '固定流量'));
  const officialUrl = escapeHtml(product.official_url ?? '');
  const dataJson = JSON.stringify(data);

  return `<!doctype html><html><head><meta charset='utf-8'><meta name='viewport' content='width=device-width,initial-scale=1'>
<title>Superalink 自建付款</title><script src="https://js.stripe.com/v3/"></script>
<style>body{font-family:system-ui,-apple-system,Segoe UI,sans-serif;background:#f6f7f9;margin:0;color:#111}.wrap{max-width:560px;margin:18px auto;padding:16px}.card{background:#fff;border-radius:16px;box-shadow:0 8px 28px rgba(0,0,0,.08);padding:20px;margin-bottom:14px}h2{margin:0 0 8px}label{display:block;font-weight:650;margin:14px 0 6px}input{width:100%;box-sizing:border-box;padding:13px;border:1px solid #ddd;border-radius:10px;font-size:16px}input.invalid{border-color:#e53935;background:#fffafa}button{width:100%;padding:15px;border:0;border-radius:10px;background:#0a7cff;color:white;font-size:17px;margin-top:16px}button:disabled{opacity:.55}.muted{color:#666;font-size:14px;line-height:1.55}.tip{background:#fff7ed;border:1px solid #fed7aa;border-radius:12px;padding:10px 12px;margin:10px 0 12px;color:#7c2d12;font-size:13px;line-height:1.55}.tip b{color:#9a3412}.row{display:flex;justify-content:space-between;margin:8px 0}.ok{color:#0a8a3a}.err{color:#c62828;white-space:pre-wrap}#payment-element{margin-top:12px}</style></head>
<body><div class=wrap>
<div class=card><h2>${title}</h2><p class=muted>${fupText} · SKU ${sku}</p>
<div class=row><span>优惠券</span><b>${safeCoupon}</b></div><div class=row><span>应付</span><b>${safeAmount}</b></div><div id=status class="muted">正在加载支付组件...</div></div>
<div class=card><form id=pay-form><label>发送 eSIM 至</label><div class="tip"><b>邮箱提示：</b>请保证使用未购买过的邮箱，否则可能会移除优惠券，被反薅。未使用的 eSIM 通常可无理由退款，具体以 Superalink 官方规则为准。没有新邮箱？可使用 <a href="https://onlypast.com/" target="_blank" rel="noopener noreferrer">OnlyPast 自建邮箱</a>。</div><input id=email type=email autocomplete=email placeholder="you@example.com" required><div id="email-status" class="muted">输入邮箱后会先按 Superalink 官方接口校验优惠券是否仍可用。</div><div id="payment-element"></div><button id=submit disabled>支付 ${safeAmount}</button><div id=message class=err></div></form><p class=muted>所有支付方式均调用 Superalink 原生接口，本页只简化付款步骤。</p><p class=muted>如果不信任本页，请跳转 Superalink 官方结算页：<a id="official-link" href="${officialUrl}" target="_blank" rel="noopener noreferrer">${officialUrl}</a></p></div>
</div><script>
const DATA=${dataJson};
const stripe=Stripe(${JSON.stringify(stripePk)});
let elements;
let emailCheckTimer=null;
let emailCheckSeq=0;
let lastEmailCheck={email:'',ok:false};
function friendlyEmailError(msg){
  msg=String(msg||'邮箱校验失败');
  if(msg.includes('首次购买')||msg.toLowerCase().includes('first')) return '该优惠券仅在首次购买时可用，请更换未购买过的邮箱。';
  return msg;
}
function setEmailState(ok,msg){
  const input=document.getElementById('email'), st=document.getElementById('email-status');
  input.classList.toggle('invalid', !ok && !!msg);
  st.className=ok?'ok':(msg?'err':'muted');
  st.textContent=msg||'输入邮箱后会先按 Superalink 官方接口校验优惠券是否仍可用。';
}
async function validateEmailNow(){
  const input=document.getElementById('email');
  const email=input.value.trim().toLowerCase();
  const seq=++emailCheckSeq;
  if(!email){lastEmailCheck={email:'',ok:false}; setEmailState(false,''); return false;}
  setEmailState(false,'正在校验邮箱是否可用...');
  const r=await fetch('/api/check-email',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({t:DATA.token,email})}).then(r=>r.json());
  const current=input.value.trim().toLowerCase();
  if(seq!==emailCheckSeq || current!==email) return false;
  if(!r.ok){
    const msg=friendlyEmailError(r.error);
    lastEmailCheck={email,ok:false};
    setEmailState(false,msg);
    return false;
  }
  lastEmailCheck={email,ok:true};
  setEmailState(true,'邮箱可用，优惠券仍可用。');
  return true;
}
function scheduleEmailCheck(){
  clearTimeout(emailCheckTimer);
  emailCheckSeq++;
  lastEmailCheck={email:'',ok:false};
  setEmailState(false,'');
  const email=document.getElementById('email').value.trim();
  if(!email) return;
  emailCheckTimer=setTimeout(()=>validateEmailNow().catch(e=>setEmailState(false,friendlyEmailError(e.message||e))),650);
}
async function init(){try{
  if(!DATA.client_secret) throw new Error('缺少 Stripe client_secret');
  elements=stripe.elements({clientSecret:DATA.client_secret,appearance:{theme:'stripe',variables:{colorPrimary:'#F47325'}}});
  const paymentElement=elements.create('payment',{layout:{type:'accordion',defaultCollapsed:false,radios:true}});
  paymentElement.mount('#payment-element');
  paymentElement.on('ready',()=>{
    document.getElementById('submit').disabled=false;
    document.getElementById('status').innerHTML='<span class=ok>支付组件已加载，金额 '+(DATA.amount||'')+'</span>';
  });
}catch(e){document.getElementById('status').className='err';document.getElementById('status').textContent='加载失败：'+e.message;}}
async function runStripeConfirm(){
  const email=document.getElementById('email').value.trim();
  if(!email) throw new Error('请先填写接收 eSIM 的邮箱');
  if(!await validateEmailNow()) throw new Error('请更换未购买过的邮箱后再付款');
  const pre=await fetch('/api/prepay',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({t:DATA.token,email,method:'stripe'})}).then(r=>r.json());
  if(!pre.ok) throw new Error(pre.error||'prepay failed');
  const ret=location.origin+'/api/stripe-callback'+pre.callback;
  const res=await stripe.confirmPayment({elements,confirmParams:{return_url:ret},redirect:'always'});
  if(res.error) throw new Error(res.error.message||res.error.code||'Stripe error');
}
document.getElementById('email').addEventListener('input',scheduleEmailCheck);
document.getElementById('email').addEventListener('blur',()=>validateEmailNow().catch(e=>setEmailState(false,friendlyEmailError(e.message||e))));
document.getElementById('pay-form').addEventListener('submit',async(e)=>{e.preventDefault();const btn=document.getElementById('submit');btn.disabled=true;document.getElementById('message').textContent='正在补齐订单信息并进入付款...';try{
  await runStripeConfirm();
}catch(err){document.getElementById('message').textContent=err.message;btn.disabled=false;}});
init();
</script></body></html>`;
}

export const INDEX_HTML = `<!doctype html><html><head><meta charset='utf-8'><meta name='viewport' content='width=device-width,initial-scale=1'><title>Superalink 自建付款页</title>
<style>
body{font-family:system-ui,-apple-system,Segoe UI,sans-serif;background:#f6f7f9;margin:0;padding:18px;color:#111}.wrap{max-width:680px;margin:18px auto;background:white;border-radius:16px;box-shadow:0 8px 30px rgba(0,0,0,.08);padding:22px}h2{margin-top:0}label{display:block;margin:14px 0 6px;font-weight:650}select,input{width:100%;box-sizing:border-box;padding:13px;border:1px solid #ddd;border-radius:10px;font-size:16px;background:#fff}button{margin-top:18px;width:100%;padding:14px 18px;border:0;border-radius:10px;background:#0a7cff;color:white;font-size:17px;cursor:pointer}button:disabled{opacity:.55;cursor:not-allowed}.muted{color:#666;font-size:14px;line-height:1.55}.pill{display:inline-block;background:#eef5ff;border:1px solid #cfe4ff;padding:4px 8px;border-radius:999px;font-size:13px;margin:3px 4px 3px 0}.summary{background:#f8fafc;border:1px solid #e5e7eb;border-radius:12px;padding:12px;margin-top:14px}.notice{background:#fff7ed;border:1px solid #fed7aa;border-radius:12px;padding:12px 14px;margin:14px 0;color:#7c2d12;font-size:13px;line-height:1.6}.notice b{color:#9a3412}.links{display:grid;gap:8px;background:#f0f9ff;border:1px solid #bae6fd;border-radius:12px;padding:12px 14px;margin:14px 0;font-size:14px}.links a{color:#0369a1;text-decoration:none;font-weight:650;word-break:break-all}.links a:hover{text-decoration:underline}.row{display:flex;justify-content:space-between;gap:12px;margin:6px 0}code{font-size:12px;word-break:break-all}
</style></head><body>
<div class="wrap">
<h2>Superalink 自建付款页</h2>
<p class="muted">实现站内自选：地区、SKU/套餐、币种都在本页选择，不需要跳去官网或粘链接。默认优惠券 <b>HAN000000</b>。</p>
<div class="links">
  <div>GitHub：<a href="https://github.com/mhan24/superalink-checkout-tool" target="_blank" rel="noopener noreferrer">https://github.com/mhan24/superalink-checkout-tool</a></div>
  <div>TG 群组：<a href="https://t.me/setupode" target="_blank" rel="noopener noreferrer">https://t.me/setupode</a></div>
  <div>TG 频道：<a href="https://t.me/setup0de" target="_blank" rel="noopener noreferrer">https://t.me/setup0de</a></div>
</div>
<div class="notice"><b>免责声明：</b>本站只是 Superalink eSIM 的自助下单辅助入口，商品、价格、支付、订单履约、售后与退款均以 Superalink 官方及支付服务商实际结果为准。请在付款前自行核对套餐、地区、天数、流量、币种和最终金额；本站不保证所有支付方式在所有设备/浏览器中都可用，也不提供绕过风控或安全验证的服务。</div>
<form id="orderForm" method="GET" action="/flow" onsubmit="btn.disabled=true;status.textContent='正在按所选 SKU / 币种创建订单...';">
<label>地区</label>
<input id="countryFilter" type="text" placeholder="筛选地区：输入 CN / AU / 中国大陆 / 澳大利亚" autocomplete="off">
<div class="muted">输入地区代码或地区名称可快速筛选/选择，例如 CN=中国大陆，AU=澳大利亚。</div>
<select id="country" name="country_code">
  <option value="TH">泰国（Thailand）TH</option>
  <option value="SG">新加坡（Singapore）SG</option>
  <option value="VN">越南（Vietnam）VN</option>
  <option value="JP">日本（Japan）JP</option>
  <option value="MY">马来西亚（Malaysia）MY</option>
  <option value="PH">菲律宾（Philippines）PH</option>
  <option value="ID">印尼（Indonesia）ID</option>
  <option value="TW">台湾（Taiwan）TW</option>
  <option value="KR">韩国（South Korea）KR</option>
  <option value="AP">亚洲 13 国（13 Asian Countries）AP</option>
  <option value="KR_JP">韩国/日本（South Korea/Japan）KR_JP</option>
  <option value="CN">中国大陆（China-Mainland）CN</option>
  <option value="CH">瑞士（Switzerland）CH</option>
  <option value="AE">阿联酋（United Arab Emirates）AE</option>
  <option value="MX">墨西哥（Mexico）MX</option>
  <option value="US">美国（United States）US</option>
  <option value="CA">加拿大（Canada）CA</option>
  <option value="SA">沙特阿拉伯（Saudi Arabia）SA</option>
  <option value="DE">德国（Germany）DE</option>
  <option value="AU">澳大利亚（Australia）AU</option>
  <option value="EG">埃及（Egypt）EG</option>
  <option value="ES">西班牙（Spain）ES</option>
  <option value="FR">法国（France）FR</option>
  <option value="GU">关岛（Guam）GU</option>
  <option value="GU_MP">关岛/塞班（Guam/Saipan）GU_MP</option>
  <option value="DK">丹麦（Denmark）DK</option>
  <option value="HK_MO">香港/澳门（Hong Kong/Macau）HK_MO</option>
  <option value="IT">意大利（Italy）IT</option>
  <option value="KH">柬埔寨（Cambodia）KH</option>
  <option value="MN">蒙古（Mongolia）MN</option>
  <option value="MO">澳门（Macau）MO</option>
  <option value="GB">英国（United Kingdom）GB</option>
  <option value="PT">葡萄牙（Portugal）PT</option>
  <option value="SE">瑞典（Sweden）SE</option>
  <option value="TR">土耳其（Turkey (Turkiye)）TR</option>
  <option value="US_CA">美国/加拿大（United States/Canada）US_CA</option>
  <option value="ZA">南非共和国（South Africa）ZA</option>
  <option value="MT">马耳他（Malta）MT</option>
  <option value="HK">香港（Hong Kong）HK</option>
  <option value="AT">奥地利（Austria）AT</option>
  <option value="WW_109">全球 109 国（Global 109 Countries）WW_109</option>
  <option value="IE">爱尔兰（Ireland）IE</option>
  <option value="MP">塞班（Saipan）MP</option>
</select>
<label>SKU / 套餐</label>
<select id="sku" name="sku"></select>
<label>币种</label>
<select id="currency" name="currency">
  <option value="THB">THB 泰铢</option>
  <option value="EUR">EUR 欧元</option>
  <option value="USD">USD 美元</option>
  <option value="GBP">GBP 英镑</option>
  <option value="KRW">KRW 韩元</option>
  <option value="JPY">JPY 日元</option>
  <option value="SGD">SGD 新币</option>
  <option value="CNY">CNY 人民币</option>
  <option value="IDR">IDR 印尼盾</option>
</select>
<label>参考币种 / 对比币种</label>
<select id="referenceCurrencySelect">
  <option value="AUTO">按地区自动</option>
  <option value="CNY">CNY 人民币</option>
  <option value="HKD">HKD 港币</option>
  <option value="TWD">TWD 新台币</option>
  <option value="JPY">JPY 日元</option>
  <option value="KRW">KRW 韩元</option>
  <option value="THB">THB 泰铢</option>
  <option value="SGD">SGD 新币</option>
  <option value="AUD">AUD 澳元</option>
  <option value="GBP">GBP 英镑</option>
  <option value="USD">USD 美元</option>
  <option value="EUR">EUR 欧元</option>
  <option value="IDR">IDR 印尼盾</option>
</select>
<div class="muted">默认按地区本地币种估算，比如 TW 显示 TWD；也可以手动改成 CNY 等。</div>
<input type="hidden" name="coupon" value="HAN000000">
<input type="hidden" name="affiliate_code" value="HAN000000">
<div class="summary" id="summary">正在加载官方 SKU...</div>
<div id="chinaPayHint" class="notice" style="display:none"><b>微信/支付宝提示：</b>中国大陆 SKU 如需使用微信或支付宝支付，请将上方结算币种切换为 <b>CNY 人民币</b> 后再创建付款页。</div>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
<button id="btn" type="submit" disabled>创建自建付款页</button>
<button id="officialBtn" type="button" disabled style="background:#111827">直接去官方结算页</button>
</div>
<div id="status" class="muted"></div>
</form>
</div>
<script>
const country=document.getElementById('country'), countryFilter=document.getElementById('countryFilter'), skuSel=document.getElementById('sku'), currency=document.getElementById('currency'), referenceCurrencySelect=document.getElementById('referenceCurrencySelect'), summary=document.getElementById('summary'), chinaPayHint=document.getElementById('chinaPayHint'), btn=document.getElementById('btn'), officialBtn=document.getElementById('officialBtn'), status=document.getElementById('status');
let catalog=[];
let countryOptions=[];
let referenceCurrency='CNY';
function money(p,cur){return p&&p.prices&&p.prices[cur]?p.prices[cur].display:'--'}
function finalMoney(p,cur){return p&&p.discounted_prices&&p.discounted_prices[cur]?p.discounted_prices[cur].display:money(p,cur)}
function priceAmount(p,cur){const src=p&&p.discounted_prices&&p.discounted_prices[cur]?p.discounted_prices:p&&p.prices;return src&&src[cur]&&typeof src[cur].amount==='number'?src[cur].amount:null}
function cnyRate(cur){const rates={THB:0.21,GBP:9.15,AUD:4.70,SGD:5.55,USD:7.20,HKD:0.92,TWD:0.23,JPY:0.047,CNY:1,EUR:7.75,KRW:0.0052,IDR:0.00045};return rates[cur]||null}
function currencySymbol(cur){const symbols={THB:'฿',GBP:'£',AUD:'A$',SGD:'S$',USD:'$',HKD:'HK$',TWD:'NT$',JPY:'¥',CNY:'¥',EUR:'€',KRW:'₩',IDR:'Rp'};return symbols[cur]||cur+' '}
function currencyDecimals(cur){return ['JPY','KRW','IDR'].includes(cur)?0:2}
function formatRefMoney(v,cur){if(v==null)return '--';const d=currencyDecimals(cur);return '≈'+currencySymbol(cur)+(d===0?Math.round(v).toString():v.toFixed(d))}
function refAmount(p,cur,refCur){const amount=priceAmount(p,cur), from=cnyRate(cur), to=cnyRate(refCur); if(amount==null||!from||!to)return null; return amount*from/to;}
function selectedRefCurrency(p){return referenceCurrencySelect.value==='AUTO'?(p&&p.reference_currency||referenceCurrency||'CNY'):referenceCurrencySelect.value}
function priceCompareHtml(p){const refCur=selectedRefCurrency(p);const curList=['THB','EUR','USD','GBP','KRW','JPY','SGD','CNY','IDR'];const rows=curList.map(cur=>{const amount=priceAmount(p,cur), ref=refAmount(p,cur,refCur);return amount==null?null:{cur,display:finalMoney(p,cur),ref,discount:p.discounted_prices&&p.discounted_prices[cur]&&p.discounted_prices[cur].discountDisplay};}).filter(Boolean).sort((a,b)=>(a.ref??999999)-(b.ref??999999));const best=rows[0];const label=(p.discounted_prices&&Object.keys(p.discounted_prices).length)?'按最高折扣后统一 '+refCur+' 估算对比':'官方标价统一按 '+refCur+' 估算对比';return '<div class=muted style="margin-top:8px"><b>'+label+'：</b>'+rows.map(r=>'<span class=pill '+(best&&r.cur===best.cur?'style="background:#ecfdf5;border-color:#bbf7d0;color:#166534;font-weight:700"':'')+'>'+r.cur+' '+r.display+' = '+formatRefMoney(r.ref,refCur)+(r.discount?'（减'+r.discount+'）':'')+(best&&r.cur===best.cur?' 最低':'')+'</span>').join('')+'</div><div class=muted>参考币种默认按地区自动切换，也可在上方手动改成 CNY/HKD/TWD/JPY/AUD 等：澳洲=AUD，中国大陆=CNY，香港/澳门=HKD，台湾=TWD，日本=JPY，韩国=KRW，泰国=THB，新加坡=SGD，英国=GBP，美国/加拿大=USD，欧洲=EUR。折扣币种：THB减฿175、EUR减€4、USD减$5、GBP减£4、KRW减₩6750、JPY减¥775、SGD减S$6.75、CNY减¥36.25、IDR减Rp80000。汇率为前端估算，最终以官方结算页为准。</div>'}
function bestCurrency(p){const refCur=selectedRefCurrency(p);const rows=Object.keys(p.discounted_prices&&Object.keys(p.discounted_prices).length?p.discounted_prices:p.prices||{}).map(cur=>({cur,ref:refAmount(p,cur,refCur)})).filter(x=>x.ref!=null).sort((a,b)=>a.ref-b.ref);return rows[0]?rows[0].cur:currency.value}
function officialUrl(p){const slug=p.country_slug||country.value.toLowerCase().replaceAll('_','-');const q=new URLSearchParams({duration:String(p.duration_days||5),utm_source:'affiliate',affiliate_code:'HAN000000',promo:'affiliate-influencer'});return 'https://www.superalink.com/cn/esim/'+slug+'?'+q.toString()}
function skuLabel(p){let opt=p.option==='UNLIMITED'?'无限':'固定'; let data=(p.data_amount||'')+(p.data_unit||''); return p.duration_days+'天 / '+opt+' / '+data+' / '+p.sku;}
function initCountryPicker(){countryOptions=Array.from(country.options).map(o=>({value:o.value,text:o.textContent})); country.value='CN'; countryFilter.value='';}
function renderCountryOptions(matches){const current=country.value; country.innerHTML=''; for(const item of matches){const o=document.createElement('option'); o.value=item.value; o.textContent=item.text; country.appendChild(o)} if(matches.some(x=>x.value===current)) country.value=current;}
function applyCountryFilter(){const q=countryFilter.value.trim().toLowerCase(); if(!q){renderCountryOptions(countryOptions); return;} const exact=countryOptions.find(o=>o.value.toLowerCase()===q); const matches=countryOptions.filter(o=>o.value.toLowerCase().includes(q)||o.text.toLowerCase().includes(q)); renderCountryOptions(exact?[exact,...matches.filter(o=>o!==exact)]:matches); if(exact||matches.length===1){country.value=(exact||matches[0]).value; loadCatalog();} else if(matches.length){country.value=matches[0].value;} else {const o=document.createElement('option'); o.value=''; o.textContent='没有匹配的目的地'; country.appendChild(o);}}
async function loadCatalog(){btn.disabled=true; officialBtn.disabled=true; skuSel.innerHTML='<option>加载中...</option>'; summary.textContent='正在读取官方 SKU...';
  try{let r=await fetch('/api/catalog?country_code='+encodeURIComponent(country.value)); let j=await r.json(); if(!j.ok) throw new Error(j.error||'catalog failed'); catalog=j.products||[]; referenceCurrency=j.reference_currency||'CNY'; skuSel.innerHTML='';
    for(const p of catalog){let o=document.createElement('option'); o.value=p.sku; o.textContent=skuLabel(p)+' · '+finalMoney(p,bestCurrency(p)); skuSel.appendChild(o)}
    let preferred=catalog.find(p=>p.sku==='CN-5GB_UNLIMITED-5GB-5-DAYS')||catalog.find(p=>p.option==='UNLIMITED'&&p.duration_days===5&&p.data_amount===5&&p.data_unit==='GB')||catalog[0];
    if(preferred){skuSel.value=preferred.sku; currency.value=bestCurrency(preferred);}
    updateSummary(); btn.disabled=!preferred; officialBtn.disabled=!preferred;
  }catch(e){summary.innerHTML='<span style="color:#c62828">加载 SKU 失败：'+e.message+'</span>'; skuSel.innerHTML='';}}
function updateSummary(){const p=catalog.find(x=>x.sku===skuSel.value); if(!p){summary.textContent='请选择 SKU'; chinaPayHint.style.display='none'; btn.disabled=true; officialBtn.disabled=true; return;} skuSel.querySelectorAll('option').forEach(o=>{const pp=catalog.find(x=>x.sku===o.value); if(pp)o.textContent=skuLabel(pp)+' · '+finalMoney(pp,bestCurrency(pp))}); const best=bestCurrency(p); const url=officialUrl(p); const refCur=selectedRefCurrency(p); const refMode=referenceCurrencySelect.value==='AUTO'?'按地区自动':'手动指定'; const isChinaSku=(p.country_code||country.value)==='CN'; chinaPayHint.style.display=isChinaSku?'block':'none'; chinaPayHint.innerHTML=currency.value==='CNY'?'<b>微信/支付宝提示：</b>当前中国大陆 SKU 已选择 <b>CNY 人民币</b>；如官方当前环境支持微信/支付宝，会在后续支付方式中显示。':'<b>微信/支付宝提示：</b>中国大陆 SKU 如需使用微信或支付宝支付，请将上方结算币种切换为 <b>CNY 人民币</b> 后再创建付款页。'; summary.innerHTML='<div class=row><span>SKU</span><b><code>'+p.sku+'</code></b></div><div class=row><span>套餐</span><b>'+skuLabel(p).split(' / '+p.sku)[0]+'</b></div><div class=row><span>参考币种</span><b>'+refCur+'（'+refMode+'）</b></div><div class=row><span>系统推荐币种</span><b>'+best+(best===currency.value?' 已选择':' （点击套餐后已自动优先选择）')+'</b></div><div class=row><span>当前选择币种</span><b>'+currency.value+'</b></div><div class=row><span>'+(p.discounted_prices&&p.discounted_prices[currency.value]?'预估折后金额':'官方标价')+'</span><b>'+finalMoney(p,currency.value)+' <span class=muted>'+formatRefMoney(refAmount(p,currency.value,refCur),refCur)+'</span></b></div>'+priceCompareHtml(p)+'<div class=muted>优惠券 HAN000000 会在创建订单/官方页面时应用。可选择本站创建自建付款页，也可直接跳官方产品结算页。</div><div class=muted>官方直达：<a href="'+url+'" target="_blank" rel="noopener">'+url+'</a></div><div class=notice style="margin-top:10px"><b>官方页优惠提示：</b>如果直达官方页面后价格没有自动折扣，可在付款时手动填写优惠券 <b>HAN000000</b>；也可以先点一下官网首页弹窗领券：<a href="https://www.superalink.com/destination/aff/HAN000000" target="_blank" rel="noopener">https://www.superalink.com/destination/aff/HAN000000</a></div>'; officialBtn.onclick=()=>{window.open(url,'_blank','noopener')}; btn.disabled=false; officialBtn.disabled=false;}
country.addEventListener('change',loadCatalog); countryFilter.addEventListener('input',applyCountryFilter); skuSel.addEventListener('change',()=>{const p=catalog.find(x=>x.sku===skuSel.value); if(p) currency.value=bestCurrency(p); updateSummary();}); currency.addEventListener('change',updateSummary); referenceCurrencySelect.addEventListener('change',()=>{const p=catalog.find(x=>x.sku===skuSel.value); if(p) currency.value=bestCurrency(p); updateSummary();}); initCountryPicker(); loadCatalog();
</script></body></html>`;