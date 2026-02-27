import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const NOTES_DIR = process.env.NOTES_DIR
  ? path.resolve(process.env.NOTES_DIR)
  : path.resolve(process.cwd(), 'notes');

const ENTRIES_DIR = path.join(NOTES_DIR, 'entries');
const TOPICS_FILE = path.join(NOTES_DIR, '_topics.json');

export interface Topic {
  name: string;
  description: string;
  createdAt: string;
}

export interface Entry {
  id: string;
  topic: string;
  source_url?: string;
  source_title?: string;
  created_at: string;
  updated_at: string;
  knowledge: string[];
  actions: string[];
  reflection: string;
  rawContent?: string;
}

// Ensure directories exist
function ensureDir() {
  if (!fs.existsSync(NOTES_DIR)) fs.mkdirSync(NOTES_DIR, { recursive: true });
  if (!fs.existsSync(ENTRIES_DIR)) fs.mkdirSync(ENTRIES_DIR, { recursive: true });
  if (!fs.existsSync(TOPICS_FILE)) fs.writeFileSync(TOPICS_FILE, '[]', 'utf-8');
}

// Topics CRUD
export function getTopics(): Topic[] {
  ensureDir();
  try {
    return JSON.parse(fs.readFileSync(TOPICS_FILE, 'utf-8'));
  } catch {
    return [];
  }
}

export function createTopic(topic: Topic): Topic {
  ensureDir();
  const topics = getTopics();
  if (topics.find((t) => t.name === topic.name)) {
    throw new Error(`Topic "${topic.name}" already exists`);
  }
  topics.push(topic);
  fs.writeFileSync(TOPICS_FILE, JSON.stringify(topics, null, 2), 'utf-8');
  return topic;
}

export function updateTopic(name: string, data: Partial<Topic>): Topic {
  ensureDir();
  const topics = getTopics();
  const idx = topics.findIndex((t) => t.name === name);
  if (idx === -1) throw new Error(`Topic "${name}" not found`);
  topics[idx] = { ...topics[idx], ...data };
  fs.writeFileSync(TOPICS_FILE, JSON.stringify(topics, null, 2), 'utf-8');
  return topics[idx];
}

export function deleteTopic(name: string): void {
  ensureDir();
  const topics = getTopics();
  const filtered = topics.filter((t) => t.name !== name);
  fs.writeFileSync(TOPICS_FILE, JSON.stringify(filtered, null, 2), 'utf-8');
}

// Generate entry ID: YYYYMMDD-NNN
function generateId(): string {
  ensureDir();
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, '');
  const files = fs.existsSync(ENTRIES_DIR)
    ? fs.readdirSync(ENTRIES_DIR).filter((f) => f.startsWith(date))
    : [];
  const num = (files.length + 1).toString().padStart(3, '0');
  return `${date}-${num}`;
}

