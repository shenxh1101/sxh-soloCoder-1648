import app from './app.js'
import { seedDatabase } from './database/seed.js'
import schedulerService from './services/schedulerService.js'

const PORT = process.env.PORT || 5174

async function bootstrap() {
  try {
    console.log('[DB] Seeding database...')
    await seedDatabase()
    console.log('[DB] Database seeded successfully')
  } catch (err) {
    console.error('[DB] Seed failed:', err)
  }

  try {
    schedulerService.start()
    console.log('[Scheduler] Started')
  } catch (err) {
    console.error('[Scheduler] Start failed:', err)
  }

  const server = app.listen(PORT, () => {
    console.log(`[Server] Ready on port ${PORT}`)
    console.log(`[Server] Health: http://localhost:${PORT}/api/health`)
  })

  process.on('SIGTERM', () => {
    console.log('SIGTERM signal received')
    schedulerService.stop()
    server.close(() => {
      console.log('Server closed')
      process.exit(0)
    })
  })

  process.on('SIGINT', () => {
    console.log('SIGINT signal received')
    schedulerService.stop()
    server.close(() => {
      console.log('Server closed')
      process.exit(0)
    })
  })
}

bootstrap()

export default app
