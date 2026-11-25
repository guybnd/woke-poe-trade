// What a captured beast does, for its tooltip: its Blood Altar recipes, from
// the table the Ctrl+Space search and a beast's price page already use
// (public/data/bestiary-data.json, built from poedb). Loaded on the first
// beast hover, so it costs startup nothing.
import { bestiaryData, loadBestiary } from '../../search/lookups/bestiary-load'
import { recipesWith, type BestiaryData } from '../../search/lookups/bestiary'

// "Modify Mods on an Item: Add a Suffix, Remove a Random Prefix", then each
// condition ("Only works on rare items"). poedb spells it "Modifer".
export function beastCraftLines (data: BestiaryData | null, beast: string): Array<{ text: string, recipe: boolean }> {
  return recipesWith(data, beast).flatMap(rec => [
    { text: `${rec.g.replace(/Modifer/g, 'Modifier')}: ${rec.r}`, recipe: true },
    ...(rec.n ?? []).map(text => ({ text, recipe: false }))
  ])
}

export async function beastCrafts (beast: string) {
  await loadBestiary()
  return beastCraftLines(bestiaryData.value, beast)
}
