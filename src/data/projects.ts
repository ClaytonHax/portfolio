export type ProjectTier = 'flagship' | 'featured' | 'more'
export type ProjectCategory = 'AI' | 'Web App' | 'Simulation' | 'Website' | 'Tool'

export interface Project {
  id: string
  title: string
  /** one-liner, < 90 chars */
  tagline: string
  /** 2–3 sentences */
  description: string
  highlights: string[]
  stack: string[]
  category: ProjectCategory
  tier: ProjectTier
  year: number
  url?: string
  repo?: string
  /** path under /public, e.g. /shots/sabine.webp — may not exist yet, fall back to procedural art */
  image: string
  /** accent hue tweak for procedural art, CSS color */
  accent: string
}

export const projects: Project[] = [
  {
    id: 'sabine',
    title: 'SABINE',
    tagline: 'A local AI agent that runs entirely offline on Apple Silicon.',
    description:
      'Smart Agentic Build & Integration Neural Engine. A hand-written Python/MLX chat app and agent running quantised Qwen3 weights on the M3 GPU — no API key, no data leaves the machine. Optional online mode hands the same conversation to any frontier model through OpenRouter.',
    highlights: [
      'Runs on-device via MLX with KV-cache checkpoints',
      'Skills, persistent memory, incognito mode, sandboxed code execution',
      'Opt-in web search, real Chromium browser and computer-use (beta)',
      'Behaviour, code, computer-use and policy eval suites',
    ],
    stack: ['Python', 'MLX', 'Qwen3', 'OpenRouter', 'Chromium'],
    category: 'AI',
    tier: 'flagship',
    year: 2026,
    url: 'https://getsabine.com',
    image: '/shots/sabine.webp',
    accent: '#ff3b3b',
  },
  {
    id: 'simon',
    title: 'Ask Simon',
    tagline: "Zimbabwe's AI farming advisor, with live prices, weather and farm maps.",
    description:
      'An AI agronomist for Zimbabwean farmers. Chat about your crops with context from your own farms, draw field boundaries on a satellite map, track local and EU market prices, check the forecast, and generate PDF farm reports.',
    highlights: [
      'Farm Map: draw fields on Leaflet, areas computed with Turf',
      'Market price tracking with history and EU comparisons',
      'Document upload (PDF, Word, Excel) into the chat context',
      'Tiered usage, admin panel and generated PDF reports',
    ],
    stack: ['React', 'TypeScript', 'Firebase', 'Vercel Functions', 'Leaflet', 'React Query'],
    category: 'AI',
    tier: 'flagship',
    year: 2026,
    url: 'https://www.asksimon.co.zw',
    image: '/shots/simon.webp',
    accent: '#ff5a36',
  },
  {
    id: 'lapel',
    title: 'Lapel',
    tagline: 'AI stylist: your real wardrobe in, three outfits out, rendered on you.',
    description:
      'Photograph your clothes once. A vision model tags each item by category, colour, formality and season, a text model builds three complete looks for any occasion from what you own, and an image model renders a full-body photo of you wearing the one you pick.',
    highlights: [
      'Three-model pipeline: vision tagging, outfit planning, image render',
      'Server-only API keys and verified Firebase ID tokens on every route',
      'Zod-validated model output',
      'Locked-down Firestore and Storage rules per user',
    ],
    stack: ['Next.js 16', 'React 19', 'Tailwind v4', 'Firebase', 'OpenRouter', 'Zod'],
    category: 'AI',
    tier: 'flagship',
    year: 2026,
    repo: 'https://github.com/ClaytonHax/lapel',
    image: '/shots/lapel.webp',
    accent: '#ff2d55',
  },
  {
    id: 'sjet-rm',
    title: 'SJET R&M Tracker',
    tagline: 'Repairs & maintenance platform for a college estates department.',
    description:
      "A real-time, multi-user PWA used by St John's College estate staff on their phones while walking the property, and by office admins on desktop. Log faults, assign, track ageing, and export reports.",
    highlights: [
      'Role-based access: staff, admin, super admin',
      'Offline-capable PWA with Workbox',
      'Ageing reports, dashboards, PDF and Excel export',
      'Mobile-first design with dual card/table rendering',
    ],
    stack: ['React 19', 'TypeScript', 'Firebase', 'Tailwind', 'Workbox', 'jsPDF'],
    category: 'Web App',
    tier: 'featured',
    year: 2026,
    url: 'https://sjet-rm.vercel.app',
    image: '/shots/sjet-rm.webp',
    accent: '#e5252a',
  },
  {
    id: 'gym',
    title: 'Gym Tracker',
    tagline: 'Mobile-first PWA for lifting logs, routines and body composition.',
    description:
      'Live workout logger with per-set steppers, an auto-starting rest timer with vibration and audio alerts, "last time" targets inline, saved routines, push notifications and body-composition charts.',
    highlights: [
      'Installable PWA with web push reminders',
      'One-tap copy of your previous session',
      'kg/lb handled at display time, kg everywhere else',
      'Tested with Vitest',
    ],
    stack: ['React', 'TypeScript', 'Vite', 'Firebase', 'Recharts', 'Web Push'],
    category: 'Web App',
    tier: 'featured',
    year: 2026,
    url: 'https://clayton-gym.vercel.app',
    repo: 'https://github.com/ClaytonHax/Gym',
    image: '/shots/gym.webp',
    accent: '#ff4d4d',
  },
  {
    id: 'site19',
    title: 'Site-19 Breach Monitor',
    tagline: 'A top-down SCP containment-breach simulation where every agent has its own AI.',
    description:
      "Watch a facility fall apart. D-Class hunt for keycards, MTF Epsilon-11 sweep zones, SCP-049's zombies spread, and the anomalies run their own behaviour across a procedurally laid-out three-zone site.",
    highlights: [
      '104×70 tile, three-zone procedural facility',
      'Independent AI for every faction and SCP',
      'Keycard economy, checkpoints and dropped loot',
      'One self-contained HTML file, no dependencies',
    ],
    stack: ['JavaScript', 'Canvas 2D', 'Game AI'],
    category: 'Simulation',
    tier: 'featured',
    year: 2026,
    image: '/shots/site19.webp',
    accent: '#ff3b3b',
  },
  {
    id: 'cook-a-levels',
    title: 'Cook Your A Levels',
    tagline: 'Topical past-paper practice for Cambridge A Level Maths, Physics and CS.',
    description:
      'A revision platform for CIE A Level students. Question banks for Mathematics 9709, Physics 9702 and Computer Science 9618, sorted by topic and paper, with proper maths rendering.',
    highlights: [
      'Parsed question banks for three subjects',
      'KaTeX maths rendering',
      'Google sign-in, AS and A Level separation',
    ],
    stack: ['React', 'TypeScript', 'Firebase', 'KaTeX', 'Tailwind'],
    category: 'Web App',
    tier: 'featured',
    year: 2026,
    repo: 'https://github.com/ClaytonHax/cookyouralevels',
    image: '/shots/cook-a-levels.webp',
    accent: '#ff6b3b',
  },
  {
    id: 'mentormatch',
    title: 'MentorMatch',
    tagline: 'Swipe-to-match mentoring for students. Built at a hackathon.',
    description:
      'Students and mentors swipe on each other; mutual interest creates a match and opens real-time chat. Upload a CV and it pre-fills your profile.',
    highlights: [
      'Mutual-swipe matching on Firestore',
      'Real-time chat with onSnapshot',
      'CV parsing from PDF and Word',
      'Framer Motion swipe deck',
    ],
    stack: ['React', 'TypeScript', 'Firebase', 'Framer Motion', 'pdf.js'],
    category: 'Web App',
    tier: 'featured',
    year: 2026,
    url: 'https://hackerthon-six.vercel.app',
    repo: 'https://github.com/ClaytonHax/hackerthon',
    image: '/shots/mentormatch.webp',
    accent: '#ff3b6b',
  },
  {
    id: 'seed',
    title: 'Seed',
    tagline: 'Preview any SCP: Containment Breach map seed before you load in.',
    description:
      "Type a seed and get the exact facility layout the game will generate: zones, corridor shapes, checkpoints and every hand-placed room, reproduced from the game's own generator.",
    highlights: [
      "Reimplements the game's map generator",
      'Flags seeds where a booked room never spawns',
      'Shareable ?seed= links and teleport commands',
    ],
    stack: ['JavaScript', 'ES Modules', 'Canvas'],
    category: 'Tool',
    tier: 'more',
    year: 2026,
    image: '/shots/seed.webp',
    accent: '#ff3b3b',
  },
  {
    id: 'stop-mildew',
    title: 'Stop Mildew',
    tagline: 'Product site for a South African mould-prevention brand.',
    description:
      'A fast static site for a small business: product pages for wardrobes, boats, books and gun cases, an FAQ and safety info, with ordering on WhatsApp. Live on its own .co.za domain.',
    highlights: ['Custom domain', 'SEO and sitemap', 'WhatsApp ordering'],
    stack: ['HTML', 'CSS', 'Vercel'],
    category: 'Website',
    tier: 'more',
    year: 2026,
    url: 'https://stopmildew.co.za',
    image: '/shots/stop-mildew.webp',
    accent: '#ff5a5a',
  },
  {
    id: 'sjet-lp',
    title: 'SJET Lost Property',
    tagline: 'Lost-property management for a college department.',
    description:
      "Log found items, match them to claims and track handovers for St John's College. Ships with a companion Chrome extension.",
    highlights: ['Item and claim tracking', 'Chrome extension', 'Auto-deploy to Vercel'],
    stack: ['React 19', 'TypeScript', 'Firebase', 'Tailwind'],
    category: 'Web App',
    tier: 'more',
    year: 2026,
    url: 'https://sjet-lp.vercel.app',
    repo: 'https://github.com/ClaytonHax/SJET-LP',
    image: '/shots/sjet-lp.webp',
    accent: '#e5252a',
  },
  {
    id: 'yearbook',
    title: 'Yearbook Voting',
    tagline: 'Live nominations and a results dashboard for a school yearbook.',
    description:
      'Students nominate across twelve categories; a live dashboard tallies results in real time. Rebuilt from two HTML files into a typed React app.',
    highlights: ['12-category nomination flow', 'Real-time results dashboard'],
    stack: ['React', 'TypeScript', 'Firebase', 'Vite'],
    category: 'Web App',
    tier: 'more',
    year: 2026,
    repo: 'https://github.com/ClaytonHax/YearbookVoting',
    image: '/shots/yearbook.webp',
    accent: '#ff3b3b',
  },
  {
    id: 'circuit-vault',
    title: 'CIRCUIT//VAULT',
    tagline: 'An electronics and Arduino component reference hub.',
    description:
      'A searchable reference of sensors and components with example code and wiring notes for Arduino projects.',
    highlights: ['Sensor database', 'Example sketches per component'],
    stack: ['HTML', 'JavaScript', 'CSS'],
    category: 'Tool',
    tier: 'more',
    year: 2026,
    image: '/shots/circuit-vault.webp',
    accent: '#ff3b3b',
  },
  {
    id: 'mysmartschool',
    title: 'My Smart School',
    tagline: 'Student dashboard with an AI study helper and homework hints.',
    description:
      'Homework planner, grade tracker, timetable, exam countdowns and a daily study goal, plus an AI chat helper and a Homework Helper that gives hints from a photo of the question. Plain static site, no build step.',
    highlights: ['AI chat and photo homework hints', 'No-build ES modules'],
    stack: ['JavaScript', 'Firebase', 'OpenRouter'],
    category: 'Web App',
    tier: 'more',
    year: 2026,
    image: '/shots/mysmartschool.webp',
    accent: '#ff3b3b',
  },
]
