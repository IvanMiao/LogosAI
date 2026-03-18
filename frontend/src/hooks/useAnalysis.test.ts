import { describe, it, expect } from 'vitest';
import { parseSseBlock } from './parseSse';

describe('parseSseBlock', () => {
  it('parses a stage event', () => {
    const block = 'event: stage\ndata: {"stage":"detect"}';
    expect(parseSseBlock(block)).toEqual({
      event: 'stage',
      data: '{"stage":"detect"}',
    });
  });

  it('parses a chunk event', () => {
    const block = 'event: chunk\ndata: {"delta":"hello"}';
    expect(parseSseBlock(block)).toEqual({
      event: 'chunk',
      data: '{"delta":"hello"}',
    });
  });

  it('parses a done event with result', () => {
    const block = 'event: done\ndata: {"result":"full text"}';
    expect(parseSseBlock(block)).toEqual({
      event: 'done',
      data: '{"result":"full text"}',
    });
  });

  it('defaults event name to "message" when no event line', () => {
    const block = 'data: {"key":"val"}';
    expect(parseSseBlock(block)).toEqual({
      event: 'message',
      data: '{"key":"val"}',
    });
  });

  it('returns null for comment-only blocks', () => {
    expect(parseSseBlock(': stream-start')).toBeNull();
  });

  it('returns null for empty blocks', () => {
    expect(parseSseBlock('')).toBeNull();
  });

  it('joins multiple data lines', () => {
    const block = 'event: chunk\ndata: line1\ndata: line2';
    expect(parseSseBlock(block)).toEqual({
      event: 'chunk',
      data: 'line1\nline2',
    });
  });

  it('ignores comment lines mixed with data', () => {
    const block = ': comment\nevent: stage\n: another\ndata: {"stage":"interpret"}';
    expect(parseSseBlock(block)).toEqual({
      event: 'stage',
      data: '{"stage":"interpret"}',
    });
  });

  it('handles data with unicode characters', () => {
    const block = 'event: chunk\ndata: {"delta":"日本語テスト"}';
    expect(parseSseBlock(block)).toEqual({
      event: 'chunk',
      data: '{"delta":"日本語テスト"}',
    });
  });
});
