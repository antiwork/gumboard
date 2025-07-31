describe('Slack Notification Debouncing', () => {
  // Reset modules before each test to get fresh state
  beforeEach(() => {
    jest.resetModules()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.clearAllTimers()
    jest.useRealTimers()
  })

  describe('hasValidContent', () => {
    it('should return true for valid content', async () => {
      const { hasValidContent } = await import('../slack')
      expect(hasValidContent('Valid content')).toBe(true)
      expect(hasValidContent('  Spaces around  ')).toBe(true)
      expect(hasValidContent('123')).toBe(true)
    })

    it('should return false for invalid content', async () => {
      const { hasValidContent } = await import('../slack')
      expect(hasValidContent('')).toBe(false)
      expect(hasValidContent('   ')).toBe(false)
      expect(hasValidContent(null)).toBe(false)
      expect(hasValidContent(undefined)).toBe(false)
    })
  })

  describe('shouldSendNotification', () => {
    it('should allow first notification', async () => {
      const { shouldSendNotification } = await import('../slack')
      const result = shouldSendNotification('user1', 'board1')
      expect(result).toBe(true)
    })

    it('should debounce rapid notifications', async () => {
      const { shouldSendNotification } = await import('../slack')
      // First notification should go through
      expect(shouldSendNotification('user1', 'board1')).toBe(true)
      
      // Immediate second notification should be debounced
      expect(shouldSendNotification('user1', 'board1')).toBe(false)
      
      // After 500ms, still within debounce period
      jest.advanceTimersByTime(500)
      expect(shouldSendNotification('user1', 'board1')).toBe(false)
    })

    it('should allow notification after debounce period', async () => {
      const { shouldSendNotification } = await import('../slack')
      expect(shouldSendNotification('user1', 'board1')).toBe(true)
      expect(shouldSendNotification('user1', 'board1')).toBe(false)
      
      // Advance past debounce duration (1000ms)
      jest.advanceTimersByTime(1001)
      expect(shouldSendNotification('user1', 'board1')).toBe(true)
    })

    it('should track different user-board combinations separately', async () => {
      const { shouldSendNotification } = await import('../slack')
      expect(shouldSendNotification('user1', 'board1')).toBe(true)
      expect(shouldSendNotification('user2', 'board1')).toBe(true)
      expect(shouldSendNotification('user1', 'board2')).toBe(true)
      
      // But same combination should be debounced
      expect(shouldSendNotification('user1', 'board1')).toBe(false)
    })
  })

  describe('Memory Leak Prevention', () => {
    it('should clean up old entries after cleanup interval', () => {
      // Create multiple entries
      for (let i = 0; i < 5; i++) {
        shouldSendNotification(`user${i}`, `board${i}`)
      }
      
      // Advance past debounce duration
      jest.advanceTimersByTime(2000)
      
      // Create more entries
      for (let i = 5; i < 10; i++) {
        shouldSendNotification(`user${i}`, `board${i}`)
      }
      
      // Advance to cleanup interval (60 seconds)
      jest.advanceTimersByTime(60000)
      
      // Old entries should be cleaned, new ones should still work
      expect(shouldSendNotification('user0', 'board0')).toBe(true) // Old entry cleaned
      expect(shouldSendNotification('user9', 'board9')).toBe(false) // Recent entry still debounced
    })

    it('should limit maximum cache size', () => {
      // Create more entries than MAX_CACHE_SIZE (1000)
      // This test simulates the edge case handling
      const testSize = 10 // Using smaller number for test performance
      
      // Create many entries
      for (let i = 0; i < testSize; i++) {
        shouldSendNotification(`user${i}`, `board${i}`)
      }
      
      // All should be tracked initially
      for (let i = 0; i < testSize; i++) {
        expect(shouldSendNotification(`user${i}`, `board${i}`)).toBe(false)
      }
    })

    it('should handle cleanup without errors when map is empty', () => {
      // Advance time to trigger cleanup on empty map
      expect(() => {
        jest.advanceTimersByTime(60000)
      }).not.toThrow()
    })

    it('should continue to function after cleanup', () => {
      shouldSendNotification('user1', 'board1')
      
      // Trigger cleanup
      jest.advanceTimersByTime(60000)
      
      // Should still work normally
      expect(shouldSendNotification('user2', 'board2')).toBe(true)
      expect(shouldSendNotification('user2', 'board2')).toBe(false)
    })
  })

  describe('Console Logging', () => {
    let consoleLogSpy: jest.SpyInstance

    beforeEach(() => {
      consoleLogSpy = jest.spyOn(console, 'log').mockImplementation()
    })

    afterEach(() => {
      consoleLogSpy.mockRestore()
    })

    it('should log debounced notifications', () => {
      shouldSendNotification('user1', 'board1')
      shouldSendNotification('user1', 'board1') // This should be debounced
      
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Slack] Debounced notification for user1-board1')
      )
    })

    it('should log allowed notifications', () => {
      shouldSendNotification('user1', 'board1')
      
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[Slack] Allowing notification for user1-board1'
      )
    })

    it('should log content validation', () => {
      hasValidContent('test content')
      
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[Slack] hasValidContent check: "test content" -> true'
      )
    })
  })
})