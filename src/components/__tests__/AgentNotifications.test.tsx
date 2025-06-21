import { render, screen, waitFor, act } from '@testing-library/react'
import AgentNotifications from '../AgentNotifications'

// Mock fetch
global.fetch = jest.fn()
const mockFetch = fetch as jest.MockedFunction<typeof fetch>

describe('AgentNotifications Component', () => {
  beforeEach(() => {
    mockFetch.mockClear()
    jest.clearAllTimers()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.runOnlyPendingTimers()
    jest.useRealTimers()
  })

  const mockChanges = [
    {
      table_name: 'products',
      change_type: 'insert',
      last_modified: '2025-06-20T10:00:00Z',
      affected_rows: 1,
      tool_name: 'execute_dynamic_sql'
    },
    {
      table_name: 'email_logs',
      change_type: 'insert',
      last_modified: '2025-06-20T10:01:00Z',
      affected_rows: 1,
      tool_name: 'send_email_notification'
    }
  ]

  it('renders without crashing', () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ changes: [], summary: { total_changes: 0 } })
    } as Response)

    render(<AgentNotifications />)
    // Component should render without visible content initially
    expect(document.querySelector('.agent-notifications')).toBeInTheDocument()
  })

  it('displays notifications for new database changes', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        changes: mockChanges,
        summary: { total_changes: 2 }
      })
    } as Response)

    render(<AgentNotifications />)

    await act(async () => {
      jest.advanceTimersByTime(1000) // Trigger initial check
    })

    await waitFor(() => {
      expect(screen.getByText(/Agent updated products table/)).toBeInTheDocument()
      expect(screen.getByText(/Agent sent email notification/)).toBeInTheDocument()
    })
  })

  it('shows role badges in notifications', async () => {
    const changesWithRole = [{
      ...mockChanges[0],
      user_role: 'owner'
    }]

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        changes: changesWithRole,
        summary: { total_changes: 1 }
      })
    } as Response)

    render(<AgentNotifications />)

    await act(async () => {
      jest.advanceTimersByTime(1000)
    })

    await waitFor(() => {
      expect(screen.getByText('owner')).toBeInTheDocument()
    })
  })

  it('auto-hides notifications after timeout', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        changes: [mockChanges[0]],
        summary: { total_changes: 1 }
      })
    } as Response)

    render(<AgentNotifications />)

    await act(async () => {
      jest.advanceTimersByTime(1000)
    })

    await waitFor(() => {
      expect(screen.getByText(/Agent updated products table/)).toBeInTheDocument()
    })

    // Fast forward past auto-hide timeout (10 seconds)
    act(() => {
      jest.advanceTimersByTime(11000)
    })

    await waitFor(() => {
      expect(screen.queryByText(/Agent updated products table/)).not.toBeInTheDocument()
    })
  })

  it('handles different change types correctly', async () => {
    const differentChanges = [
      { ...mockChanges[0], change_type: 'update', table_name: 'users' },
      { ...mockChanges[0], change_type: 'delete', table_name: 'orders' }
    ]

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        changes: differentChanges,
        summary: { total_changes: 2 }
      })
    } as Response)

    render(<AgentNotifications />)

    await act(async () => {
      jest.advanceTimersByTime(1000)
    })

    await waitFor(() => {
      expect(screen.getByText(/Agent updated users table/)).toBeInTheDocument()
      expect(screen.getByText(/Agent deleted from orders table/)).toBeInTheDocument()
    })
  })

  it('displays affected rows count', async () => {
    const changesWithMultipleRows = [{
      ...mockChanges[0],
      affected_rows: 5
    }]

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        changes: changesWithMultipleRows,
        summary: { total_changes: 1 }
      })
    } as Response)

    render(<AgentNotifications />)

    await act(async () => {
      jest.advanceTimersByTime(1000)
    })

    await waitFor(() => {
      expect(screen.getByText(/5 rows/)).toBeInTheDocument()
    })
  })

  it('polls for changes periodically', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ changes: [], summary: { total_changes: 0 } })
    } as Response)

    render(<AgentNotifications />)

    // Initial call
    await act(async () => {
      jest.advanceTimersByTime(1000)
    })

    expect(mockFetch).toHaveBeenCalledTimes(1)

    // Second call after polling interval (5 seconds)
    await act(async () => {
      jest.advanceTimersByTime(5000)
    })

    expect(mockFetch).toHaveBeenCalledTimes(2)
  })

  it('handles API errors gracefully', async () => {
    mockFetch.mockRejectedValueOnce(new Error('API Error'))

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

    render(<AgentNotifications />)

    await act(async () => {
      jest.advanceTimersByTime(1000)
    })

    expect(consoleSpy).toHaveBeenCalledWith('Error checking for database changes:', expect.any(Error))
    
    consoleSpy.mockRestore()
  })

  it('prevents duplicate notifications', async () => {
    // First call returns changes
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        changes: [mockChanges[0]],
        summary: { total_changes: 1 }
      })
    } as Response)

    // Second call returns same changes
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        changes: [mockChanges[0]],
        summary: { total_changes: 1 }
      })
    } as Response)

    render(<AgentNotifications />)

    await act(async () => {
      jest.advanceTimersByTime(1000)
    })

    await waitFor(() => {
      expect(screen.getByText(/Agent updated products table/)).toBeInTheDocument()
    })

    // Second polling cycle
    await act(async () => {
      jest.advanceTimersByTime(5000)
    })

    // Should not show duplicate notification
    expect(screen.getAllByText(/Agent updated products table/)).toHaveLength(1)
  })

  it('formats timestamps correctly', async () => {
    const recentChange = {
      ...mockChanges[0],
      last_modified: new Date().toISOString()
    }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        changes: [recentChange],
        summary: { total_changes: 1 }
      })
    } as Response)

    render(<AgentNotifications />)

    await act(async () => {
      jest.advanceTimersByTime(1000)
    })

    await waitFor(() => {
      expect(screen.getByText(/just now|seconds ago/)).toBeInTheDocument()
    })
  })
})