import { createClient, type RedisClientType } from "redis"

let client: RedisClientType | null = null

export async function initializeRedisClient() {
  if (!client) {
    client = createClient()
    client.on("error", (error) => {
      console.log("Nope");
      console.error(error)
    })
    client.on("connect", () => {
      console.log("Redis connected");
    })
    await client.connect()
  }

  return client
}