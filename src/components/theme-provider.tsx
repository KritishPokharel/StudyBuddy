import { useEffect } from "react"
import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes"
import type { ThemeProviderProps } from "next-themes"
import { supabase } from "@/lib/supabase"

// Component to sync theme with Supabase
function ThemeSync() {
  const { setTheme } = useTheme()

  useEffect(() => {
    // Load theme from Supabase user metadata on mount
    const loadThemeFromSupabase = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user?.user_metadata?.theme) {
          setTheme(user.user_metadata.theme)
        }
      } catch (error) {
        console.error('Failed to load theme from Supabase:', error)
      }
    }

    loadThemeFromSupabase()
  }, [setTheme])

  return null
}

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemesProvider {...props} storageKey="studybuddy-theme">
      <ThemeSync />
      {children}
    </NextThemesProvider>
  )
}

