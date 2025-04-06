import express from "express"
import restaurantsRouter from "./routes/restaurant.js"
import cuisinesRouter from "./routes/cuisines.js"
import { errorHandler } from "./middlewares/errorHandlers.js"

const PORT = process.env.PORT || 3000
const app = express()

// use JSON
app.use(express.json())
app.use("/restaurants", restaurantsRouter)
app.use("/cuisines", cuisinesRouter)

app.use(errorHandler)
app.listen(PORT, () => {
  console.log(`Application running on port ${PORT}`);
}).on("error", (error) => {
  throw new Error(error.message)
})