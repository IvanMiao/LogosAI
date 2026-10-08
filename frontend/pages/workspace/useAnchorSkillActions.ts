import { useCallback } from 'react';
import { runAnchorSkill } from '@/client-api/anchor-api';
import { streamAnalysis } from '@/client-api/analysis-api';
import type { AnalysisModel } from '@/types';
import {
  createAnchorFromRange,
  resolveAnchor,
  type AnchorSkill,
  type TextAnchor,
} from '@/features/anchors';
import type { Artifact } from '@/features/artifacts';
import type { WorkspaceDocument } from '@/features/reading';
import type { AnalysisLanguage } from '@/features/reading';
import type { DocumentParagraph } from '@/features/reading/reading-core';
import type { useArtifactTasks } from './useArtifactTasks';

const ARTIFACT_BY_SKILL: Record<AnchorSkill, { type: Artifact['type']; title: string }> = {
  explain: { type: 'explanation', title: 'Explanation' },
  translate: { type: 'translation', title: 'Translation' },
  vocab: { type: 'vocabulary', title: 'Vocabulary' },
};

type RunArtifactTask = ReturnType<typeof useArtifactTasks>['runArtifactTask'];

interface AnchorSkillActionsInput {
  hasApiKey: boolean;
  model: AnalysisModel;
  activeDocument: WorkspaceDocument | null;
  activeAnchor: TextAnchor | null;
  anchorsById: Record<string, TextAnchor>;
  analysisLanguage: AnalysisLanguage;
  activateAnchor: (anchor: TextAnchor) => void;
  confirmPendingSelection: () => TextAnchor | null;
  runArtifactTask: RunArtifactTask;
  setActionError: (error: string) => void;
}

interface AnchorSkillActions {
  runAnchorSkillForPendingSelection: (skill: AnchorSkill) => Promise<void>;
  runAnchorSkillForActiveAnchor: (skill: AnchorSkill) => Promise<void>;
  runCloseReadDocument: () => Promise<void>;
  runExplainParagraph: (paragraph: DocumentParagraph) => Promise<void>;
  retryArtifact: (artifact: Artifact) => Promise<void>;
}

export function useAnchorSkillActions({
  hasApiKey,
  model,
  activeDocument,
  activeAnchor,
  anchorsById,
  analysisLanguage,
  activateAnchor,
  confirmPendingSelection,
  runArtifactTask,
  setActionError,
}: AnchorSkillActionsInput): AnchorSkillActions {
  const runCloseRead = useCallback(async (
    anchor: TextAnchor,
    text: string,
    title: string,
  ) => {
    activateAnchor(anchor);
    if (!hasApiKey) return;
    setActionError('');
    await runArtifactTask({
      documentId: anchor.documentId,
      anchorId: anchor.id,
      title,
      execute: async ({ signal, onChunk, onStage }) => {
        const content = await streamAnalysis(
          { model, text, userLanguage: analysisLanguage, signal },
          { onChunk, onStage },
        );
        return { content };
      },
    });
  }, [activateAnchor, analysisLanguage, hasApiKey, model, runArtifactTask, setActionError]);

  const runAnchorSkillForAnchor = useCallback(async (anchor: TextAnchor, skill: AnchorSkill) => {
    if (!activeDocument) return;
    activateAnchor(anchor);
    const artifact = ARTIFACT_BY_SKILL[skill];
    if (!hasApiKey) return;
    setActionError('');
    await runArtifactTask({
      documentId: activeDocument.id,
      anchorId: anchor.id,
      title: artifact.title,
      type: artifact.type,
      requestIdPrefix: 'pending',
      execute: async ({ signal, onChunk, onMetadata, onStage }) => {
        const result = await runAnchorSkill(
          { model, document: activeDocument, anchor, skill, userLanguage: analysisLanguage, signal },
          { onChunk, onStage, onMetadata },
        );
        return { content: result.result, requestId: result.requestId, traceId: result.traceId };
      },
    });
  }, [activeDocument, activateAnchor, analysisLanguage, hasApiKey, model, runArtifactTask, setActionError]);

  const runAnchorSkillForActiveAnchor = useCallback(async (skill: AnchorSkill) => {
    if (activeAnchor) await runAnchorSkillForAnchor(activeAnchor, skill);
  }, [activeAnchor, runAnchorSkillForAnchor]);

  const runAnchorSkillForPendingSelection = useCallback(async (skill: AnchorSkill) => {
    const anchor = confirmPendingSelection();
    if (anchor) await runAnchorSkillForAnchor(anchor, skill);
  }, [confirmPendingSelection, runAnchorSkillForAnchor]);

  const runCloseReadDocument = useCallback(async () => {
    if (!activeDocument) return;
    const anchor = createAnchorFromRange({
      documentId: activeDocument.id,
      documentText: activeDocument.text,
      startOffset: 0,
      endOffset: activeDocument.text.length,
      scope: 'document',
    });
    if (anchor) await runCloseRead(anchor, activeDocument.text, 'Close Reading');
  }, [activeDocument, runCloseRead]);

  const runExplainParagraph = useCallback(async (paragraph: DocumentParagraph) => {
    if (!activeDocument) return;
    const anchor = createAnchorFromRange({
      documentId: activeDocument.id,
      documentText: activeDocument.text,
      startOffset: paragraph.startOffset,
      endOffset: paragraph.endOffset,
      scope: 'paragraph',
    });
    if (anchor) await runAnchorSkillForAnchor(anchor, 'explain');
  }, [activeDocument, runAnchorSkillForAnchor]);

  const retryArtifact = useCallback(async (artifact: Artifact) => {
    const anchor = anchorsById[artifact.anchorId];
    if (!activeDocument || !anchor) return;
    const resolvedAnchor = anchor.scope === 'document'
      ? { quote: activeDocument.text }
      : resolveAnchor(anchor, activeDocument.text);
    if (!resolvedAnchor) {
      setActionError('Source text changed and this saved source can no longer be resolved.');
      return;
    }
    const skill = (Object.keys(ARTIFACT_BY_SKILL) as AnchorSkill[])
      .find((item) => ARTIFACT_BY_SKILL[item].type === artifact.type);
    if (skill) {
      await runAnchorSkillForAnchor(anchor, skill);
      return;
    }
    await runCloseRead(anchor, resolvedAnchor.quote, artifact.title);
  }, [activeDocument, anchorsById, runAnchorSkillForAnchor, runCloseRead, setActionError]);

  return {
    runAnchorSkillForPendingSelection,
    runAnchorSkillForActiveAnchor,
    runCloseReadDocument,
    runExplainParagraph,
    retryArtifact,
  };
}
