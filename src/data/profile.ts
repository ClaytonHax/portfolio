export const profile = {
  name: 'Clayton Banks',
  handle: 'claytonhax',
  role: 'Full-stack developer & AI builder',
  location: 'Harare, Zimbabwe',
  email: 'claytbzim@gmail.com',
  github: 'https://github.com/ClaytonHax',
  // TODO(clayton): replace with your exact profile URL (couldn't find it via public search)
  linkedin: 'https://www.linkedin.com/search/results/people/?keywords=Clayton%20Banks',
  tagline: 'I ship real software for real people — local LLM agents, AI farming advisors, production PWAs.',
  about: [
    'I build things end to end: the model prompt, the API route, the Firestore rules, the animation on the button.',
    'Most of my work runs in production for real users — a college estates department, Zimbabwean farmers, a yearbook committee, a small business selling mould-prevention pouches. Pathway, my hackathon build, took first place.',
    'Lately I spend most of my time on AI systems that run locally, talk straight, and actually do things.',
  ],
  stats: [
    { value: 14, suffix: '', label: 'projects shipped' },
    { value: 7, suffix: '', label: 'live in production' },
    { value: 3, suffix: '', label: 'AI products' },
    { value: 1, suffix: 'st', label: 'place at a hackathon' },
  ],
  skills: {
    Languages: ['TypeScript', 'JavaScript', 'Python', 'HTML', 'CSS', 'SQL'],
    Frontend: ['React 19', 'Next.js', 'Vite', 'Tailwind', 'Three.js', 'GSAP', 'PWA / Workbox'],
    Backend: ['Firebase', 'Firestore', 'Vercel Functions', 'Node.js', 'REST', 'Web Push'],
    AI: ['MLX', 'Local LLMs', 'OpenRouter', 'Vision models', 'Agents & tool use', 'Prompt design', 'Evals'],
    Tools: ['Git', 'Vercel', 'Claude Code', 'Leaflet', 'Recharts', 'KaTeX'],
  } as Record<string, string[]>,
}
