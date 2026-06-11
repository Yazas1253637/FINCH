import { useEffect } from 'react'
import { useSetting } from '../store/StoreProvider.jsx'

/**
 * Theme is a setting: 'system' | 'light' | 'dark'.
 * Applies the `.dark` class on <html> and tracks OS preference when 'system'.
 */
export function useTheme() {
  const [theme, setTheme] = useSetting('theme', 'system')

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => {
      const dark = theme === 'dark' || (theme === 'system' && media.matches)
      document.documentElement.classList.toggle('dark', dark)
    }
    apply()
    media.addEventListener('change', apply)
    return () => media.removeEventListener('change', apply)
  }, [theme])

  const cycle = () => {
    const order = ['system', 'light', 'dark']
    setTheme(order[(order.indexOf(theme) + 1) % order.length])
  }

  return { theme, setTheme, cycle }
}