// Parse entry from markdown file
function parseEntry(filePath: string): Entry | null {
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const { data, content } = matter(raw);

    // Parse sections from content
    const knowledgeMatch = content.match(/## 知识点\n([\s\S]*?)(?=\n## |$)/);
    const actionsMatch = content.match(/## 行动项\n([\s\S]*?)(?=\n## |$)/);
    const reflectionMatch = content.match(/## 我的感悟\n([\s\S]*?)(?=\n## |$)/);

    const knowledge: string[] = [];
    if (knowledgeMatch) {
      knowledgeMatch[1].split('\n').forEach((line) => {
        const m = line.match(/^- (.+)/);
        if (m) knowledge.push(m[1].trim());
      });
    }

    const actions: string[] = [];
    if (actionsMatch) {
      actionsMatch[1].split('\n').forEach((line) => {
        const m = line.match(/^- \[([ x])\] (.+)/);
        if (m) actions.push(`[${m[1]}] ${m[2].trim()}`);
      });
    }

    const reflection = reflectionMatch ? reflectionMatch[1].trim() : '';

    return {
      id: data.id,
      topic: data.topic,
      source_url: data.source_url,
      source_title: data.source_title,
      created_at: data.created_at,
      updated_at: data.updated_at,
      knowledge,
      actions,
      reflection,
      rawContent: content,
    };
  } catch {
    return null;
  }
}

// Serialize entry to markdown
function serializeEntry(entry: Entry): string {
  const knowledgeLines = entry.knowledge.map((k) => `- ${k}`).join('\n');
  const actionLines = entry.actions.map((a) => {
    if (a.startsWith('[x]') || a.startsWith('[ ]')) return `- ${a}`;
    return `- [ ] ${a}`;
  }).join('\n');

  const content = `## 知识点\n\n${knowledgeLines || '- '}\n\n## 行动项\n\n${actionLines || '- [ ] '}\n\n## 我的感悟\n\n${entry.reflection || ''}`;

  const frontmatter = {
    id: entry.id,
    topic: entry.topic,
    source_url: entry.source_url || '',
    source_title: entry.source_title || '',
    created_at: entry.created_at,
    updated_at: entry.updated_at,
  };

  return matter.stringify(content, frontmatter);
}

// Entries CRUD
export function getAllEntries(): Entry[] {
  ensureDir();
  if (!fs.existsSync(ENTRIES_DIR)) return [];
  const files = fs.readdirSync(ENTRIES_DIR).filter((f) => f.endsWith('.md'));
  const entries: Entry[] = [];
  for (const file of files) {
    const entry = parseEntry(path.join(ENTRIES_DIR, file));
    if (entry) entries.push(entry);
  }
  return entries.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

export function getEntriesByTopic(topicName: string): Entry[] {
  return getAllEntries().filter((e) => e.topic === topicName);
}

export function getEntry(id: string): Entry | null {
  ensureDir();
  const filePath = path.join(ENTRIES_DIR, `${id}.md`);
  if (!fs.existsSync(filePath)) return null;
  return parseEntry(filePath);
}

export function createEntry(data: Omit<Entry, 'id' | 'created_at' | 'updated_at'>): Entry {
  ensureDir();
  const id = generateId();
  const now = new Date().toISOString();
  const entry: Entry = {
    ...data,
    id,
    created_at: now,
    updated_at: now,
  };
  const content = serializeEntry(entry);
  fs.writeFileSync(path.join(ENTRIES_DIR, `${id}.md`), content, 'utf-8');
  return entry;
}

export function updateEntry(id: string, data: Partial<Entry>): Entry {
  ensureDir();
  const existing = getEntry(id);
  if (!existing) throw new Error(`Entry "${id}" not found`);
  const updated: Entry = {
    ...existing,
    ...data,
    id,
    updated_at: new Date().toISOString(),
  };
  const content = serializeEntry(updated);
  fs.writeFileSync(path.join(ENTRIES_DIR, `${id}.md`), content, 'utf-8');
  return updated;
}

export function deleteEntry(id: string): void {
  ensureDir();
  const filePath = path.join(ENTRIES_DIR, `${id}.md`);
  if (!fs.existsSync(filePath)) throw new Error(`Entry "${id}" not found`);
  fs.unlinkSync(filePath);
}

// Toggle todo item in an entry
export function toggleTodo(entryId: string, todoIndex: number): Entry {
  const entry = getEntry(entryId);
  if (!entry) throw new Error(`Entry "${entryId}" not found`);
  const actions = [...entry.actions];
  if (todoIndex < 0 || todoIndex >= actions.length) {
    throw new Error(`Todo index ${todoIndex} out of range`);
  }
  const action = actions[todoIndex];
  if (action.startsWith('[ ]')) {
    actions[todoIndex] = '[x]' + action.slice(3);
  } else if (action.startsWith('[x]')) {
    actions[todoIndex] = '[ ]' + action.slice(3);
  }
  return updateEntry(entryId, { actions });
}

// Search entries
export function searchEntries(query: string): Entry[] {
  const q = query.toLowerCase();
  return getAllEntries().filter((entry) => {
    return (
      entry.topic.toLowerCase().includes(q) ||
      (entry.source_title || '').toLowerCase().includes(q) ||
      (entry.source_url || '').toLowerCase().includes(q) ||
      entry.knowledge.some((k) => k.toLowerCase().includes(q)) ||
      entry.actions.some((a) => a.toLowerCase().includes(q)) ||
      entry.reflection.toLowerCase().includes(q)
    );
  });
}

// Get all pending todos across all entries
export interface PendingTodo {
  entryId: string;
  entryTopic: string;
  entryTitle?: string;
  todoIndex: number;
  todoText: string;
}

export function getAllPendingTodos(): PendingTodo[] {
  const entries = getAllEntries();
  const todos: PendingTodo[] = [];
  for (const entry of entries) {
    entry.actions.forEach((action, idx) => {
      if (action.startsWith('[ ]')) {
        todos.push({
          entryId: entry.id,
          entryTopic: entry.topic,
          entryTitle: entry.source_title,
          todoIndex: idx,
          todoText: action.slice(4).trim(),
        });
      }
    });
  }
  return todos;
}

// Get topic stats
export interface TopicStats {
  entryCount: number;
  lastUpdated: string | null;
  pendingTodoCount: number;
}

export function getTopicStats(topicName: string): TopicStats {
  const entries = getEntriesByTopic(topicName);
  let pendingTodoCount = 0;
  let lastUpdated: string | null = null;

  for (const entry of entries) {
    pendingTodoCount += entry.actions.filter((a) => a.startsWith('[ ]')).length;
    if (!lastUpdated || entry.updated_at > lastUpdated) {
      lastUpdated = entry.updated_at;
    }
  }

  return {
    entryCount: entries.length,
    lastUpdated,
    pendingTodoCount,
  };
}

export function importEntries(entries: Omit<Entry, 'id' | 'created_at' | 'updated_at'>[]): Entry[] {
  return entries.map((e) => createEntry(e));
}
