import { OpenAIAgent } from '../openai';

const mockCreate = jest.fn();

jest.mock('openai', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    chat: { completions: { create: mockCreate } },
  })),
}));

const setupMockResponse = (response: Record<string, unknown>) => {
  mockCreate.mockResolvedValue({
    choices: [{ message: { content: JSON.stringify(response) } }],
  });
  return mockCreate;
};

describe('OpenAIAgent', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should handle configuration states', () => {
    expect(new OpenAIAgent('test-key').isConfigured()).toBe(true);
    expect(new OpenAIAgent().isConfigured()).toBe(false);
  });

  it('should process content and handle errors', async () => {
    const agent = new OpenAIAgent();
    await expect(agent.processNoteContent('test')).rejects.toThrow('OpenAI API key not configured');

    setupMockResponse({
      message: 'Generated 2 tasks',
      tasks: [{ content: 'Task 1', status: 'pending', priority: 'high' }],
    });

    const configuredAgent = new OpenAIAgent('test-key');
    const result = await configuredAgent.processNoteContent('Learn React');

    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
      model: 'gpt-4o-mini',
      messages: expect.arrayContaining([
        expect.objectContaining({ role: 'system' }),
        { role: 'user', content: 'Generate actionable tasks for: Learn React' },
      ]),
      temperature: 0.7,
    }));

    expect(result.message).toBe('Generated 2 tasks');
    expect(result.tasks[0].content).toBe('Task 1');
  });

  it('should handle API failures', async () => {
    mockCreate.mockRejectedValue(new Error('API Error'));

    const agent = new OpenAIAgent('test-key');
    await expect(agent.processNoteContent('test')).rejects.toThrow('Failed to process with AI agent');
  });


  it('should manage singleton instances', async () => {
    jest.resetModules();
    
    // Clear any cached instances
    delete require.cache[require.resolve('../openai')];
    
    const { getOpenAIAgent } = require('../openai');
    
    const agent1 = getOpenAIAgent('test-key');
    const agent2 = getOpenAIAgent('test-key');
    expect(agent1).toBe(agent2);

    const agent3 = getOpenAIAgent('different-key');
    expect(agent1).not.toBe(agent3);
  });
});