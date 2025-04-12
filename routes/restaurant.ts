import express, { type Request } from "express"
import { validate } from "../middlewares/validate.js"
import { RestaurantDetailsSchema, RestaurantSchema, type Restaurant } from "../schemas/restaurant.js"
import { initializeRedisClient } from "../utils/client.js"
import { nanoid } from "nanoid"
import { cuisineKey, cuisinesKey, restaurantCuisinesKeyById, restaurantDetailsKeyById, restaurantKeyById, restaurantsByRatingKey, reviewDetailsKeyById, reviewKeyById, weatherKeyById } from "../utils/keys.js"
import { errorResponse, successResponse } from "../utils/responses.js"
import { checkRestaurantExists } from "../middlewares/checkRestaurantId.js"
import { ReviewSchema, type Review } from "../schemas/review.js"

const router = express.Router()

// Get paginated list of restaurants sorted by ratings
router.get("/", async (req, res, next) => {
  const { page = 1, limit = 10 } = req.query
  const start = (Number(page) - 1) * Number(limit)
  const end = start + Number(limit)

  try {
    const client = await initializeRedisClient()
    const restaurantIds = await client.zRange(
      restaurantsByRatingKey,
      start,
      end,
      {REV: true}
    )
    const restaurants = await Promise.all(
      restaurantIds.map(id => client.hGetAll(restaurantKeyById(id)))
    )

    return successResponse(res, restaurants)
  } catch (error) {
    next(error)
  }
})

router.post("/", validate(RestaurantSchema), async (req, res, next) => {
  const data = req.body as Restaurant
  try {
    const client = await initializeRedisClient()
    const id = nanoid()
    const restaurantKey = restaurantKeyById(id)
    const hashData = { id, name: data.name, location: data.location }
    await Promise.all([
      ...data.cuisines.map((cuisine) => {
        Promise.all([
          client.sAdd(cuisinesKey, cuisine),
          client.sAdd(cuisineKey(cuisine), id),
          client.sAdd(restaurantCuisinesKeyById(id), cuisine)
        ])
      }),
      client.hSet(restaurantKey, hashData),
      client.zAdd(restaurantsByRatingKey, {
        score: 0,
        value: id
      })
    ])
    return successResponse(res, hashData, "Added new restaurant")
  } catch (error) {
    next(error)
  }
  res.send("Hello World")
})

router.get("/:restaurantId/weather", checkRestaurantExists, async (req: Request<{restaurantId: string}>, res, next) => {
  const { restaurantId } = req.params

  try {
    const client = await initializeRedisClient()
    const weatherKey = weatherKeyById(restaurantId)
    // check if the weather data is cached in Redis
    const cachedWeather = await client.get(weatherKey)
    if (cachedWeather) {
      console.log("Cache Hit");
      // return the cached weather data
      return successResponse(res, JSON.parse(cachedWeather))
    }
    const restaurantKey = restaurantKeyById(restaurantId)
    const coordinates = await client.hGet(restaurantKey, "location")
    if (!coordinates) {
      return errorResponse(res, 404, "Coordinates have not been found")
    }
    const [lng, lat] = coordinates.split(",")
    const apiResponse = await fetch(`https://api.openweathermap.org/data/2.5/weather?units=imperial&lat=${lat}&lon=${lng}&appid=${process.env.WEATHER_API_KEY}`)
    if (apiResponse.status == 200) {
      const json = await apiResponse.json()

      // Set(cache) new weather data in Redis
      await client.set(weatherKey, JSON.stringify(json), {
        EX: 60 * 60
      })
      return successResponse(res, json)
    }
    return errorResponse(res, 500, "Could not fetch weather info")
  } catch (error) {
    next(error)
  }
})

// cache restaurant details in JSON format
router.post(
  "/:restaurantId/details",
  checkRestaurantExists,
  validate(RestaurantDetailsSchema),
  async (req: Request<{restaurantId: string}>, res, next) => {
    const { restaurantId } = req.params
    const data = req.body as Restaurant

    try {
      const client = await initializeRedisClient()
      const restaurantDetailsKey = restaurantDetailsKeyById(restaurantId)
      await client.json.set(restaurantDetailsKey, ".", data)
      return successResponse(res, {}, "Restaurant details added")
    } catch (error) {
      next(error)
    }
  }
)

