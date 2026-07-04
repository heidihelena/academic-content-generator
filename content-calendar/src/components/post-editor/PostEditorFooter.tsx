import type { Platform } from '../../types';
import { Button } from '../ui';
import { TrashIcon, CheckIcon, CopyIcon } from '../icons';

interface PostEditorFooterProps {
  isNew: boolean;
  platform: Platform;
  accountConnected: boolean;
  canSave: boolean;
  canPublish: boolean;
  isPublishing: boolean;
  isPublished: boolean;
  /** Fan the draft out to every other platform as editable draft copies. */
  onCopyToAll: () => void;
  copiedCount: number | null;
  onDelete: () => void;
  onCancel: () => void;
  onSave: () => void;
  onPublish: () => void;
}

/** The drawer's action bar: Delete / Copy-to-all / Cancel / Save, plus Publish for saved posts. */
export function PostEditorFooter({
  isNew,
  platform,
  accountConnected,
  canSave,
  canPublish,
  isPublishing,
  isPublished,
  onCopyToAll,
  copiedCount,
  onDelete,
  onCancel,
  onSave,
  onPublish,
}: PostEditorFooterProps) {
  return (
    <>
      {!isNew && (
        <Button variant="danger" onClick={onDelete}>
          <TrashIcon width={15} height={15} /> Delete
        </Button>
      )}
      <Button
        variant="secondary"
        className="mr-auto"
        disabled={!canSave || copiedCount != null}
        title="Create an editable draft of this post for every other platform"
        onClick={onCopyToAll}
      >
        <CopyIcon width={15} height={15} />
        {copiedCount != null ? `Copied to ${copiedCount} platforms` : 'Copy to all platforms'}
      </Button>
      <Button variant="secondary" onClick={onCancel}>
        Cancel
      </Button>
      <Button variant="secondary" disabled={!canSave} onClick={onSave}>
        Save post
      </Button>
      {!isNew && (
        <Button
          loading={isPublishing}
          disabled={!canPublish || isPublishing || isPublished}
          title={accountConnected ? undefined : `Connect ${platform} on the Connections screen to publish`}
          onClick={onPublish}
        >
          {!isPublishing && <CheckIcon width={15} height={15} />}
          {isPublished ? 'Published' : isPublishing ? 'Publishing…' : 'Publish now'}
        </Button>
      )}
    </>
  );
}
