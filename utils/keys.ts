export function getKeyName(...args: string[]) {
  return `bites:${args.join(":")}`
}

export const restaurantKeyById = (id: string) => getKeyName("restaurant", id)
export const reviewKeyById = (id: string) => getKeyName("reviews", id)
export const reviewDetailsKeyById = (id: string) => getKeyName("review_details", id)
export const cuisinesKey = getKeyName("cuisines")
export const cuisineKey = (name: string) => getKeyName("cuisine", name)
export const restaurantCuisinesKeyById = (id: string) => getKeyName("restaurant_cuisines", id)



/*
  restaurantKeyById = Redis Keys are essentially the unique identifier for storing and retrieving data in Redis

  Directly using the restaurant ID from the URL params is risky and too ambiguous in a multi-entity app like this

  Redis is a key-value store, we're often storing lots of different things: restaurants, users, menus, carts... Just using restaurant ID from the URL param could clash with other keys (e.g., user with identical ID)

  reviewKeyById: used to get a list of reviews corresponding to a restaurant by its ID

  Sets in Redis are unique strings, unorderedd collection

  cuisinesKey: list of non-identical cuisines
  cuisineKey: list of non-identical cuisines, each cuisine correspond to multiple restaurant IDs
  restaurantCuisinesKeyById: used to get a set of cuisines that is available in a restaurant
*/