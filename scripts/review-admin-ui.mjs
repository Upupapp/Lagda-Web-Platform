/** Local UI review: node scripts/review-admin-ui.mjs [--phase=before|after] [--interactive]
 * Session and output are outside Git. Supply LAGDA_REVIEW_SESSION / LAGDA_REVIEW_OUTPUT if needed.
 * This harness injects response fixtures, never bypasses login/permissions, and blocks mutations.
 */
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { AxeBuilder } from '@axe-core/playwright';
import { adminFixture } from './fixtures/admin-ui-data.mjs';
const phase=process.argv.find(a=>a.startsWith('--phase='))?.split('=')[1]??'before';
const checks=process.argv.includes("--checks");
const interactive=process.argv.includes('--interactive');
const base='http://localhost:5173';
const session=process.env.LAGDA_REVIEW_SESSION??path.join(process.env.LOCALAPPDATA,'LAGDA/emil-sprints/business-session.json');
const output=process.env.LAGDA_REVIEW_OUTPUT??path.join(process.env.LOCALAPPDATA,'LAGDA/admin-review');fs.mkdirSync(output,{recursive:true});
const b=await chromium.launch({headless:!interactive});const results=[];
for(const width of interactive||checks?[process.argv.includes("--phone")?320:1440]:[1440,390,320]){
const c=await b.newContext({storageState:session,viewport:{width,height:1000},hasTouch:width<500,isMobile:width<500}),p=await c.newPage();
const access=await c.request.get(base+'/api/workspaces');if(access.status()!==200)throw Error('A valid local session is required; no permission bypass is provided.');
await c.route('**/api/**',async r=>{
const req=r.request();if(!['GET','HEAD','OPTIONS'].includes(req.method()))return r.fulfill({status:403,json:{error:{code:'review_read_only',message:'The UI review is read-only.'}}});
const mode=new URL(p.url()).searchParams.get('reviewData');if(!mode)return r.continue();
const fixture=adminFixture(mode),url=new URL(req.url()),tail=url.pathname.replace(/^\/api\/workspaces\/[^/]+/,'');
let data;if(tail==='/members')data={members:fixture.members};else if(tail==='/units')data={units:fixture.units};else if(/^\/units\/[^/]+\/members$/.test(tail))data={members:fixture.unitMembers};else if(tail==='/invitations')data={invitations:fixture.invitations};else if(tail==='/activity')data={events:fixture.events,nextCursor:null};else if(tail==='/people')data={people:fixture.members.map(m=>({userId:m.userId,avatarVersion:'broken-photo'}))};
if(data)return r.fulfill({json:data});if(/\/avatar$/.test(tail))return r.fulfill({status:404,body:''});return r.continue();});
await p.addInitScript(()=>{addEventListener('DOMContentLoaded',()=>{if(!location.pathname.startsWith('/app/workspace'))return;const nav=document.createElement('nav');nav.setAttribute('aria-label','Local review data');nav.style.cssText='position:fixed;bottom:8px;left:50%;transform:translateX(-50%);z-index:99999;background:#e5e7eb;padding:4px;border-radius:8px;display:flex;gap:2px;max-width:96vw;overflow:auto';for(const [key,label]of[['demo','Demo data'],['worst','Worst case'],['empty','Empty'],['one','One'],['huge','1,284 people']]){const a=document.createElement('button');a.textContent=label;a.style.cssText='font:12px system-ui;white-space:nowrap;border:0;padding:8px;background:white;color:#111827;border-radius:5px';a.onclick=()=>{const u=new URL(location.href);u.searchParams.set('reviewData',key);location.href=u.href;};nav.append(a);}const hide=document.createElement('button');hide.textContent='Hide';hide.setAttribute('aria-label','Hide review controls');hide.onclick=()=>nav.remove();nav.append(hide);document.body.append(nav);});});
await p.goto(base+'/app/dashboard',{waitUntil:'networkidle'});await p.waitForTimeout(500);
if(interactive){await p.goto(base+'/app/workspace/people?reviewData=worst',{waitUntil:'networkidle'});console.log('Local review toggle open. Close the browser to end.');await new Promise(resolve=>b.on('disconnected',resolve));process.exit(0);}
if(checks){
await p.goto(base+'/app/workspace/people?reviewData=worst',{waitUntil:'networkidle'});
await p.getByTestId('people-search').fill('NoMatchingDepartment');await p.getByRole('button',{name:'Clear search',exact:true}).click();
if(await p.getByTestId('people-search').inputValue()!=='')throw Error('Search reset failed');
await p.getByTestId('tree-node-review-user-5').waitFor();const emoji=await p.getByTestId('tree-node-review-user-5').innerText();if(emoji.includes('\uFFFD'))throw Error('Broken Unicode initial');
await p.getByTestId('tree-node-review-user-6').click();await p.getByRole('dialog').getByRole('heading',{name:'person.6@example.test',exact:true}).waitFor();const memberScan=await new AxeBuilder({page:p}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();results.push({screen:'missing-name-member-panel',width,violations:memberScan.violations});await p.screenshot({path:path.join(output,phase+'-member-panel.png'),fullPage:true});await p.getByRole('dialog').getByRole('button',{name:'Close',exact:true}).click();
await p.getByRole('button',{name:'New team',exact:true}).click();const dialog=p.getByRole('dialog');await dialog.waitFor();
const scrollBefore=await p.locator('.lagda-page-content').evaluate(e=>e.scrollTop);
await p.mouse.move(2,100);await p.mouse.wheel(0,500);await p.waitForTimeout(150);
const scrollAfter=await p.locator('.lagda-page-content').evaluate(e=>e.scrollTop);
if(scrollBefore!==scrollAfter)throw Error('Background scroll moved behind dialog');
const dialogScan=await new AxeBuilder({page:p}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();results.push({screen:'new-team-dialog',width,violations:dialogScan.violations});await p.screenshot({path:path.join(output,phase+'-new-team-dialog.png'),fullPage:true});
const buttons=dialog.locator('button:not([disabled]),input:not([disabled]),select:not([disabled])');await buttons.last().focus();await p.keyboard.press('Tab');if(!await dialog.evaluate(e=>e.contains(document.activeElement)))throw Error('Tab escaped dialog');await buttons.first().focus();await p.keyboard.press('Shift+Tab');if(!await dialog.evaluate(e=>e.contains(document.activeElement)))throw Error('Reverse Tab escaped dialog');await p.keyboard.press('Escape');if(!await p.getByRole('button',{name:'New team',exact:true}).evaluate(e=>e===document.activeElement))throw Error('Focus not restored');
await p.getByRole('button',{name:'Hide review controls',exact:true}).click();await p.getByTestId('invite-people-toggle').click();const invite=p.getByRole('dialog');await invite.waitFor();
for(const name of ['Invite by email','Join links','Requests']){await invite.getByRole('tab',{name:new RegExp(name)}).click();await p.waitForTimeout(500);const a=await new AxeBuilder({page:p}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();results.push({screen:name,width,violations:a.violations});}
await p.keyboard.press('Escape');
await p.getByRole('button',{name:/Waiting to Join/}).click();await p.getByRole('dialog').waitFor();const waiting=await new AxeBuilder({page:p}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();results.push({screen:'Waiting to Join',width,violations:waiting.violations});await p.screenshot({path:path.join(output,phase+'-waiting.png'),fullPage:true});await p.getByRole('dialog').getByRole('button',{name:'Close',exact:true}).click();
await p.setViewportSize({width:320,height:844});await p.goto(base+'/app/workspace/people?reviewData=worst',{waitUntil:'networkidle'});if(width<500){const targets=await p.locator('.pt-view button').evaluateAll(es=>es.map(e=>({width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height})));if(!targets.length||targets.some(r=>r.width<44||r.height<44))throw Error('Phone view controls below 44px');}
const options=p.getByRole('button',{name:'Team options',exact:true}).first();await options.click();await p.keyboard.press('ArrowDown');if(!await p.getByRole('menu').evaluate(e=>e.contains(document.activeElement)))throw Error('Team menu keyboard focus escaped');await p.keyboard.press('Escape');if(!await options.evaluate(e=>e===document.activeElement))throw Error('Team menu focus not restored');
await p.evaluate(()=>document.documentElement.style.fontSize='200%');await p.screenshot({path:path.join(output,phase+'-large-text-320.png'),fullPage:true});if(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('Page overflow at enlarged root text');
results.push({checks:'search reset, Unicode, missing-name detail, dialog focus trap / Escape / restore, 320px enlarged root text',passed:true});console.log('Interaction checks passed');await c.close();break;
}
for(const mode of['demo','worst','empty','one','huge'])for(const section of mode==='worst'?['people','activity']:['people']){
await p.goto(base+'/app/workspace/'+section+'?reviewData='+mode,{waitUntil:'networkidle'});await p.waitForTimeout(400);const a=await new AxeBuilder({page:p}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();const overflow=await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth);await p.screenshot({path:path.join(output,`${phase}-${section}-${mode}-${width}.png`),fullPage:true});results.push({mode,section,width,overflow,violations:a.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({html:n.html,target:n.target,summary:n.failureSummary}))}))});console.log(mode,section,width,overflow,a.violations.map(v=>v.id));}
await c.close();}
fs.writeFileSync(path.join(output,`${phase}-stress.json`),JSON.stringify(results,null,2));await b.close();
