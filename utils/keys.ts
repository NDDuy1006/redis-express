export function getKeyName(...args: string[]) {
  return `bites:${args.join(":")}`
}

export const restaurantKeyById = (id: string) => getKeyName("restaurant", id) // => bites:restaurant:restaurantId
export const reviewKeyById = (id: string) => getKeyName("reviews", id)
export const reviewDetailsKeyById = (id: string) => getKeyName("review_details", id)
export const cuisinesKey = getKeyName("cuisines") // => bite:cuisines
export const cuisineKey = (name: string) => getKeyName("cuisine", name) // => bite:cuisine:cuisineName
export const restaurantCuisinesKeyById = (id: string) => getKeyName("restaurant_cuisines", id)
export const restaurantsByRatingKey = getKeyName("restaurants_by_rating")
export const weatherKeyById = (id: string) => getKeyName("weather", id)



/*
  restaurantKeyById = Redis Keys are essentially the unique identifier for storing and retrieving data in Redis

  Directly using the restaurant ID from the URL params is risky and too ambiguous in a multi-entity app like this

  Redis is a key-value store, we're often storing lots of different things: restaurants, users, menus, carts... Just using restaurant ID from the URL param could clash with other keys (e.g., user with identical ID)

  reviewKeyById: used to get a list of reviews corresponding to a restaurant by its ID

  Sets in Redis are unique strings, unorderedd collection
*/

/*
  bites:cuisine:French =/= bites:cuisines
*/