router.get(
  "/:restaurantId/details",
  checkRestaurantExists,
  async (req: Request<{restaurantId: string}>, res, next) => {
    const { restaurantId } = req.params
    const data = req.body as Restaurant

    try {
      const client = await initializeRedisClient()
      const restaurantDetailsKey = restaurantDetailsKeyById(restaurantId)
      const details = await client.json.get(restaurantDetailsKey)
      return successResponse(res, details, "Restaurant details added")
    } catch (error) {
      next(error)
    }
  }
)

router.post(
  "/:restaurantId/reviews",
  checkRestaurantExists,
  validate(ReviewSchema),
  async (req: Request<{restaurantId: string}>, res, next) => {
    const { restaurantId } = req.params
    const data = req.body as Review
    try {
      const client = await initializeRedisClient()
      const reviewId = nanoid()
      const reviewKey = reviewKeyById(restaurantId)
      const reviewDetailsKey = reviewDetailsKeyById(reviewId)
      const restaurantKey = restaurantKeyById(restaurantId)
      const reviewData = { id: reviewId, ...data, timestamp: Date.now(), restaurantId }
      const [reviewCount, setResult, totalStars] = await Promise.all([
        client.lPush(reviewKey, reviewId), // returns reviewCount
        client.hSet(reviewDetailsKey, reviewData), // returns setResult
        client.hIncrByFloat( // returns totalStars
          restaurantKey,
          "totalStars",
          data.rating
        )
      ])

      const averageRating = Number((totalStars / reviewCount).toFixed(1))
      await Promise.all([
        client.zAdd(restaurantsByRatingKey, {
          score: averageRating,
          value: restaurantId
        }),
        client.hSet(restaurantKey, "avgStars", averageRating)
      ])
      // 1:33

      return successResponse(res, reviewData, "Review added")
    } catch (error) {
      next(error)
    }
  }
)

router.get("/:restaurantId/reviews", checkRestaurantExists, async (req: Request<{restaurantId: string}>, res, next) => {
  const { restaurantId } = req.params
  const { page = 1, limit = 10 } = req.query
  const start = (Number(page) - 1) * Number(limit)
  const end = start + Number(limit) - 1

  try {
    const client = await initializeRedisClient()
    const reviewKey = reviewKeyById(restaurantId)
    const reviewIds = await client.lRange(reviewKey, start, end)
     
    const reviews = await Promise.all(
      reviewIds.map(
        id => client.hGetAll(reviewDetailsKeyById(id))
      )
    )

    return successResponse(res, reviews)
  } catch (error) {
    next(error)
  }
})

router.delete(
  "/:restaurantId/reviews/:reviewId",
  checkRestaurantExists,
  async (req: Request<{ restaurantId: string, reviewId: string }>, res, next) => {
    const { restaurantId, reviewId } = req.params

    try {
      const client = await initializeRedisClient()
      const reviewKey = reviewKeyById(restaurantId)
      const reviewDetailsKey = reviewDetailsKeyById(reviewId)
      const [removeResult, deleteResult] = await Promise.all([
        client.lRem(reviewKey, 0, reviewId),
        client.del(reviewDetailsKey)
      ])

      if (removeResult === 0 && deleteResult === 0) {
        return errorResponse(res, 404, "Review not found")
      }

      return successResponse(res, reviewId, "Review deleted")
    } catch (error) {
      next(error)
    }
  })

router.get(
  "/:restaurantId",
  checkRestaurantExists,
  async (req: Request<{ restaurantId: string }>, res, next) => {
    const { restaurantId } = req.params
    try {
      const client = await initializeRedisClient()
      const restaurantKey = restaurantKeyById(restaurantId)
      // viewCount = show the counts for each time users request to view a specific restaurant
      const [viewCount, restaurant, cuisines] = await Promise.all([
        client.hIncrBy(restaurantKey, "viewCount", 1),
        client.hGetAll(restaurantKey),
        client.sMembers(restaurantCuisinesKeyById(restaurantId))
      ])
      return successResponse(res, { ...restaurant, cuisines })
    } catch (error) {
      next(error)
    }
  }
)

export default router

// Promise.all allows us to execute multiple asynchronous operations concurrently, improves performance by making requests run in parallel