// Usage: SHOOT_TOOLS=/dir/with/node_modules(playwright,sharp) node scripts/shoot.mjs [id ...]
// Deps are NOT in this project; install playwright + sharp in a temp dir and point SHOOT_TOOLS at it.
import { createRequire } from 'node:module'
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const TOOLS = process.env.SHOOT_TOOLS ||
  '/private/tmp/claude-501/-Users-claytonbanks-Documents-coders-portfollio/8346c189-cab0-4e98-bf19-832f20e14fff/scratchpad/tools'
const require = createRequire(path.join(TOOLS, 'x.js'))
const { chromium } = require('playwright')
const sharp = require('sharp')

const here = path.dirname(fileURLToPath(import.meta.url))
const out = path.resolve(here, '../public/shots')
const root = path.resolve(here, '../..')
fs.mkdirSync(out, { recursive: true })

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.woff2': 'font/woff2', '.woff': 'font/woff', '.txt': 'text/plain' }
function serve(dir) {
  return new Promise((res) => {
    const s = http.createServer((req, rsp) => {
      let p = path.join(dir, decodeURIComponent(req.url.split('?')[0]))
      if (fs.existsSync(p) && fs.statSync(p).isDirectory()) p = path.join(p, 'index.html')
      if (!fs.existsSync(p)) { rsp.writeHead(404); return rsp.end() }
      rsp.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'application/octet-stream' })
      fs.createReadStream(p).pipe(rsp)
    }).listen(0, () => res({ s, url: `http://localhost:${s.address().port}` }))
  })
}

const live = (u, wait = 3500) => ({ url: u, wait })
// cook-a-levels, yearbook, lapel: skipped (dist built without Firebase env -> blank page; lapel has no build)
const targets = {
  sabine: live('https://getsabine.com'),
  simon: live('https://www.asksimon.co.zw'),
  'sjet-rm': live('https://sjet-rm.vercel.app'),
  gym: live('https://clayton-gym.vercel.app'),
  mentormatch: live('https://hackerthon-six.vercel.app'),
  'stop-mildew': live('https://stopmildew.co.za'),
  'sjet-lp': live('https://sjet-lp.vercel.app'),
  site19: { dir: 'SCP', page: 'site19-breach-monitor.html', wait: 7000 },
  seed: { dir: 'seed', wait: 2000, act: async (p) => { await p.fill('#seedText', 'portfolio'); await p.click('#go'); await p.waitForTimeout(3000) } },
  'circuit-vault': { dir: 'arduino', wait: 2500 },
  mysmartschool: { dir: 'MySmartSchool', wait: 2500 },
}

const want = process.argv.slice(2)
const ids = want.length ? want : Object.keys(targets)
const browser = await chromium.launch()
for (const id of ids) {
  const t = targets[id]
  if (!t) { console.log('unknown', id); continue }
  let srv
  try {
    const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 }, colorScheme: 'dark', deviceScaleFactor: 1 })
    const page = await ctx.newPage()
    let url = t.url
    if (t.dir) { srv = await serve(path.join(root, t.dir.split('/')[0] === t.dir ? t.dir : t.dir)); url = srv.url + '/' + (t.page || '') }
    await page.goto(url, { waitUntil: 'load', timeout: 45000 })
    await page.evaluate(() => document.fonts && document.fonts.ready).catch(() => {})
    await page.waitForTimeout(t.wait)
    // dismiss cookie banners
    for (const name of [/accept all/i, /^accept$/i, /agree/i, /got it/i]) {
      const b = page.getByRole('button', { name }).first()
      if (await b.count().catch(() => 0)) { await b.click({ timeout: 1000 }).catch(() => {}); break }
    }
    if (t.act) await t.act(page)
    const buf = await page.screenshot({ type: 'png' })
    await sharp(buf).webp({ quality: 82 }).toFile(path.join(out, `${id}.webp`))
    await sharp(buf).resize(800, 500).webp({ quality: 82 }).toFile(path.join(out, `${id}-sm.webp`))
    console.log('ok', id)
    await ctx.close()
  } catch (e) { console.log('FAIL', id, e.message.split('\n')[0]) }
  if (srv) srv.s.close()
}
await browser.close()
