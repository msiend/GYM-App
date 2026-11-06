import type { Profile } from "../domain/types";
import { equipmentItems } from "../domain/equipment";

export default function EquipmentSupports({
  profile,
  onChange,
  onInventoryChange,
}: {
  profile: Profile;
  onChange: (supports: NonNullable<Profile["supports"]>) => void;
  onInventoryChange: (
    items: NonNullable<Profile["equipmentInventory"]>,
  ) => void;
}) {
  if (profile.equipment === "Full gym") return null;
  const options = [
    ["bench", "A stable exercise bench"],
    ["anchor", "A rated resistance-band anchor, installed as instructed"],
    ["step", "A stable exercise step/platform"],
  ] as const;
  const common = new Set([
    "dumbbells",
    "bands",
    "barbell",
    "rack",
    "cable",
    "dual-cable",
    "pulldown",
    "leg-press",
  ]);
  const item = ({ id, label }: (typeof equipmentItems)[number]) => (
    <label className="check" key={id}>
      <input
        type="checkbox"
        checked={profile.equipmentInventory?.includes(id) || false}
        onChange={(e) =>
          onInventoryChange(
            e.target.checked
              ? [...(profile.equipmentInventory || []), id]
              : (profile.equipmentInventory || []).filter(
                  (value) => value !== id,
                ),
          )
        }
      />
      {label}
    </label>
  );
  return (
    <>
      {["Partial gym", "Limited equipment"].includes(profile.equipment) && (
        <fieldset className="height-input equipment-inventory span2">
          <legend>Your available gym equipment</legend>
          <p className="hint">Only selected equipment will be used.</p>
          <div className="equipment-check-grid">
            {equipmentItems.filter((e) => common.has(e.id)).map(item)}
          </div>
          <details className="form-details">
            <summary>Other machines</summary>
            <div className="equipment-check-grid">
              {equipmentItems.filter((e) => !common.has(e.id)).map(item)}
            </div>
          </details>
        </fieldset>
      )}
      <fieldset className="height-input span2">
        <legend>Optional supports</legend>
        {options.map(([key, label]) => (
          <label className="check" key={key}>
            <input
              type="checkbox"
              checked={profile.supports?.includes(key) || false}
              onChange={(e) =>
                onChange(
                  e.target.checked
                    ? [...(profile.supports || []), key]
                    : (profile.supports || []).filter((s) => s !== key),
                )
              }
            />
            {label}
          </label>
        ))}
      </fieldset>
    </>
  );
}
