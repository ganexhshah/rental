import { create } from 'zustand'

export type ThemeMode = 'light' | 'dark'
export type FontPreset = 'modern' | 'jakarta' | 'outfit' | 'inter'

export const FONT_STACKS: Record<FontPreset, { label: string; primary: string; display: string }> = {
  modern: {
    label: 'Modern Pairing (Plus Jakarta Sans + Outfit)',
    primary: "'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    display: "'Outfit', 'Plus Jakarta Sans', sans-serif",
  },
  jakarta: {
    label: 'Plus Jakarta Sans (Crisp Clean SaaS)',
    primary: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    display: "'Plus Jakarta Sans', sans-serif",
  },
  outfit: {
    label: 'Outfit (Bold Geometric Display)',
    primary: "'Outfit', 'Plus Jakarta Sans', sans-serif",
    display: "'Outfit', sans-serif",
  },
  inter: {
    label: 'Inter (Enterprise Precision)',
    primary: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    display: "'Inter', sans-serif",
  },
}

interface ThemeState {
  mode: ThemeMode
  primaryColor: string
  borderRadius: number
  compact: boolean
  fontPreset: FontPreset
  toggleTheme: () => void
  setMode: (mode: ThemeMode) => void
  setPrimaryColor: (color: string) => void
  setBorderRadius: (radius: number) => void
  setCompact: (compact: boolean) => void
  setFontPreset: (fontPreset: FontPreset) => void
}

const STORAGE_KEY = 'rental_theme_mode'
const FONT_STORAGE_KEY = 'rental_theme_font'

export const useThemeStore = create<ThemeState>((set) => {
  const initialMode = (localStorage.getItem(STORAGE_KEY) as ThemeMode) || 'light'
  const initialFont = (localStorage.getItem(FONT_STORAGE_KEY) as FontPreset) || 'modern'

  return {
    mode: initialMode,
    primaryColor: '#1677ff',
    borderRadius: 8,
    compact: false,
    fontPreset: initialFont,
    toggleTheme: () =>
      set((state) => {
        const next = state.mode === 'light' ? 'dark' : 'light'
        localStorage.setItem(STORAGE_KEY, next)
        return { mode: next }
      }),
    setMode: (mode) => {
      localStorage.setItem(STORAGE_KEY, mode)
      set({ mode })
    },
    setPrimaryColor: (primaryColor) => set({ primaryColor }),
    setBorderRadius: (borderRadius) => set({ borderRadius }),
    setCompact: (compact) => set({ compact }),
    setFontPreset: (fontPreset) => {
      localStorage.setItem(FONT_STORAGE_KEY, fontPreset)
      set({ fontPreset })
    },
  }
})
