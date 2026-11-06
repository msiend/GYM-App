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
  return (
    <>
      {["Partial gym", "Limited equipment"].includes(profile.equipment) && (
        <fieldset className="height-input equipment-inventory span2">
          <legend>Your available gym equipment</legend>
          <p className="hint">
            A partial gym uses only the items you select, plus bodyweight
            exercises. Leave unavailable machines unchecked.
          </p>
          <div className="equipment-check-grid">
            {equipmentItems.map(({ id, label }) => (
              <label className="check" key={id}>
                <input
                  type="checkbox"
                  checked={profile.equipmentInventory?.includes(id) || false}
                  onChange={(e) =>
                    onInventoryChange(
                      e.target.checked
                        ? [...(profile.equipmentInventory || []), id]
                        : (profile.equipmentInventory || []).filter(
                            (x) => x !== id,
                          ),
                    )
                  }
                />
                {label}
              </label>
            ))}
          </div>
        </fieldset>
      )}
      <fieldset className="height-input span2">
        <legend>Other equipment you actually have</legend>
        <p className="hint">
          Leave unchecked if unavailable. Plans will avoid exercises that
          require these supports.
        </p>
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
