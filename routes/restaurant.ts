import express, { type Request } from "express"
import { validate } from "../middlewares/validate.js"
import { RestaurantSchema, type Restaurant } from "../schemas/restaurant.js"
import { initializeRedisClient } from "../utils/client.js"
import { nanoid } from "nanoid"
import { restaurantKeyById } from "../utils/keys.js"
import { successResponse } from "../utils/responses.js"
import { checkRestaurantExists } from "../middlewares/checkRestaurantId.js"

const router = express.Router()

router.post("/", validate(RestaurantSchema), async (req, res, next) => {
  const data = req.body as Restaurant
  try {
    const client = await initializeRedisClient()
    const id = nanoid()
    const restaurantKey = restaurantKeyById(id)
    const hashData = { id, name: data.name, location: data.location }
    const addResult = await client.hSet(restaurantKey, hashData)
    console.log(`Added ${addResult} fields`);
    return successResponse(res, hashData, "Added new restaurant")
  } catch (error) {
    next(error)
  }
  res.send("Hello World")
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
      const [viewCount, restaurant] = await Promise.all([
        client.hIncrBy(restaurantKey, "viewCount", 1),
        client.hGetAll(restaurantKey)
      ])
      return successResponse(res, restaurant)
    } catch (error) {
      next(error)
    }
  }
)

export default router

// Promise.all allows us to execute multiple asynchronous operations concurrently, improves performance by making requests run in parallel