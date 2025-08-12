import { OpenAIAgent } from '../openai';

// Mock OpenAI
jest.mock('openai', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: jest.fn(),
        },
      },
    })),
  };
});

describe('OpenAIAgent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create agent with API key', () => {
      const agent = new OpenAIAgent('test-api-key');
      expect(agent.isConfigured()).toBe(true);
    });

    it('should create agent without API key', () => {
      const agent = new OpenAIAgent();
      expect(agent.isConfigured()).toBe(false);
    });
  });

  describe('isConfigured', () => {
    it('should return true when API key is provided', () => {
      const agent = new OpenAIAgent('test-api-key');
      expect(agent.isConfigured()).toBe(true);
    });

    it('should return false when no API key is provided', () => {
      const agent = new OpenAIAgent();
      expect(agent.isConfigured()).toBe(false);
    });
  });

  describe('processNoteContent', () => {
    it('should throw error when not configured', async () => {
      const agent = new OpenAIAgent();
      await expect(agent.processNoteContent('test content')).rejects.toThrow(
        'OpenAI API key not configured'
      );
    });

    it('should process content successfully when configured', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                message: 'Generated 2 tasks',
                tasks: [
                  { content: 'Task 1', status: 'pending', priority: 'high' },
                  { content: 'Task 2', status: 'pending', priority: 'medium' },
                ],
              }),
            },
          },
        ],
      };

      const OpenAI = jest.requireActual('openai').default;
      const mockCreate = jest.fn().mockResolvedValue(mockResponse);
      OpenAI.mockImplementation(() => ({
        chat: {
          completions: {
            create: mockCreate,
          },
        },
      }));

      const agent = new OpenAIAgent('test-api-key');
      const result = await agent.processNoteContent('Learn React');

      expect(mockCreate).toHaveBeenCalledWith({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: expect.stringContaining('You are an intelligent task generation assistant'),
          },
          {
            role: 'user',
            content: 'Generate actionable tasks for: Learn React',
          },
        ],
        temperature: 0.7,
        response_format: { type: 'json_object' },
      });

      expect(result.message).toBe('Generated 2 tasks');
      expect(result.tasks).toHaveLength(2);
      expect(result.tasks[0].content).toBe('Task 1');
    });

    it('should handle API errors gracefully', async () => {
      const OpenAI = jest.requireActual('openai').default;
      const mockCreate = jest.fn().mockRejectedValue(new Error('API Error'));
      OpenAI.mockImplementation(() => ({
        chat: {
          completions: {
            create: mockCreate,
          },
        },
      }));

      const agent = new OpenAIAgent('test-api-key');
      await expect(agent.processNoteContent('test content')).rejects.toThrow(
        'Failed to process with AI agent'
      );
    });
  });

  describe('generateTodoList', () => {
    it('should throw error when not configured', async () => {
      const agent = new OpenAIAgent();
      await expect(agent.generateTodoList('test input')).rejects.toThrow(
        'OpenAI API key not configured'
      );
    });

    it('should generate todo list successfully when configured', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                tasks: [
                  { id: '1', content: 'Task 1', status: 'pending', priority: 'high' },
                  { id: '2', content: 'Task 2', status: 'pending', priority: 'medium' },
                ],
              }),
            },
          },
        ],
      };

      const OpenAI = jest.requireActual('openai').default;
      const mockCreate = jest.fn().mockResolvedValue(mockResponse);
      OpenAI.mockImplementation(() => ({
        chat: {
          completions: {
            create: mockCreate,
          },
        },
      }));

      const agent = new OpenAIAgent('test-api-key');
      const result = await agent.generateTodoList('Create a website');

      expect(mockCreate).toHaveBeenCalledWith({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: expect.stringContaining('You are a task management assistant'),
          },
          {
            role: 'user',
            content: expect.stringContaining('User input: Create a website'),
          },
        ],
        temperature: 0.5,
        response_format: { type: 'json_object' },
      });

      expect(result).toHaveLength(2);
      expect(result[0].content).toBe('Task 1');
    });

    it('should handle API errors gracefully', async () => {
      const OpenAI = jest.requireActual('openai').default;
      const mockCreate = jest.fn().mockRejectedValue(new Error('API Error'));
      OpenAI.mockImplementation(() => ({
        chat: {
          completions: {
            create: mockCreate,
          },
        },
      }));

      const agent = new OpenAIAgent('test-api-key');
      await expect(agent.generateTodoList('test input')).rejects.toThrow(
        'Failed to generate todo list'
      );
    });
  });
});

describe('getOpenAIAgent', () => {
  beforeEach(() => {
    // Reset singleton instance
    jest.resetModules();
  });

  it('should return singleton instance', async () => {
    const { getOpenAIAgent } = await import('../openai');
    const agent1 = getOpenAIAgent('test-key');
    const agent2 = getOpenAIAgent('test-key');
    expect(agent1).toBe(agent2);
  });

  it('should create new instance when API key changes', async () => {
    const { getOpenAIAgent } = await import('../openai');
    const agent1 = getOpenAIAgent();
    const agent2 = getOpenAIAgent('test-key');
    expect(agent1).not.toBe(agent2);
  });
});