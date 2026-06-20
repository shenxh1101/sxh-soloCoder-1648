import express, {
  type Request,
  type Response,
  type NextFunction,
} from 'express'
import cors from 'cors'
import path from 'path'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import authRoutes from './routes/auth.js'
import bookingRoutes from './routes/bookings.js'
import roomRoutes from './routes/rooms.js'
import deviceRoutes from './routes/devices.js'
import approvalRoutes from './routes/approvals.js'
import workOrderRoutes from './routes/workOrders.js'
import statisticsRoutes from './routes/statistics.js'
import userRoutes from './routes/users.js'
import maintenanceRoutes from './routes/maintenance.js'
import notificationRoutes from './routes/notifications.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config()

const app: express.Application = express()

app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

app.use('/api/auth', authRoutes)
app.use('/api/bookings', bookingRoutes)
app.use('/api/rooms', roomRoutes)
app.use('/api/devices', deviceRoutes)
app.use('/api/approvals', approvalRoutes)
app.use('/api/work-orders', workOrderRoutes)
app.use('/api/statistics', statisticsRoutes)
app.use('/api/users', userRoutes)
app.use('/api/maintenance', maintenanceRoutes)
app.use('/api/notifications', notificationRoutes)

app.use(
  '/api/health',
  (req: Request, res: Response, next: NextFunction): void => {
    res.status(200).json({
      code: 0,
      message: 'ok',
      data: { status: 'healthy', timestamp: Date.now() },
    })
  },
)

app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('[Server Error]', error)
  res.status(500).json({
    code: 500,
    message: error.message || 'Server internal error',
    data: null,
  })
})

app.use((req: Request, res: Response) => {
  res.status(404).json({
    code: 404,
    message: 'API not found',
    data: null,
  })
})

export default app
