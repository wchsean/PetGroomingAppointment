export function formatDisplayName(name: string | null | undefined): string {
  if (!name) return 'Unnamed' // 空值處理

  return name
    .toLowerCase()
    .split(' ')
    .map(word => {
      const firstChar = word.charAt(0)
      return /[a-zA-Z]/.test(firstChar)
        ? firstChar.toUpperCase() + word.slice(1)
        : word
    })
    .join(' ')
}