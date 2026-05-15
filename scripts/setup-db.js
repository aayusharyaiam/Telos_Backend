import 'dotenv/config'
import { execSync } from 'child_process'
import { URL } from 'url'
import { Client } from 'pg'

async function ensurePostgresDatabase(dbUrl) {
  try {
    const url = new URL(dbUrl)
    const dbName = url.pathname.replace(/^\//, '')
    const host = url.hostname
    const port = url.port ? Number(url.port) : 5432
    const user = url.username
    const password = url.password

    const adminClient = new Client({
      host,
      port,
      user,
      password,
      database: 'postgres',
      ssl: url.searchParams.get('sslmode') === 'require' ? { rejectUnauthorized: false } : undefined,
    })

    await adminClient.connect()
    const exists = await adminClient.query('SELECT 1 FROM pg_database WHERE datname=$1', [dbName])
    if (exists.rowCount === 0) {
      console.log(`Database "${dbName}" not found — creating it.`)
      await adminClient.query(`CREATE DATABASE \"${dbName}\"
        WITH OWNER = \"${user}\"`)
    } else {
      console.log(`Database "${dbName}" already exists.`)
    }
    await adminClient.end()
  } catch (err) {
    console.error('Could not ensure Postgres database exists:', err.message)
    throw err
  }
}

async function main() {
  const dbUrl = process.env.DATABASE_URL
  if (!dbUrl) {
    console.error('DATABASE_URL is not set. Please populate .env (see .env.example) and re-run `npm run setup`.')
    process.exit(1)
  }

  try {
    await ensurePostgresDatabase(dbUrl)
  } catch (err) {
    console.warn('Continuing to attempt Prisma commands even though DB creation failed.')
  }

  try {
    console.log('Generating Prisma client...')
    execSync('npx prisma generate --schema=src/prisma/schema.prisma', { stdio: 'inherit' })

    console.log('Pushing Prisma schema to database...')
    execSync('npx prisma db push --schema=src/prisma/schema.prisma', { stdio: 'inherit' })

    console.log('Running seed script...')
    execSync('node prisma/seed.js', { stdio: 'inherit' })

    console.log('Setup complete.')
  } catch (err) {
    console.error('Setup failed:', err.message)
    process.exit(1)
  }
}

main()
