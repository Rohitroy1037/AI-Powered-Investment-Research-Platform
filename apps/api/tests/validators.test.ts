import { describe, expect, it } from 'vitest';
import {
  registerSchema,
  loginSchema,
  projectSchema,
  taskSchema,
  commentSchema,
} from '../src/validators/schemas.js';

describe('registerSchema', () => {
  it('accepts valid registration input', () => {
    const result = registerSchema.parse({
      name: 'Jane Doe',
      email: 'jane@example.com',
      password: 'securepass123',
    });
    expect(result.name).toBe('Jane Doe');
    expect(result.email).toBe('jane@example.com');
  });

  it('rejects name shorter than 2 characters', () => {
    expect(() =>
      registerSchema.parse({ name: 'J', email: 'j@example.com', password: 'securepass123' }),
    ).toThrow();
  });

  it('rejects invalid email format', () => {
    expect(() =>
      registerSchema.parse({ name: 'Jane', email: 'not-an-email', password: 'securepass123' }),
    ).toThrow();
  });

  it('rejects password shorter than 8 characters', () => {
    expect(() =>
      registerSchema.parse({ name: 'Jane', email: 'jane@example.com', password: 'short' }),
    ).toThrow();
  });

  it('rejects password longer than 128 characters', () => {
    expect(() =>
      registerSchema.parse({
        name: 'Jane',
        email: 'jane@example.com',
        password: 'a'.repeat(129),
      }),
    ).toThrow();
  });
});

describe('loginSchema', () => {
  it('accepts valid login credentials', () => {
    const result = loginSchema.parse({ email: 'user@example.com', password: 'password123' });
    expect(result.email).toBe('user@example.com');
  });

  it('rejects missing email', () => {
    expect(() => loginSchema.parse({ password: 'password123' })).toThrow();
  });

  it('rejects missing password', () => {
    expect(() => loginSchema.parse({ email: 'user@example.com' })).toThrow();
  });
});

describe('projectSchema', () => {
  it('accepts a valid project', () => {
    const result = projectSchema.parse({ name: 'Web app', key: 'WEB' });
    expect(result.key).toBe('WEB');
  });

  it('accepts a valid project with members', () => {
    const result = projectSchema.parse({
      name: 'Web app',
      key: 'WEB',
      members: ['user1', 'user2'],
    });
    expect(result.members).toHaveLength(2);
  });

  it('rejects a key starting with a number', () => {
    expect(() => projectSchema.parse({ name: 'Web app', key: '1WEB' })).toThrow();
  });

  it('rejects a key longer than 10 characters', () => {
    expect(() => projectSchema.parse({ name: 'Web app', key: 'TOOLONGKEYX' })).toThrow();
  });

  it('rejects a key with special characters', () => {
    expect(() => projectSchema.parse({ name: 'Web app', key: 'WEB-APP' })).toThrow();
  });

  it('rejects a name shorter than 2 characters', () => {
    expect(() => projectSchema.parse({ name: 'W', key: 'WEB' })).toThrow();
  });
});

describe('taskSchema', () => {
  it('accepts a minimal task (title only)', () => {
    const result = taskSchema.parse({ title: 'Fix bug' });
    expect(result.title).toBe('Fix bug');
  });

  it('accepts a full task with all optional fields', () => {
    const result = taskSchema.parse({
      title: 'Fix bug',
      description: 'There is a bug in the login flow',
      status: 'in_progress',
      priority: 'high',
      assignee: '507f1f77bcf86cd799439011',
      labels: ['frontend', 'urgent'],
      dueDate: '2025-12-31',
    });
    expect(result.status).toBe('in_progress');
    expect(result.priority).toBe('high');
    expect(result.labels).toHaveLength(2);
    expect(result.dueDate).toBeInstanceOf(Date);
  });

  it('rejects unsupported task status values', () => {
    expect(() => taskSchema.parse({ title: 'Ship it', status: 'blocked' })).toThrow();
  });

  it('rejects unsupported priority values', () => {
    expect(() => taskSchema.parse({ title: 'Fix it', priority: 'critical' })).toThrow();
  });

  it('accepts null assignee (unassigning)', () => {
    const result = taskSchema.parse({ title: 'Fix bug', assignee: null });
    expect(result.assignee).toBeNull();
  });

  it('rejects empty title', () => {
    expect(() => taskSchema.parse({ title: '' })).toThrow();
  });

  it('rejects labels exceeding max count (10)', () => {
    const labels = Array.from({ length: 11 }, (_, i) => `label-${i}`);
    expect(() => taskSchema.parse({ title: 'Test', labels })).toThrow();
  });

  it('allows partial parsing for updates', () => {
    const partial = taskSchema.partial();
    const result = partial.parse({ status: 'done' });
    expect(result.status).toBe('done');
    expect(result.title).toBeUndefined();
  });
});

describe('commentSchema', () => {
  it('accepts a valid comment body', () => {
    const result = commentSchema.parse({ body: 'This looks good!' });
    expect(result.body).toBe('This looks good!');
  });

  it('rejects empty comment body', () => {
    expect(() => commentSchema.parse({ body: '' })).toThrow();
  });

  it('rejects comment body exceeding 5000 characters', () => {
    expect(() => commentSchema.parse({ body: 'a'.repeat(5001) })).toThrow();
  });
});
