import type { ContentItem, ContentVariant } from '../content/contentTypes';
import { Drawer } from './ui';
import { PublishAssistant } from './PublishAssistant';
import { StatusTimeline } from './StatusTimeline';
import { CommentsSection } from './CommentsSection';
import { ChecklistSection } from './ChecklistSection';
import { AssetsSection } from './AssetsSection';
import { CopyEditor, PublishingGate, ReviewGate, VariantMeta, useVariantEditor } from './variant-drawer';

/**
 * The editor workspace: a right side-drawer (calendar/list/board stay visible)
 * for one ContentVariant — strategy fields, copy editing, and the explicit
 * review → publish gate. A presentational shell; logic lives in
 * `useVariantEditor` and each gate is its own component.
 */
export function VariantDrawer({
  item,
  variant,
  open,
  onClose,
  onChange,
}: {
  item: ContentItem;
  variant: ContentVariant;
  open: boolean;
  onClose: () => void;
  onChange: (v: ContentVariant) => void;
}) {
  const v = useVariantEditor({ item, variant, onChange });

  return (
    <Drawer open={open} title={`${variant.channel} · ${variant.format}`} onClose={onClose}>
      <div className="space-y-5">
        <VariantMeta item={item} variant={variant} exportable={v.exportable} blockerCount={v.blockers.length} />

        <CopyEditor
          hook={v.hook}
          body={v.body}
          hashtags={v.hashtags}
          dirty={v.dirty}
          saving={v.busy === 'save'}
          onHook={v.setHook}
          onBody={v.setBody}
          onHashtags={v.setHashtags}
          onSave={v.save}
        />

        <ReviewGate
          variant={variant}
          busy={v.busy}
          onSafety={v.runSafetyReview}
          onCitation={v.runCitationReview}
          onMarkReviewed={v.markReviewed}
        />

        <PublishingGate
          item={item}
          variant={variant}
          exportable={v.exportable}
          blockers={v.blockers}
          suggestions={v.suggestions}
          busy={v.busy}
          onScheduleDefault={v.scheduleDefault}
          onScheduleSuggestion={v.scheduleSuggestion}
          onPublish={v.publish}
        />

        {/* Copy the approved text out and record where you posted it. */}
        {variant.status === 'exported' && <PublishAssistant variant={variant} />}

        {/* Lifecycle history (approval-workflow audit trail). */}
        <StatusTimeline variant={variant} />

        {/* Pre-publish QA checklist on the parent item. */}
        <ChecklistSection itemId={item.id} />

        {/* Media attachments on the parent item. */}
        <AssetsSection itemId={item.id} />

        {/* Collaboration thread on the parent item. */}
        <CommentsSection itemId={item.id} />

        {v.error && <p role="alert" className="text-xs text-status-overdue">{v.error}</p>}
      </div>
    </Drawer>
  );
}
