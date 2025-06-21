import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import ActivityLog from '../ActivityLog'

// Mock fetch
global.fetch = jest.fn()
const mockFetch = fetch as jest.MockedFunction<typeof fetch>

describe('ActivityLog Component', () => {
  beforeEach(() => {
    mockFetch.mockClear()
  })

  const mockActivities = [
    {
      id: '1',
      tool_name: 'execute_dynamic_sql',
      success: true,
      created_at: '2025-06-20T10:00:00Z',
      user_id: '1',
      user_role: 'owner',
      parameters: JSON.stringify({ query: 'SELECT * FROM products' }),
      result: JSON.stringify({ success: true, data: [] }),
      execution_time_ms: 150
    },
    {
      id: '2',
      tool_name: 'send_email_notification',
      success: true,
      created_at: '2025-06-20T09:30:00Z',
      user_id: '2',
      user_role: 'admin',
      parameters: JSON.stringify({ to: 'test@example.com', subject: 'Test' }),
      result: JSON.stringify({ success: true, messageId: 'msg123' }),
      execution_time_ms: 500
    }
  ]

  it('renders activity log heading', () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ activities: [] })
    } as Response)

    render(<ActivityLog />)
    expect(screen.getByText('Recent Agent Activity')).toBeInTheDocument()
  })

  it('displays loading state initially', () => {
    mockFetch.mockImplementationOnce(() => new Promise(() => {})) // Never resolves

    render(<ActivityLog />)
    expect(screen.getByText('Loading activities...')).toBeInTheDocument()
  })

  it('fetches and displays activities', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ activities: mockActivities })
    } as Response)

    render(<ActivityLog />)

    await waitFor(() => {
      expect(screen.getByText('execute_dynamic_sql')).toBeInTheDocument()
      expect(screen.getByText('send_email_notification')).toBeInTheDocument()
    })
  })

  it('displays role badges correctly', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ activities: mockActivities })
    } as Response)

    render(<ActivityLog />)

    await waitFor(() => {
      expect(screen.getByText('owner')).toBeInTheDocument()
      expect(screen.getByText('admin')).toBeInTheDocument()
    })
  })

  it('shows success/failure indicators', async () => {
    const failedActivity = {
      ...mockActivities[0],
      id: '3',
      success: false
    }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ activities: [failedActivity] })
    } as Response)

    render(<ActivityLog />)

    await waitFor(() => {
      expect(screen.getByText('✗')).toBeInTheDocument() // Failed indicator
    })
  })

  it('displays execution time', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ activities: mockActivities })
    } as Response)

    render(<ActivityLog />)

    await waitFor(() => {
      expect(screen.getByText('150ms')).toBeInTheDocument()
      expect(screen.getByText('500ms')).toBeInTheDocument()
    })
  })

  it('can expand activity details', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ activities: mockActivities })
    } as Response)

    render(<ActivityLog />)

    await waitFor(() => {
      const expandButton = screen.getAllByText('View Details')[0]
      fireEvent.click(expandButton)
    })

    await waitFor(() => {
      expect(screen.getByText('Parameters:')).toBeInTheDocument()
      expect(screen.getByText('Result:')).toBeInTheDocument()
    })
  })

  it('handles filter changes', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ activities: mockActivities })
    } as Response)

    render(<ActivityLog />)

    await waitFor(() => {
      const filterSelect = screen.getByDisplayValue('All Tools')
      fireEvent.change(filterSelect, { target: { value: 'execute_dynamic_sql' } })
    })

    // Should still show the SQL activity
    expect(screen.getByText('execute_dynamic_sql')).toBeInTheDocument()
  })

  it('displays formatted timestamps', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ activities: mockActivities })
    } as Response)

    render(<ActivityLog />)

    await waitFor(() => {
      // Should show relative time format
      expect(screen.getByText(/ago/)).toBeInTheDocument()
    })
  })

  it('handles API errors gracefully', async () => {
    mockFetch.mockRejectedValueOnce(new Error('API Error'))

    render(<ActivityLog />)

    await waitFor(() => {
      expect(screen.getByText(/error loading activities/i)).toBeInTheDocument()
    })
  })

  it('refreshes data periodically', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ activities: [mockActivities[0]] })
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ activities: mockActivities })
      } as Response)

    render(<ActivityLog />)

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('execute_dynamic_sql')).toBeInTheDocument()
    })

    // Should refresh after polling interval
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(2)
    }, { timeout: 6000 })
  })

  it('shows empty state when no activities', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ activities: [] })
    } as Response)

    render(<ActivityLog />)

    await waitFor(() => {
      expect(screen.getByText('No recent activity')).toBeInTheDocument()
    })
  })
})