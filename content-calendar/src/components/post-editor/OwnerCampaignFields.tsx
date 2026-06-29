import type { PostDraft } from '../../types';
import { Input, Label } from '../ui';

interface OwnerCampaignFieldsProps {
  owner: string | undefined;
  campaign: string | undefined;
  onChange: <K extends 'owner' | 'campaign'>(key: K, value: PostDraft[K]) => void;
}

/** Ownership + campaign attribution. */
export function OwnerCampaignFields({ owner, campaign, onChange }: OwnerCampaignFieldsProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div>
        <Label htmlFor="post-owner">Owner</Label>
        <Input
          id="post-owner"
          placeholder="Who's responsible?"
          value={owner ?? ''}
          onChange={(e) => onChange('owner', e.target.value || undefined)}
        />
      </div>
      <div>
        <Label htmlFor="post-campaign">Campaign</Label>
        <Input
          id="post-campaign"
          placeholder="e.g. Spring launch"
          value={campaign ?? ''}
          onChange={(e) => onChange('campaign', e.target.value || undefined)}
        />
      </div>
    </div>
  );
}
