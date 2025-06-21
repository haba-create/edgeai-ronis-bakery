import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ChatBot from '../ChatBot'

// Mock fetch
global.fetch = jest.fn()

const mockFetch = fetch as jest.MockedFunction<typeof fetch>

describe('ChatBot Component', () => {
  beforeEach(() => {
    mockFetch.mockClear()
  })

  const defaultProps = {
    role: 'owner' as const,
    agentEndpoint: '/api/owner-agent',
    title: 'Owner Assistant',
  }

  it('renders correctly with title', () => {
    render(<ChatBot {...defaultProps} />)
    expect(screen.getByText('Owner Assistant')).toBeInTheDocument()
  })

  it('shows initial message input', () => {
    render(<ChatBot {...defaultProps} />)
    expect(screen.getByPlaceholderText(/ask me anything/i)).toBeInTheDocument()
  })

  it('displays minimize and maximize buttons', () => {
    render(<ChatBot {...defaultProps} />)
    expect(screen.getByText('−')).toBeInTheDocument() // minimize button
  })

  it('can be minimized and maximized', async () => {
    render(<ChatBot {...defaultProps} />)
    
    const minimizeButton = screen.getByText('−')
    fireEvent.click(minimizeButton)
    
    await waitFor(() => {
      expect(screen.queryByPlaceholderText(/ask me anything/i)).not.toBeInTheDocument()
    })
    
    const maximizeButton = screen.getByText('+')
    fireEvent.click(maximizeButton)
    
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/ask me anything/i)).toBeInTheDocument()
    })
  })

  it('sends message when form is submitted', async () => {
    const user = userEvent.setup()
    
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        response: 'Test response',
        toolCalls: [],
        metadata: { role: 'owner' }
      })
    } as Response)

    render(<ChatBot {...defaultProps} />)
    
    const input = screen.getByPlaceholderText(/ask me anything/i)
    const sendButton = screen.getByText('Send')
    
    await user.type(input, 'Test message')
    fireEvent.click(sendButton)
    
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        defaultProps.agentEndpoint,
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: 'Test message', role: 'owner' })
        })
      )
    })
  })

  it('displays loading state while sending message', async () => {
    const user = userEvent.setup()
    
    // Mock a delayed response
    mockFetch.mockImplementationOnce(() => 
      new Promise(resolve => setTimeout(() => resolve({
        ok: true,
        json: async () => ({ response: 'Test response', toolCalls: [], metadata: {} })
      } as Response), 100))
    )

    render(<ChatBot {...defaultProps} />)
    
    const input = screen.getByPlaceholderText(/ask me anything/i)
    await user.type(input, 'Test message')
    fireEvent.click(screen.getByText('Send'))
    
    // Check for loading indicator
    expect(screen.getByText('Sending...')).toBeInTheDocument()
  })

  it('displays error message when API fails', async () => {
    const user = userEvent.setup()
    
    mockFetch.mockRejectedValueOnce(new Error('API Error'))

    render(<ChatBot {...defaultProps} />)
    
    const input = screen.getByPlaceholderText(/ask me anything/i)
    await user.type(input, 'Test message')
    fireEvent.click(screen.getByText('Send'))
    
    await waitFor(() => {
      expect(screen.getByText(/error sending message/i)).toBeInTheDocument()
    })
  })

  it('displays chat messages correctly', async () => {
    const user = userEvent.setup()
    
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        response: 'AI Response',
        toolCalls: [],
        metadata: { role: 'owner' }
      })
    } as Response)

    render(<ChatBot {...defaultProps} />)
    
    const input = screen.getByPlaceholderText(/ask me anything/i)
    await user.type(input, 'User message')
    fireEvent.click(screen.getByText('Send'))
    
    await waitFor(() => {
      expect(screen.getByText('User message')).toBeInTheDocument()
      expect(screen.getByText('AI Response')).toBeInTheDocument()
    })
  })

  it('clears input after sending message', async () => {
    const user = userEvent.setup()
    
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        response: 'Test response',
        toolCalls: [],
        metadata: { role: 'owner' }
      })
    } as Response)

    render(<ChatBot {...defaultProps} />)
    
    const input = screen.getByPlaceholderText(/ask me anything/i) as HTMLInputElement
    await user.type(input, 'Test message')
    fireEvent.click(screen.getByText('Send'))
    
    await waitFor(() => {
      expect(input.value).toBe('')
    })
  })

  it('handles different roles correctly', () => {
    const adminProps = { ...defaultProps, role: 'admin' as const, title: 'Admin Assistant' }
    render(<ChatBot {...adminProps} />)
    expect(screen.getByText('Admin Assistant')).toBeInTheDocument()
  })

  it('prevents empty message submission', async () => {
    render(<ChatBot {...defaultProps} />)
    
    const sendButton = screen.getByText('Send')
    fireEvent.click(sendButton)
    
    expect(mockFetch).not.toHaveBeenCalled()
  })
})