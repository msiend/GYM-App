import type { Profile } from "../domain/types";
import { equipmentOptions } from "../domain/equipment";
import EquipmentSupports from "./EquipmentSupports";
export default function EquipmentFields({
  profile,
  onChange,
}: {
  profile: Profile;
  onChange: (patch: Partial<Profile>) => void;
}) {
  return (
    <div className="equipment-fields">
      <label>
        Equipment
        <select
          aria-label="Equipment"
          value={profile.equipment}
          onChange={(e) => onChange({ equipment: e.target.value })}
        >
          {equipmentOptions.map((value) => (
            <option key={value} value={value}>
              {value === "Partial gym" ? "Partial / half gym" : value}
            </option>
          ))}
        </select>
      </label>
      <EquipmentSupports
        profile={profile}
        onChange={(supports) => onChange({ supports })}
        onInventoryChange={(equipmentInventory) =>
          onChange({ equipmentInventory })
        }
      />
    </div>
  );
}
