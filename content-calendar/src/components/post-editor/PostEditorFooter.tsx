import type { Platform } from '../../types';
import { Button } from '../ui';
import { TrashIcon, CheckIcon } from '../icons';

interface PostEditorFooterProps {
  isNew: boolean;
  platform: Platform;
  accountConnected: boolean;
  canSave: boolean;
  canPublish: boolean;
  isPublishing: boolean;
  isPublished: boolean;
  onDelete: () => void;
  onCancel: () => void;
  onSave: () => void;
  onPublish: () => void;
}

/** The drawer's action bar: Delete / Cancel / Save, plus Publish for saved posts. */
export function PostEditorFooter({
  isNew,
  platform,
  accountConnected,
  canSave,
  canPublish,
  isPublishing,
  isPublished,
  onDelete,
  onCancel,
  onSave,
  onPublish,
}: PostEditorFooterProps) {
  return (
    <>
      {!isNew && (
        <Button variant="danger" className="mr-auto" onClick={onDelete}>
          <TrashIcon width={15} height={15} /> Delete
        </Button>
      )}
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
