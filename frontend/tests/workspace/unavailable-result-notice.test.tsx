import '@testing-library/jest-dom/vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { UnavailableResultNotice } from '@/pages/workspace/components/UnavailableResultNotice';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

it('automatically dismisses the notice after eight seconds', () => {
  const dismiss = vi.fn();
  render(<UnavailableResultNotice onDismiss={dismiss} onOpenHistory={vi.fn()} />);
  act(() => vi.advanceTimersByTime(7999));
  expect(dismiss).not.toHaveBeenCalled();
  act(() => vi.advanceTimersByTime(1));
  expect(dismiss).toHaveBeenCalledOnce();
});

it('keeps the notice available while hovered or focused and resumes afterward', () => {
  const dismiss = vi.fn();
  render(<UnavailableResultNotice onDismiss={dismiss} onOpenHistory={vi.fn()} />);
  const notice = screen.getByRole('status').parentElement!;
  const history = screen.getByRole('button', { name: 'Open History' });
  fireEvent.mouseEnter(notice);
  act(() => vi.advanceTimersByTime(10000));
  expect(dismiss).not.toHaveBeenCalled();
  fireEvent.focus(history);
  fireEvent.mouseLeave(notice);
  act(() => vi.advanceTimersByTime(10000));
  expect(dismiss).not.toHaveBeenCalled();
  fireEvent.blur(history, { relatedTarget: document.body });
  act(() => vi.advanceTimersByTime(8000));
  expect(dismiss).toHaveBeenCalledOnce();
});
