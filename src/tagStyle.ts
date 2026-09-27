// Keep a label's ink color consistent across views and sorting changes.
export function tagTone(label: string) {
  let hash = 0
  for (const character of label) hash = (hash * 31 + character.codePointAt(0)!) >>> 0
  return ['sage', 'blue', 'rose', 'ochre', 'lavender'][hash % 5]
}
