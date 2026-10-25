/**
 * Case-study copy, keyed by project id from projects.ts.
 * Everything here comes from the project's own README / CLAUDE.md / source. No invented numbers.
 */
export interface CaseStudy {
  /** 1–2 sentences */
  summary: string
  problem?: string
  /** what I built, 4–6 concrete bullets (short case studies use 2–4) */
  built?: string[]
  decision?: { title: string; body: string }
  /** where it stands now */
  result?: string
  role?: string
}

export const cases: Record<string, CaseStudy> = {
  sabine: {
    summary:
      'SABINE is a chat app and coding agent that runs a language model on my own Mac. No API key, no account, and nothing leaves the machine unless I switch it on.',
    problem:
      'Most AI tools are somebody else\'s server. Your questions, your files and your memory go to them, you pay per token, and the answers come wrapped in hedging. I wanted an assistant that lived on my machine, remembered me, could actually do things, and spoke plainly.',
    built: [
      'A local engine on Apple MLX that runs 4-bit quantised open-weight models (Qwen3 among them) on the M3 GPU, with the prompt cache saved to disk so long chats stay fast.',
      'A Mac app (a WKWebView window over a local server) with streaming markdown, collapsible reasoning, tool-call cards and saved conversations. The same sessions open in the terminal.',
      'Memory as one plain-text file I can read and edit. It is shown to the model at the start of every chat, and an incognito mode that neither reads nor writes it.',
      'Skills in the same SKILL.md format Claude Code uses, so a coding session can load a playbook and run its scripts.',
      'Opt-in extras: web search, a real Chromium, and a beta computer-use mode where it looks at the screen and clicks, one step at a time, asking me first.',
      'An online mode that sends the same conversation to any hosted model through OpenRouter, for when a bigger model is worth it.',
    ],
    decision: {
      title: 'Code the model writes runs in a jail',
      body:
        'Small local models write code that is wrong in new ways, and I did not want that code near my files. Anything the model chooses to run goes into a macOS sandbox-exec profile: no network, no reading my home folder, writes only inside its own scratch folder, a time limit and a CPU cap. The same idea applies to the internet: until I turn search or the browser on, the model is not even told they exist, so it cannot ask for them or pretend to have used them.',
    },
    result:
      'Version 3.0.6, running on my own Mac. It has its own site, getsabine.com, which serves downloads and updates, and four eval suites in the repo (behaviour, code, computer use and policy) that I run against changes.',
    role: 'Everything: engine, app, prompts, evals, site',
  },

  simon: {
    summary:
      'Ask Simon is an AI farming advisor for Zimbabwe. It answers questions using your own farm, today\'s weather and current market prices, not generic advice.',
    problem:
      'Farming advice that ignores where you are is not much use. What to spray, when to plant and what to sell depend on your natural region, your fields, the forecast and what produce is fetching this week. Most chatbots know none of that, and it is hard to find in one place.',
    built: [
      'A chat advisor with a long Zimbabwe-specific system prompt: natural regions, maize varieties, chemicals, pests and diseases. It always answers as "I", and sends you to the Weather tab for forecasts beyond today.',
      'A Farm Map where you draw field boundaries on a satellite view with Leaflet; areas are computed with Turf and saved to your farm.',
      'Market prices scraped from the Mbare Musika table and cached once a day in Firestore, with price history and a European retail comparison.',
      'Weather and a spray-window view per farm, plus document upload (PDF, Word, Excel) that feeds into the chat on the Pro plan.',
      'Generated PDF farm reports, an admin panel, and free, pro and admin plans with daily limits on questions and images.',
    ],
    decision: {
      title: 'Build the prompt per request, from only what matters',
      body:
        'Sending everything on every message would be slow and expensive, so the API builds the system prompt each time. It adds a summary of the farmer\'s farms, today\'s weather for their location and the field list, and it only adds market prices for crops that farmer has registered. If they have none, that block is skipped to save tokens. The effect is that Simon can quote today\'s conditions and your own crop prices directly, instead of being vague.',
    },
    result:
      'Live at asksimon.co.zw, with accounts, onboarding, plans and an admin panel. The model calls run server-side through OpenRouter, so no key reaches the browser.',
    role: 'Product, frontend, API routes, prompts',
  },

  pathway: {
    summary:
      'Pathway is a swipe-based app for finding internships, volunteering, gigs and training in Zimbabwe. It won 1st place at the hackathon it was built for.',
    problem:
      'The brief was to connect young people in Zimbabwe with internships, volunteering, gigs, learnerships and training. That meant a phone-first app that works on slow connections, and a way for employers to post roles and see who fits.',
    built: [
      'A swipe deck of opportunities with drag gestures and keyboard controls (left to skip, right to save, Z to undo, Enter for details).',
      'A matching engine that scores every opportunity from 0 to 100 for each user, from skills and skill levels, interests, career goal, location, languages and start date, with a one-line "why this matches you".',
      'Learning from behaviour: swipe history and explicit thumbs up or down on matches adjust the scores for that user.',
      'An employer side: post a listing, see applicants in a pipeline, and compare candidates, each showing the match score they had when they applied.',
      'CV upload for PDF and Word that pre-fills a profile, a guided onboarding, and one-tap guest access so judges could try it instantly.',
      'XP, levels and badges to keep people coming back.',
    ],
    decision: {
      title: 'Cards without photos, and a cache that survives bad Wi-Fi',
      body:
        'Connections are slow and data is costly, so opportunity cards are drawn from icons and gradients instead of images, and loading uses skeletons. Firestore runs with a persistent local cache, so the deck keeps working when the network drops mid-demo. The matching runs in the browser, which keeps it instant and means it still works from cached data.',
    },
    result:
      'Won 1st place at the hackathon. It is live and the code is on GitHub. It started life as MentorMatch and was renamed Pathway once it became about opportunities rather than mentors.',
    role: 'Full-stack build: React frontend, Firestore, matching engine',
  },

  lapel: {
    summary:
      'Lapel is an AI stylist. I photograph my clothes once, tell it the occasion, and it suggests three outfits from what I own, then renders the one I pick on a photo of me.',
    problem:
      'Most days the issue is not a lack of clothes, it is deciding what goes together. Style apps either suggest things you do not own, or make you type out your wardrobe item by item.',
    built: [
      'Wardrobe capture: upload a photo and a vision model tags the item with category, colours, formality and seasons, and writes a short description of how it looks when worn.',
      'An outfit planner that takes an occasion ("dinner in Borrowdale, 7pm") and returns three complete looks from the wardrobe.',
      'A full-body render of the chosen outfit on the user\'s own appearance profile, using an image model.',
      'Five API routes (items, tagging, profile, style, render) plus weather and trip planning, all on Next.js 16 and React 19.',
      'Firestore and Storage security rules so one user\'s wardrobe cannot be read by another.',
    ],
    decision: {
      title: 'The model can only pick clothes that exist',
      body:
        'Language models invent things. So whatever the stylist returns is checked against the real wardrobe: unknown item ids are dropped, and an outfit that loses a core garment in the process is dropped too. Output is also validated with Zod. Image generation is the one expensive call, so a render is only made after a cache miss. The cache key is a hash of my appearance version plus the sorted item ids, and a daily limit per user is claimed in a transaction so two fast taps cannot both go through.',
    },
    result:
      'Working end to end; the code is on GitHub. It needs your own Firebase project and OpenRouter key to run. Every API route verifies a Firebase ID token and the keys never reach the browser.',
    role: 'Everything: design, frontend, API routes, prompts, rules',
  },

  'sjet-rm': {
    summary:
      'A repairs and maintenance tracker for the estates department of St John\'s College. Staff log faults from their phones while walking the grounds; admins manage them on desktop.',
    built: [
      'Fault logging, assignment and ageing, with three roles: staff, admin and super admin.',
      'An offline-capable PWA using Workbox, so it holds up on patchy signal outdoors.',
      'Dashboards and ageing reports with PDF and Excel export.',
      'Mobile-first screens that render as cards on a phone and as tables on desktop.',
    ],
    result: 'Live, and used by estate staff on their phones and office admins on desktop.',
    role: 'Design, frontend, Firebase rules',
  },

  gym: {
    summary: 'A phone-first workout tracker for logging sets quickly, with routines and body-composition charts.',
    built: [
      'Per-set steppers, an auto-starting rest timer with vibration and sound, and last session\'s numbers shown inline as targets.',
      'Saved routines, one-tap copy of your previous workout, and body-composition charts.',
      'Installable PWA with push reminders. Weights are stored in kg and converted for display, so switching units never changes data.',
    ],
    result: 'Live as an installable PWA.',
  },

  site19: {
    summary: 'A top-down simulation of a containment breach where every agent runs its own AI. You watch the facility fall apart.',
    built: [
      'A 104 by 70 tile facility laid out procedurally in three zones.',
      'Separate behaviour for D-Class, MTF squads and each anomaly, with a keycard economy, checkpoints and dropped loot.',
      'The whole thing is one self-contained HTML file with no dependencies.',
    ],
    result: 'Runs by opening the file. A side project made for fun.',
  },

  'cook-a-levels': {
    summary: 'Topical past-paper practice for Cambridge A Level Mathematics, Physics and Computer Science.',
    built: [
      'Question banks for 9709, 9702 and 9618 parsed from past papers and sorted by topic and paper.',
      'Maths rendered with KaTeX, Google sign-in, and AS and A Level kept separate.',
    ],
    result: 'Code on GitHub.',
  },

  seed: {
    summary: 'Type a seed for SCP: Containment Breach and see the facility the game will generate before you load in.',
    built: [
      'A reimplementation of the game\'s own map generator in JavaScript, so the preview matches the game.',
      'It flags seeds where a booked room never spawns, and gives shareable links and teleport commands.',
    ],
    result: 'A small browser tool for players of the game.',
  },

  'stop-mildew': {
    summary: 'A fast static site for a small South African business that sells mould-prevention products.',
    built: [
      'Product pages for wardrobes, boats, books and gun cases, plus an FAQ and safety information.',
      'Ordering goes through WhatsApp, which is how customers already talk to the owner.',
      'Its own .co.za domain, a sitemap and basic SEO.',
    ],
    result: 'Live at stopmildew.co.za.',
  },

  'sjet-lp': {
    summary: 'Lost-property management for a college department: log found items, match them to claims and track handovers.',
    built: [
      'Item and claim tracking with a record of each handover.',
      'A companion Chrome extension.',
      'Auto-deploys to Vercel on every push to main.',
    ],
    result: 'Live.',
  },

  yearbook: {
    summary: 'A nomination and live results site for a school yearbook committee.',
    built: [
      'A nomination flow across twelve categories.',
      'A results dashboard that updates in real time.',
      'Rebuilt from two plain HTML files into a typed React app.',
    ],
    result: 'Code on GitHub.',
  },

  'circuit-vault': {
    summary: 'A searchable reference for electronics components and sensors, with example code for Arduino projects.',
    built: ['A sensor and component database.', 'An example sketch and wiring notes for each part.'],
    result: 'A plain HTML, CSS and JavaScript site.',
  },

  mysmartschool: {
    summary: 'A student dashboard with a homework planner, grades, timetable and exam countdowns, plus an AI study helper.',
    built: [
      'A daily study goal, grade tracker and timetable.',
      'An AI chat helper, and a Homework Helper that gives hints from a photo of the question instead of the answer.',
      'Plain static files and ES modules, no build step.',
    ],
    result: 'Static site.',
  },
}
