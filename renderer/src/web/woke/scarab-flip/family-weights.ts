// Drop weights for the other flip families, from PoeData.dev's Bayesian
// calculations (poedata.dev), generated from each family's
// data/<family>/calculations/bayesian.json. Relative weights within a family.

// Patch 3.25.0. Calculated item weights for Catalysts using BAYESIAN method from 6 datasets.
export const CATALYST_WEIGHTS: Record<string, number> = {
  'Abrasive Catalyst': 0.14403,
  'Accelerating Catalyst': 0.014914,
  'Fertile Catalyst': 0.035128,
  'Imbued Catalyst': 0.14209,
  'Intrinsic Catalyst': 0.28835,
  'Noxious Catalyst': 0.14305,
  'Prismatic Catalyst': 0.034007,
  'Tempering Catalyst': 0.032997,
  'Turbulent Catalyst': 0.15105,
  'Unstable Catalyst': 0.0144
}

// Patch 3.22.0. Calculated item weights for Delirium Orbs using BAYESIAN method from 5 datasets.
export const DELIRIUM_WEIGHTS: Record<string, number> = {
  'Abyssal Delirium Orb': 0.030211,
  "Armoursmith's Delirium Orb": 0.12239,
  "Blacksmith's Delirium Orb": 0.11569,
  'Blighted Delirium Orb': 0.032788,
  "Cartographer's Delirium Orb": 0.029854,
  "Diviner's Delirium Orb": 0.058411,
  'Fine Delirium Orb': 0.12635,
  'Fossilised Delirium Orb': 0.033023,
  'Fragmented Delirium Orb': 0.030608,
  "Jeweller's Delirium Orb": 0.10164,
  'Obscured Delirium Orb': 0.01747,
  'Singular Delirium Orb': 0.024527,
  'Skittering Delirium Orb': 0.035405,
  "Thaumaturge's Delirium Orb": 0.028411,
  'Timeless Delirium Orb': 0.02851,
  'Whispering Delirium Orb': 0.050956,
  'Imperial Delirium Orb': 0.052327
}

// Patch 3.19.0. Calculated item weights for Fossils using BAYESIAN method from 9 datasets.
export const FOSSIL_WEIGHTS: Record<string, number> = {
  'Aberrant Fossil': 0.10568,
  'Aetheric Fossil': 0.02466,
  'Bloodstained Fossil': 0.00083993,
  'Bound Fossil': 0.020665,
  'Corroded Fossil': 0.022182,
  'Deft Fossil': 0.022545,
  'Dense Fossil': 0.10766,
  'Faceted Fossil': 0.00087601,
  'Fractured Fossil': 0.0013165,
  'Frigid Fossil': 0.10189,
  'Fundamental Fossil': 0.021471,
  'Gilded Fossil': 0.0025905,
  'Glyphic Fossil': 0.0010975,
  'Hollow Fossil': 0.0016703,
  'Jagged Fossil': 0.11438,
  'Lucent Fossil': 0.021891,
  'Metallic Fossil': 0.11374,
  'Opulent Fossil': 0.0034039,
  'Prismatic Fossil': 0.020641,
  'Pristine Fossil': 0.11752,
  'Sanctified Fossil': 0.00067183,
  'Scorched Fossil': 0.10242,
  'Serrated Fossil': 0.023604,
  'Shuddering Fossil': 0.02646,
  'Tangled Fossil': 0.0021763
}

// Patch 3.20.0. Calculated item weights for Essences using BAYESIAN method from 1 dataset.
export const DEAFENING_ESSENCE_WEIGHTS: Record<string, number> = {
  'Deafening Essence of Anger': 0.049908,
  'Deafening Essence of Anguish': 0.058716,
  'Deafening Essence of Contempt': 0.048767,
  'Deafening Essence of Dread': 0.046211,
  'Deafening Essence of Envy': 0.049584,
  'Deafening Essence of Fear': 0.057418,
  'Deafening Essence of Greed': 0.050335,
  'Deafening Essence of Hatred': 0.059749,
  'Deafening Essence of Loathing': 0.056913,
  'Deafening Essence of Misery': 0.051006,
  'Deafening Essence of Rage': 0.055791,
  'Deafening Essence of Scorn': 0.052403,
  'Deafening Essence of Sorrow': 0.048253,
  'Deafening Essence of Spite': 0.048866,
  'Deafening Essence of Suffering': 0.051522,
  'Deafening Essence of Torment': 0.054748,
  'Deafening Essence of Woe': 0.064672,
  'Deafening Essence of Wrath': 0.045023,
  'Deafening Essence of Zeal': 0.050114
}

// Patch 3.27.0. Calculated item weights for Runegrafts using BAYESIAN method from 1 dataset.
export const RUNEGRAFT_WEIGHTS: Record<string, number> = {
  'Runegraft of Bellows': 0.08058,
  'Runegraft of Blasphemy': 0.079075,
  'Runegraft of Gemcraft': 0.0053892,
  'Runegraft of Loyalty': 0.028324,
  'Runegraft of Quaffing': 0.076199,
  'Runegraft of Refraction': 0.054237,
  'Runegraft of Restitching': 0.07491,
  'Runegraft of Stability': 0.0024055,
  'Runegraft of Time': 0.024126,
  'Runegraft of Treachery': 0.053611,
  'Runegraft of the Bound': 0.059394,
  'Runegraft of the Combatant': 0.074241,
  'Runegraft of the Fortress': 0.05402,
  'Runegraft of the Jeweller': 0.08276,
  'Runegraft of the Novamark': 0.049366,
  'Runegraft of the River': 0.078234,
  'Runegraft of the Sinistral': 0.083391,
  'Runegraft of the Soulwick': 0.0083963,
  // In the sample's list, but it never came up.
  'Runegraft of the Angler': 0,
  'Runegraft of the Warp': 0.027064,
  'Runegraft of the Witchmark': 0.0042755
}
