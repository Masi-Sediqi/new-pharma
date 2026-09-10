export type ThemeName = 'minimalism' | 'claymorphism' | 'glassmorphism' | 'liquidGlass' | 'neonGlass'

export const themes: Array<{
  id: ThemeName
  name: string
  description: string
}> = [
  { id: 'minimalism', name: 'Minimalism', description: 'Clean, flat, professional' },
  { id: 'claymorphism', name: 'Claymorphism', description: 'Soft pastel clay surfaces' },
  { id: 'glassmorphism', name: 'Glassmorphism', description: 'Frosted translucent panels' },
  { id: 'liquidGlass', name: 'Liquid Glass', description: 'Animated iridescent glass' },
  { id: 'neonGlass', name: 'Neon Glass', description: 'Glowing neon on dark glass' },
]
