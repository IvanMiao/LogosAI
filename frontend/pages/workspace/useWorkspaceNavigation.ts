import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { documentIdFromPath, readingPath } from './reading-navigation';
import type { WorkspaceController } from './workspace-types';

export function useWorkspaceNavigation(workspace: WorkspaceController, cloudEnabled: boolean) {
  const location = useLocation();
  const navigate = useNavigate();
  const activeId = workspace.activeDocument?.id ?? null;
  const isReadingRoute = location.pathname.startsWith('/app/readings/');
  const targetId = documentIdFromPath(location.pathname);
  const loading = cloudEnabled && workspace.viewModel.cloudSyncTone === 'loading';
  const known = workspace.documents.some(({ id }) => id === targetId);
  const sync = useRef({ pathname: '', pending: true, activeId, known: false });

  useEffect(() => {
    if (loading) {
      sync.current.pending = true;
      return;
    }
    const state = sync.current;
    if (state.pathname !== location.pathname || state.known !== known) {
      state.known = known;
      state.pathname = location.pathname;
      state.pending = true;
    }
    if (state.pending) {
      if (!applyRequestedDocument(workspace, targetId, known, location.pathname)) return;
      state.pending = false;
      state.activeId = activeId;
      if (!isReadingRoute && activeId) navigate(readingPath(activeId), { replace: true });
      return;
    }
    if (state.activeId !== activeId) {
      state.activeId = activeId;
      navigate(activeId ? readingPath(activeId) : '/app/new');
    }
  }, [activeId, isReadingRoute, known, loading, location.pathname, navigate, targetId, workspace]);

  return {
    loading: loading || Boolean(targetId && known && targetId !== activeId),
    unavailable: isReadingRoute && !known && !loading,
    openDocument: (id: string) => navigate(readingPath(id)),
    startNewDocument: () => navigate('/app/new'),
  };
}

function applyRequestedDocument(
  workspace: WorkspaceController, targetId: string | null, known: boolean, pathname: string,
): boolean {
  const activeId = workspace.activeDocument?.id;
  if (targetId && known && activeId !== targetId) {
    workspace.openDocument(targetId);
    return false;
  }
  if (pathname === '/app/new' && activeId) {
    workspace.startNewDocument();
    return false;
  }
  return true;
}
