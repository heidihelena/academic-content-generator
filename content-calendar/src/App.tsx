import { useEffect, useState } from 'react';
import { useStore } from './store/useStore';
import { Sidebar, type View } from './components/Sidebar';
import { useRoute } from './lib/router';
import { Header } from './components/Header';
import { HomeScreen } from './components/HomeScreen';
import { LibraryScreen, isLibraryView } from './components/LibraryScreen';
import { OutboxScreen } from './components/OutboxScreen';
import { Analytics } from './components/Analytics';
import { IdeasScreen } from './components/IdeasScreen';
import { SourceInbox } from './components/SourceInbox';
import { DraftStudio } from './components/DraftStudio';
import type { StudioSeed } from './studio/studioTypes';
import { CampaignsView } from './components/CampaignsView';
import { ConnectionsView } from './components/ConnectionsView';
import { SettingsScreen } from './components/SettingsScreen';
import { PostEditorDrawer } from './components/PostEditorDrawer';
import { LoadingState, ErrorState } from './components/ui/States';

/**
 * Application root. Wires the navigation views, the persistent post editor modal,
 * and store initialization (loads from mock persistence or seeds sample data).
 */
export default function App({ initialView = 'home' }: { initialView?: View } = {}) {
  const initialize = useStore((s) => s.initialize);
  const loadError = useStore((s) => s.loadError);
  const [view, navigate] = useRoute(initialView);
  const [ready, setReady] = useState(false);
  const [studioSeed, setStudioSeed] = useState<StudioSeed | null>(null);

  const draftFromSource = (seed: StudioSeed) => {
    setStudioSeed(seed);
    navigate('studio');
  };

  useEffect(() => {
    initialize();
    setReady(true);
  }, [initialize]);

  return (
    <div className="flex min-h-screen flex-col bg-surface-950 md:flex-row">
      <a
        href="#main-content"
        className="sr-only left-4 top-4 z-[60] rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white focus:not-sr-only focus:absolute"
      >
        Skip to content
      </a>
      <Sidebar view={view} onChange={navigate} />

      <div className="flex min-w-0 flex-1 flex-col">
        <Header view={view} />

        <main id="main-content" tabIndex={-1} className="flex-1 overflow-x-hidden px-4 py-5 focus:outline-none sm:px-6">
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
              {view === 'home' && <HomeScreen onNavigate={navigate} />}
              {isLibraryView(view) && <LibraryScreen view={view} onChange={navigate} />}
              {view === 'outbox' && (
                <div className="mx-auto max-w-3xl">
                  <OutboxScreen />
                </div>
              )}
              {view === 'analytics' && <Analytics />}
              {view === 'inbox' && (
                <div className="mx-auto max-w-3xl">
                  <SourceInbox onDraft={draftFromSource} />
                </div>
              )}
              {view === 'studio' && (
                <div className="mx-auto max-w-3xl">
                  <DraftStudio seed={studioSeed} />
                </div>
              )}
              {view === 'campaigns' && (
                <div className="mx-auto max-w-3xl">
                  <CampaignsView />
                </div>
              )}
              {view === 'connections' && (
                <div className="mx-auto max-w-3xl">
                  <ConnectionsView />
                </div>
              )}
              {view === 'ideas' && (
                <div className="mx-auto max-w-3xl">
                  <IdeasScreen />
                </div>
              )}
              {view === 'settings' && (
                <div className="mx-auto max-w-3xl">
                  <SettingsScreen />
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
