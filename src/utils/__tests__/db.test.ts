import { getDb, initializeDatabase } from '../db'
import sqlite3 from 'sqlite3'
import { open } from 'sqlite'

// Mock sqlite
jest.mock('sqlite3')
jest.mock('sqlite')

const mockSqlite3 = sqlite3 as jest.Mocked<typeof sqlite3>
const mockOpen = open as jest.MockedFunction<typeof open>

describe('Database Utilities', () => {
  let mockDb: any

  beforeEach(() => {
    mockDb = {
      run: jest.fn().mockResolvedValue({ changes: 1, lastID: 1 }),
      get: jest.fn().mockResolvedValue({}),
      all: jest.fn().mockResolvedValue([]),
      close: jest.fn().mockResolvedValue(undefined),
      exec: jest.fn().mockResolvedValue(undefined)
    }

    mockOpen.mockResolvedValue(mockDb)
    jest.clearAllMocks()
  })

  describe('getDb', () => {
    it('opens database connection successfully', async () => {
      const db = await getDb()

      expect(mockOpen).toHaveBeenCalledWith({
        filename: expect.stringContaining('ronis_bakery.db'),
        driver: mockSqlite3.Database
      })
      expect(db).toBe(mockDb)
    })

    it('returns cached database instance on subsequent calls', async () => {
      const db1 = await getDb()
      const db2 = await getDb()

      expect(mockOpen).toHaveBeenCalledTimes(1)
      expect(db1).toBe(db2)
    })

    it('enables foreign keys and WAL mode', async () => {
      await getDb()

      expect(mockDb.exec).toHaveBeenCalledWith('PRAGMA foreign_keys = ON')
      expect(mockDb.exec).toHaveBeenCalledWith('PRAGMA journal_mode = WAL')
    })

    it('handles database connection errors', async () => {
      const error = new Error('Connection failed')
      mockOpen.mockRejectedValueOnce(error)

      await expect(getDb()).rejects.toThrow('Connection failed')
    })
  })

  describe('initializeDatabase', () => {
    it('creates all required tables', async () => {
      await initializeDatabase()

      // Should call exec for each table creation
      expect(mockDb.exec).toHaveBeenCalledWith(
        expect.stringContaining('CREATE TABLE IF NOT EXISTS tenants')
      )
      expect(mockDb.exec).toHaveBeenCalledWith(
        expect.stringContaining('CREATE TABLE IF NOT EXISTS users')
      )
      expect(mockDb.exec).toHaveBeenCalledWith(
        expect.stringContaining('CREATE TABLE IF NOT EXISTS products')
      )
    })

    it('creates indexes for performance', async () => {
      await initializeDatabase()

      expect(mockDb.exec).toHaveBeenCalledWith(
        expect.stringContaining('CREATE INDEX IF NOT EXISTS')
      )
    })

    it('inserts default data if tables are empty', async () => {
      // Mock empty tables
      mockDb.get.mockResolvedValue({ count: 0 })

      await initializeDatabase()

      // Should insert default tenants, users, etc.
      expect(mockDb.run).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO tenants'),
        expect.any(Array)
      )
    })

    it('skips data insertion if tables have data', async () => {
      // Mock non-empty tables
      mockDb.get.mockResolvedValue({ count: 5 })

      await initializeDatabase()

      // Should not insert data
      expect(mockDb.run).not.toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO tenants'),
        expect.any(Array)
      )
    })

    it('handles database initialization errors', async () => {
      const error = new Error('Initialization failed')
      mockDb.exec.mockRejectedValueOnce(error)

      await expect(initializeDatabase()).rejects.toThrow('Initialization failed')
    })

    it('creates email_logs table for agent notifications', async () => {
      await initializeDatabase()

      expect(mockDb.exec).toHaveBeenCalledWith(
        expect.stringContaining('CREATE TABLE IF NOT EXISTS email_logs')
      )
    })

    it('creates tool_usage_logs table for agent activity tracking', async () => {
      await initializeDatabase()

      expect(mockDb.exec).toHaveBeenCalledWith(
        expect.stringContaining('CREATE TABLE IF NOT EXISTS tool_usage_logs')
      )
    })

    it('creates all business tables', async () => {
      await initializeDatabase()

      const expectedTables = [
        'tenants',
        'users',
        'products',
        'suppliers',
        'purchase_orders',
        'order_items',
        'client_orders',
        'client_order_items',
        'delivery_drivers',
        'delivery_tracking',
        'email_logs',
        'tool_usage_logs'
      ]

      expectedTables.forEach(table => {
        expect(mockDb.exec).toHaveBeenCalledWith(
          expect.stringContaining(`CREATE TABLE IF NOT EXISTS ${table}`)
        )
      })
    })

    it('sets up proper foreign key constraints', async () => {
      await initializeDatabase()

      expect(mockDb.exec).toHaveBeenCalledWith(
        expect.stringContaining('FOREIGN KEY')
      )
    })

    it('creates proper indexes for query performance', async () => {
      await initializeDatabase()

      // Should create indexes on commonly queried columns
      expect(mockDb.exec).toHaveBeenCalledWith(
        expect.stringContaining('idx_users_email')
      )
      expect(mockDb.exec).toHaveBeenCalledWith(
        expect.stringContaining('idx_products_tenant')
      )
    })
  })

  describe('Database Schema', () => {
    it('creates users table with proper columns', async () => {
      await initializeDatabase()

      expect(mockDb.exec).toHaveBeenCalledWith(
        expect.stringMatching(/CREATE TABLE IF NOT EXISTS users[\s\S]*email TEXT UNIQUE NOT NULL/)
      )
      expect(mockDb.exec).toHaveBeenCalledWith(
        expect.stringMatching(/CREATE TABLE IF NOT EXISTS users[\s\S]*role TEXT NOT NULL/)
      )
      expect(mockDb.exec).toHaveBeenCalledWith(
        expect.stringMatching(/CREATE TABLE IF NOT EXISTS users[\s\S]*tenant_id INTEGER/)
      )
    })

    it('creates products table with inventory columns', async () => {
      await initializeDatabase()

      expect(mockDb.exec).toHaveBeenCalledWith(
        expect.stringMatching(/CREATE TABLE IF NOT EXISTS products[\s\S]*current_stock INTEGER/)
      )
      expect(mockDb.exec).toHaveBeenCalledWith(
        expect.stringMatching(/CREATE TABLE IF NOT EXISTS products[\s\S]*reorder_point INTEGER/)
      )
      expect(mockDb.exec).toHaveBeenCalledWith(
        expect.stringMatching(/CREATE TABLE IF NOT EXISTS products[\s\S]*price DECIMAL/)
      )
    })

    it('creates proper timestamp columns', async () => {
      await initializeDatabase()

      expect(mockDb.exec).toHaveBeenCalledWith(
        expect.stringMatching(/created_at DATETIME DEFAULT CURRENT_TIMESTAMP/)
      )
      expect(mockDb.exec).toHaveBeenCalledWith(
        expect.stringMatching(/updated_at DATETIME DEFAULT CURRENT_TIMESTAMP/)
      )
    })
  })
})