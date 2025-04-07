import type { Request, Response, NextFunction } from "express"
import { initializeRedisClient } from "../utils/client.js"
import { restaurantKeyById } from "../utils/keys.js"
import { errorResponse } from "../utils/responses.js"

export const checkRestaurantExists = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { restaurantId } = req.params
  if (!restaurantId) {
    return errorResponse(res, 400, "Restaurant ID not found")
  }

  const client = await initializeRedisClient()
  const restaurantKey = restaurantKeyById(restaurantId)
  const restaurant = await client.exists(restaurantKey)

  if (!restaurant) {
    return errorResponse(res, 404, "Restaurant not found")
  }

  next()
}

// 50:53