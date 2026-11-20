import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { describe, expect, it } from 'vitest';
import { ArtifactThinking } from '@/pages/workspace/components/ArtifactThinking';
import type { Artifact } from '@/features/artifacts';

const artifact: Artifact = {
  id: 'a', documentId: 'd', anchorId: 's', type: 'explanation', title: 'Explain',
  content: '', thinking: 'Considering **context**', status: 'running', createdAt: '', updatedAt: '',
};

describe('artifact thinking', () => {
  it('expands while thinking then collapses when content starts', () => {
    const { rerender } = render(<ArtifactThinking artifact={artifact} />);
    expect(screen.getByRole('button', { name: 'Thinking…' })).toHaveAttribute('aria-expanded', 'true');
    rerender(<ArtifactThinking artifact={{ ...artifact, content: 'Answer' }} />);
    const toggle = screen.getByRole('button', { name: 'Show thinking' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(toggle);
    expect(screen.getByRole('button', { name: 'Hide thinking' })).toHaveAttribute('aria-expanded', 'true');
    rerender(<ArtifactThinking artifact={{ ...artifact, status: 'complete', content: 'Answer' }} />);
    expect(screen.getByRole('button')).toHaveAttribute('aria-expanded', 'true');
  });

  it.each(['complete', 'stopped', 'failed'] as const)('starts collapsed when %s', (status) => {
    render(<ArtifactThinking artifact={{ ...artifact, status }} />);
    expect(screen.getByRole('button', { name: 'Show thinking' })).toHaveAttribute('aria-expanded', 'false');
  });

  it('preserves a user collapse during generation and renders nothing without thinking', () => {
    const { rerender } = render(<ArtifactThinking artifact={artifact} />);
    fireEvent.click(screen.getByRole('button'));
    rerender(<ArtifactThinking artifact={{ ...artifact, thinking: 'More context' }} />);
    expect(screen.getByRole('button')).toHaveAttribute('aria-expanded', 'false');
    rerender(<ArtifactThinking artifact={{ ...artifact, thinking: '' }} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
