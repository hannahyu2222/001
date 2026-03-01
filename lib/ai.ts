interface KnowledgeResult {
  knowledge: string[];
  actions: string[];
  reflection: string;
  suggestedTopic?: string;
}

interface BearNoteAnalysis {
  suggestedTopic: string;
  knowledge: string[];
  actions: string[];
  reflection: string;
  originalTitle: string;
}

function hasApiKey(): boolean {
  return !!(process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY.trim());
}

export async function extractKnowledge(
  articleContent: string,
  articleTitle: string,
  existingTopics: string[]
): Promise<KnowledgeResult | null> {
  if (!hasApiKey()) return null;

  try {
    const Anthropic = (await import('@anthropic-ai/sdk')).default;
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const topicsStr = existingTopics.length > 0 ? existingTopics.join(', ') : '（无）';

    const response = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: `请从以下文章中提炼知识点，以JSON格式返回。

文章标题：${articleTitle}
文章内容：
${articleContent.slice(0, 6000)}

现有主题：${topicsStr}

请返回如下JSON格式（不要有其他文字）：
{
  "knowledge": ["知识点1", "知识点2", "知识点3"],
  "actions": ["行动项1", "行动项2"],
  "reflection": "一段感悟文字",
  "suggestedTopic": "建议的主题名（从现有主题中选或新建）"
}`,
        },
      ],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return null;
  } catch (e) {
    console.error('AI extractKnowledge error:', e);
    return null;
  }
}

export async function suggestTopic(
  content: string,
  existingTopics: string[]
): Promise<string | null> {
  if (!hasApiKey()) return null;

  try {
    const Anthropic = (await import('@anthropic-ai/sdk')).default;
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const response = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 100,
      messages: [
        {
          role: 'user',
          content: `根据以下内容，从现有主题中选择最合适的一个，或建议新主题名（简短，2-6个字）。只返回主题名，不要其他文字。

内容：${content.slice(0, 1000)}
现有主题：${existingTopics.join(', ') || '（无）'}`,
        },
      ],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text.trim() : '';
    return text || null;
  } catch (e) {
    console.error('AI suggestTopic error:', e);
    return null;
  }
}

export async function batchAnalyzeBearNotes(
  notes: { title: string; content: string }[],
  existingTopics: string[]
): Promise<BearNoteAnalysis[] | null> {
  if (!hasApiKey()) return null;

  try {
    const Anthropic = (await import('@anthropic-ai/sdk')).default;
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const notesStr = notes
      .slice(0, 20)
      .map((n, i) => `[${i + 1}] 标题：${n.title}\n内容摘要：${n.content.slice(0, 500)}`)
      .join('\n\n---\n\n');

    const response = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: `分析以下Bear笔记，为每篇提炼知识点并建议主题。以JSON数组格式返回。

现有主题：${existingTopics.join(', ') || '（无）'}

笔记列表：
${notesStr}

返回格式（JSON数组，不要其他文字）：
[
  {
    "originalTitle": "原笔记标题",
    "suggestedTopic": "建议主题",
    "knowledge": ["知识点1", "知识点2"],
    "actions": ["行动项1"],
    "reflection": "感悟"
  }
]`,
        },
      ],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return null;
  } catch (e) {
    console.error('AI batchAnalyzeBearNotes error:', e);
    return null;
  }
}

export interface Quote {
  text: string;
  caption: string;
  tags: string[];
}

export async function extractQuotes(rawText: string): Promise<Quote[] | null> {
  if (!hasApiKey()) return null;

  try {
    const Anthropic = (await import('@anthropic-ai/sdk')).default;
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const response = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: `你是一个擅长提炼金句的文案高手。请从以下我的碎片感悟中，提炼出3-6条适合发小红书的金句。

要求：
- 金句要简洁有力，1-2句话，能引起共鸣
- 配一段30字以内的小红书文案（可以带emoji，接地气）
- 配2-4个相关话题标签（用#开头）
- 保留原有的情感和洞察，但语言更精炼有张力

我的原始感悟：
${rawText.slice(0, 3000)}

请返回JSON格式（不要其他文字）：
[
  {
    "text": "金句正文",
    "caption": "配套小红书文案（含emoji）",
    "tags": ["#话题1", "#话题2", "#话题3"]
  }
]`,
        },
      ],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return null;
  } catch (e) {
    console.error('AI extractQuotes error:', e);
    return null;
  }
}

export { hasApiKey };
