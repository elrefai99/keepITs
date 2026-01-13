import './config/dotenv.config'
import express, { Request, Response } from 'express'
import { mongoDBConfig } from './config/mongoDB.config';

const app = express()





app.use(async (_req: Request, res: Response) => {
     res.status(404).send('This is not the API route you are looking for')
})
const PORT: number = Number(process.env.PORT) || 9999
app.listen(PORT, () => {
     mongoDBConfig()
     console.log("🌐 Server is running on:", process.env.NODE_ENV === "development" ? String(process.env.SITE_API_Local_URL) : String(process.env.SITE_API_URL))
})
export default app;
