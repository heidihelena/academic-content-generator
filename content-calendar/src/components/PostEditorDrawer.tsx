import { Callout, ConfirmDialog, Drawer, Label } from './ui';
import { PostPreview } from './PostPreview';
import {
  BriefFields,
  CaptionField,
  EvidenceSource,
  MediaField,
  OwnerCampaignFields,
  PlatformPicker,
  PostEditorFooter,
  ReachCheck,
  ReviewPanel,
  SchedulePublishFields,
  ThreadComposer,
  usePostEditor,
} from './post-editor';

/**
 * Create/edit panel for a single post, rendered as a right-side drawer so the
 * calendar stays visible while editing. This is a presentational shell: all
 * behaviour lives in `usePostEditor`, and each section is its own component.
 */
export function PostEditorDrawer() {
  const editor = usePostEditor();
  const {
    isOpen,
    existing,
    isNew,
    draft,
    meta,
    account,
    charCount,
    overLimit,
    people,
    latestReview,
    readability,
    verdict,
    reachFindings,
    reach,
    threadParts,
    missingSource,
    hasBody,
    showThread,
    showReview,
    showChangesNote,
    accountConnected,
    publishTarget,
    publishError,
    publishingId,
    isPublishing,
    isPublished,
    canSave,
    canPublish,
    fileInputRef,
    uploading,
    uploadError,
    changeNote,
    setChangeNote,
    showNote,
    setShowNote,
    confirm,
    setConfirm,
    update,
    updateSource,
    setSourceLink,
    addMedia,
    removeMedia,
    onPickFile,
    onApprove,
    onRequestChanges,
    doPublish,
    savePost,
    deletePost,
    createThread,
    closeEditor,
  } = editor;

  return (
    <>
      <Drawer
        open={isOpen}
        title={existing ? 'Edit post' : 'New post'}
        onClose={closeEditor}
        footer={
          <PostEditorFooter
            isNew={isNew}
            platform={draft.platform}
            accountConnected={accountConnected}
            canSave={canSave}
            canPublish={canPublish}
            isPublishing={isPublishing}
            isPublished={isPublished}
            onDelete={() => setConfirm('delete')}
            onCancel={closeEditor}
            onSave={() => savePost(draft)}
            onPublish={() => setConfirm('publish')}
          />
        }
      >
        <div className="space-y-4">
          {existing && publishError && publishingId === null && (
            <p role="alert" data-testid="publish-error" className="rounded-md bg-status-failed/10 px-3 py-2 text-xs text-status-failed">
              Couldn’t publish: {publishError}
            </p>
          )}
          {isPublished && existing?.permalink && (
            <p className="rounded-md bg-status-published/10 px-3 py-2 text-xs text-status-published">
              Published —{' '}
              <a className="underline" href={existing.permalink} target="_blank" rel="noreferrer">
                view post
              </a>
            </p>
          )}

          <PlatformPicker value={draft.platform} onChange={(p) => update('platform', p)} />

          <BriefFields draft={draft} onChange={update} />

          <EvidenceSource
            evidenceLevel={draft.evidenceLevel}
            source={draft.source}
            missingSource={missingSource}
            onEvidenceChange={(level) => update('evidenceLevel', level)}
            onSourceLink={setSourceLink}
            onSourceField={updateSource}
          />

          <CaptionField
            body={draft.body}
            platformName={meta.name}
            characterLimit={meta.characterLimit}
            charCount={charCount}
            overLimit={overLimit}
            readability={readability}
            verdict={verdict}
            onChange={(body) => update('body', body)}
          />

          {hasBody && <ReachCheck findings={reachFindings} reach={reach} />}

          {showThread && (
            <ThreadComposer
              parts={threadParts}
              platformName={meta.name}
              characterLimit={meta.characterLimit}
              onCreate={() => createThread(draft)}
            />
          )}

          <SchedulePublishFields
            scheduledAt={draft.scheduledAt}
            status={draft.status}
            onScheduleChange={(iso) => update('scheduledAt', iso)}
            onStatusChange={(status) => update('status', status)}
          />

          {showChangesNote && latestReview && (
            <Callout data-testid="changes-requested-note" tone="warn">
              <span className="font-semibold">Changes requested</span>
              {latestReview.reviewer ? ` by ${latestReview.reviewer}` : ''}: {latestReview.note}
            </Callout>
          )}

          {showReview && (
            <ReviewPanel
              reviewer={draft.reviewer}
              evidenceLevel={draft.evidenceLevel}
              source={draft.source}
              missingSource={missingSource}
              people={people}
              showNote={showNote}
              changeNote={changeNote}
              onReviewerChange={(reviewer) => update('reviewer', reviewer)}
              onChangeNote={setChangeNote}
              onShowNote={setShowNote}
              onApprove={onApprove}
              onRequestChanges={onRequestChanges}
            />
          )}

          <OwnerCampaignFields owner={draft.owner} campaign={draft.campaign} onChange={update} />

          <MediaField
            media={draft.media}
            uploading={uploading}
            uploadError={uploadError}
            fileInputRef={fileInputRef}
            onAdd={addMedia}
            onRemove={removeMedia}
            onPickFile={onPickFile}
          />

          <div>
            <Label>Preview</Label>
            <PostPreview
              platform={draft.platform}
              body={draft.body}
              account={account}
              hasMedia={draft.media.length > 0}
              mediaLabel={draft.media[0]?.label}
            />
          </div>
        </div>
      </Drawer>

      <ConfirmDialog
        open={confirm === 'publish'}
        title="Publish now?"
        message={`This posts publicly to ${publishTarget} right now. You can't unpublish it from here.`}
        confirmLabel="Post now"
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          setConfirm(null);
          void doPublish();
        }}
      />
      <ConfirmDialog
        open={confirm === 'delete'}
        title="Delete this post?"
        message="This removes the draft for good. This can't be undone."
        confirmLabel="Delete"
        danger
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          setConfirm(null);
          if (existing) deletePost(existing.id);
        }}
      />
    </>
  );
}
