import type { Platform } from '../../types';
import { PLATFORMS, getPlatformMeta } from '../../lib/platforms';
import { Label, ToggleGroup } from '../ui';
import { PLATFORM_GLYPHS } from '../icons';

interface PlatformPickerProps {
  value: Platform;
  onChange: (platform: Platform) => void;
}

/** Segmented platform selector. */
export function PlatformPicker({ value, onChange }: PlatformPickerProps) {
  return (
    <div>
      <Label>Platform</Label>
      <ToggleGroup
        ariaLabel="Platform"
        value={value}
        onChange={(v) => v && onChange(v)}
        options={PLATFORMS.map((p) => {
          const meta = getPlatformMeta(p);
          const Glyph = PLATFORM_GLYPHS[p];
          return {
            value: p,
            activeColor: meta.color,
            label: (
              <>
                <Glyph width={16} height={16} />
                <span className="text-xs">{meta.name}</span>
              </>
            ),
          };
        })}
      />
    </div>
  );
}
