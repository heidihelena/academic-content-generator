import { useEffect, useState } from 'react';
import { useStore } from './store/useStore';
import { Sidebar, type View } from './components/Sidebar';
import { Header } from './components/Header';
import { ContentCalendarPage } from './components/ContentCalendarPage';
import { Analytics } from './components/Analytics';
import { ConnectedAccounts } from './components/ConnectedAccounts';
import { GenerateIdeas } from './components/GenerateIdeas';
import { PostEditorDrawer } from './components/PostEditorDrawer';
import { LoadingState, ErrorState } from './components/ui/States';

/**
 * Application root. Wires the navigation views, the persistent post editor modal,
 * and store initialization (loads from mock persistence or seeds sample data).
 */
export default function App() {
  const initialize = useStore((s) => s.initialize);
  const loadError = useStore((s) => s.loadError);
  const [view, setView] = useState<View>('calendar');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    initialize();
    setReady(true);
  }, [initialize]);

  return (
    <div className="flex min-h-screen flex-col bg-surface-950 md:flex-row">
      <Sidebar view={view} onChange={setView} />

      <div className="flex min-w-0 flex-1 flex-col">
        <Header view={view} />

        <main className="flex-1 overflow-x-hidden px-4 py-5 sm:px-6">
          {!ready ? (
            <LoadingState label="Loading your workspace…" />
          ) : loadError ? (
            <ErrorState
              title="Couldn't reach the server"
              message={loadError}
              onRetry={() => initialize()}
            />
          ) : (
            <div className="mx-auto max-w-7xl">
              {view === 'calendar' && <ContentCalendarPage />}
              {view === 'analytics' && <Analytics />}
              {view === 'accounts' && (
                <div className="mx-auto max-w-2xl">
                  <ConnectedAccounts />
                </div>
              )}
              {view === 'ideas' && (
                <div className="mx-auto max-w-3xl">
                  <GenerateIdeas />
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Editor drawer is always mounted; visibility is store-driven. */}
      <PostEditorDrawer />
    </div>
  );
}
