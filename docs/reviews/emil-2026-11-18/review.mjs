import fs from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire('C:/Users/paulg/OneDrive/Documents/ChatGPT/LAGDA/package.json');
const {chromium}=require('playwright');
const {AxeBuilder}=require('@axe-core/playwright');
const root='C:/Users/paulg/AppData/Local/LAGDA/screen-review-2026-11-18';
const credentials=JSON.parse(fs.readFileSync('C:/Users/paulg/AppData/Local/LAGDA/run/local-account.json','utf8'));
const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:1440,height:1000},locale:'en-PH',timezoneId:'Asia/Manila'});
const errors=[];const page=await context.newPage();
page.on('pageerror',e=>errors.push(String(e)));
const results=[];
async function capture(path,tag,axe=false){
 await page.goto('http://localhost:5173'+path,{waitUntil:'networkidle',timeout:45000});
 await page.screenshot({path:root+'/'+tag+'.png',fullPage:true});
 const data=await page.evaluate(()=>({title:document.title,url:location.pathname,headings:[...document.querySelectorAll('h1,h2')].map(x=>x.textContent),text:document.body.innerText.slice(0,18000),width:innerWidth,scrollWidth:document.documentElement.scrollWidth,overflow:[...document.querySelectorAll('body *')].filter(e=>{const r=e.getBoundingClientRect();const s=getComputedStyle(e);return r.width>0&&r.right>innerWidth+2&&r.left>=0&&s.position!=='fixed'&&s.visibility!=='hidden'&&s.display!=='none'}).slice(0,12).map(e=>({tag:e.tagName,cls:typeof e.className==='string'?e.className:'',text:e.textContent?.slice(0,80),right:e.getBoundingClientRect().right}))}));
 if(axe){const a=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();data.violations=a.violations.map(v=>({id:v.id,impact:v.impact,description:v.description,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary,html:n.html})).slice(0,12)}));}
 results.push({path,tag,...data});fs.writeFileSync(root+'/screen-results.json',JSON.stringify({errors,results},null,2));console.log(JSON.stringify({tag,url:data.url,overflow:data.scrollWidth>data.width,violations:data.violations?.map(v=>v.id)}));
}
for(const [path,tag] of [['/','home'],['/sign-in','sign-in'],['/create-account','create-account'],['/forgot-password','forgot-password'],['/pricing','pricing'],['/verify','verify-public']])await capture(path,'desktop-'+tag,true);
const login=await context.request.post('http://localhost:5173/api/auth/sessions',{data:{email:credentials.email,password:credentials.password}});if(login.status()!==200)throw Error('Local sign-in failed '+login.status());
for(const [path,tag] of [['/app/dashboard','dashboard'],['/app/documents','documents'],['/app/templates','templates'],['/app/templates/gallery','template-gallery'],['/app/contacts','contacts'],['/app/notifications','notifications'],['/app/verify','verify'],['/app/settings/profile','profile'],['/app/settings/security','security'],['/app/workspace/settings/billing','billing'],['/app/prepare/upload','prepare-upload'],['/app/documents/doc_7ab9aafa92434d1eab975ec401fe954e','document-detail']])await capture(path,'desktop-'+tag,true);
await page.setViewportSize({width:390,height:844});
for(const [path,tag] of [['/app/dashboard','dashboard'],['/app/documents','documents'],['/app/templates','templates'],['/app/contacts','contacts'],['/app/settings/profile','profile'],['/app/prepare/upload','prepare-upload'],['/app/documents/doc_7ab9aafa92434d1eab975ec401fe954e','document-detail'],['/','home'],['/sign-in','sign-in']])await capture(path,'mobile-'+tag,true);
await browser.close();
