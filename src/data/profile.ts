export const profile = {
  name: 'Clayton Banks',
  handle: 'claytonhax',
  role: 'Full-stack developer & problem solver',
  location: 'Harare, Zimbabwe',
  email: 'claytbzim@gmail.com',
  github: 'https://github.com/ClaytonHax',
  // TODO(clayton): replace with your exact profile URL (couldn't find it via public search)
  linkedin: 'https://www.linkedin.com/search/results/people/?keywords=Clayton%20Banks',
  tagline: 'I turn messy, real-world problems into fast, powerful apps people actually use.',
  aboutHeading: 'Problem first. Code second.',
  about: [
    "I start with what's actually broken — a process living in a notebook, a team chasing repairs by WhatsApp, a farmer guessing at prices — and build the app that fixes it.",
    'I work end to end: data model, API, security rules, interface, and the animation on the button. Most of what I build runs in production for real people — a college estates team, Zimbabwean farmers, a small business selling online. Pathway, my hackathon build for young job-seekers, took first place.',
    "I reach for whatever solves the problem best. Sometimes that's AI. Usually it's just really good software.",
  ],
  stats: [
    { value: 11, suffix: '', label: 'projects shipped' },
    { value: 7, suffix: '', label: 'live in production' },
    { value: 1, suffix: 'st', label: 'place at a hackathon' },
    { value: 2, suffix: '', label: 'organisations run on my code' },
  ],
  skills: {
    Languages: ['TypeScript', 'JavaScript', 'Python', 'HTML', 'CSS', 'SQL'],
    Frontend: ['React 19', 'Next.js', 'Vite', 'Tailwind', 'Three.js', 'GSAP', 'PWA / Workbox'],
    'Backend & Infra': ['Cloudflare', 'Cloudflare Workers', 'Cloudflare Pages', 'Firebase', 'Firestore', 'Vercel Functions', 'Node.js', 'REST', 'Web Push'],
    'AI & Data': ['MLX', 'Local LLMs', 'OpenRouter', 'Vision models', 'Agents & tool use', 'Prompt design', 'Evals'],
    Tools: ['Git', 'Vercel', 'Claude Code', 'Leaflet', 'Recharts', 'KaTeX'],
  } as Record<string, string[]>,
}
