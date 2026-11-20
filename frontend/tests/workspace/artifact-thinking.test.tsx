import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { describe, expect, it } from 'vitest';
import { ArtifactThinking } from '@/pages/workspace/components/ArtifactThinking';
import type { Artifact } from '@/features/artifacts';

const artifact: Artifact = {
  id: 'a', documentId: 'd', anchorId: 's', type: 'explanation', title: 'Explain',
  content: '', thinking: '**Considering context**\nDetails', status: 'running', createdAt: '', updatedAt: '',
};

describe('artifact thinking', () => {
  it('renders paragraph tag mentions as readable labels without modifying the artifact', () => {
    const thinking = 'Requirements: `[[P1]]`, **[[OVERVIEW]]** and [[SYNTHESIS]].';
    const item = { ...artifact, thinking, status: 'complete' as const };
    render(<ArtifactThinking artifact={item} />);
    fireEvent.click(screen.getByRole('button', { name: 'Show thinking' }));
    const panel = screen.getByRole('region', { name: 'Model thinking' });
    expect(panel).toHaveTextContent('Requirements: ¶1, Overview and Synthesis.');
    expect(panel).not.toHaveTextContent('[[P1]]');
    expect(item.thinking).toBe(thinking);
  });
  it('starts collapsed while thinking and preserves user expansion when content starts', () => {
    const { rerender } = render(<ArtifactThinking artifact={artifact} />);
    const thinkingToggle = screen.getByRole('button', { name: 'Thinking… Considering context' });
    expect(thinkingToggle).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(thinkingToggle);
    expect(thinkingToggle).toHaveAttribute('aria-expanded', 'true');
    rerender(<ArtifactThinking artifact={{ ...artifact, content: 'Answer' }} />);
    const toggle = screen.getByRole('button', { name: 'Hide thinking' });
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(toggle);
    expect(screen.getByRole('button', { name: 'Show thinking' })).toHaveAttribute('aria-expanded', 'false');
    rerender(<ArtifactThinking artifact={{ ...artifact, status: 'complete', content: 'Answer' }} />);
    expect(screen.getByRole('button')).toHaveAttribute('aria-expanded', 'false');
  });

  it.each(['running', 'complete', 'stopped', 'failed'] as const)('starts collapsed with content when %s', (status) => {
    render(<ArtifactThinking artifact={{ ...artifact, content: 'Answer', status }} />);
    expect(screen.getByRole('button', { name: 'Show thinking' })).toHaveAttribute('aria-expanded', 'false');
  });

  it('preserves a user collapse during generation and renders nothing without thinking', () => {
    const { rerender } = render(<ArtifactThinking artifact={artifact} />);
    fireEvent.click(screen.getByRole('button'));
    fireEvent.click(screen.getByRole('button'));
    rerender(<ArtifactThinking artifact={{ ...artifact, thinking: 'More context' }} />);
    expect(screen.getByRole('button')).toHaveAttribute('aria-expanded', 'false');
    rerender(<ArtifactThinking artifact={{ ...artifact, thinking: '' }} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('shows no step title when the stream has no heading', () => {
    render(<ArtifactThinking artifact={{ ...artifact, thinking: 'Considering context' }} />);
    expect(screen.getByRole('button', { name: 'Thinking…' })).toHaveAttribute('aria-expanded', 'false');
  });
});
