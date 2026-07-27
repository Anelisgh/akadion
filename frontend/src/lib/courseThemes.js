export const DEFAULT_COURSE_THEME = "akadion"
export const COURSE_THEMES = [
  {
    key: "akadion",
    label: "Akadion",
    accent: "from-[#476382] via-[#6687aa] to-[#8fb0ca]",
    swatch: "bg-linear-to-br from-[#476382] via-[#6687aa] to-[#8fb0ca]",
    text: "text-[#476382]",
  },
  {
    key: "ocean-blue",
    label: "Ocean Blue",
    accent: "from-[#123d63] via-[#1d5d86] to-[#4f8dae]",
    swatch: "bg-linear-to-br from-[#123d63] via-[#1d5d86] to-[#4f8dae]",
    text: "text-[#123d63]",
  },
  {
    key: "forester",
    label: "Forester",
    accent: "from-[#173f2b] via-[#245f3e] to-[#4d8462]",
    swatch: "bg-linear-to-br from-[#173f2b] via-[#245f3e] to-[#4d8462]",
    text: "text-[#173f2b]",
  },
  {
    key: "caramel",
    label: "Caramel",
    accent: "from-[#744019] via-[#96551f] to-[#bd7838]",
    swatch: "bg-linear-to-br from-[#744019] via-[#96551f] to-[#bd7838]",
    text: "text-[#744019]",
  },
  {
    key: "dracula",
    label: "Dracula",
    accent: "from-[#211b35] via-[#342b55] to-[#544783]",
    swatch: "bg-linear-to-br from-[#211b35] via-[#342b55] to-[#544783]",
    text: "text-[#211b35]",
  },
  {
    key: "cherry-red",
    label: "Cherry Red",
    accent: "from-[#781f38] via-[#a12c4f] to-[#c55172]",
    swatch: "bg-linear-to-br from-[#781f38] via-[#a12c4f] to-[#c55172]",
    text: "text-[#781f38]",
  },
]

export const COURSE_THEME_KEYS = new Set(COURSE_THEMES.map((theme) => theme.key))

export function getCourseTheme(themeKey) {
  return COURSE_THEMES.find((theme) => theme.key === themeKey) ?? COURSE_THEMES[0]
}

export function getThemeUserKey(user) {
  return user?.mail || user?.email || user?.id || "anonim"
}
