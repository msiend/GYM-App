import { useState } from "react";
import type { Profile } from "../domain/types";
import { generatePlan } from "../domain/engine";
import { saveProfileAndPlan } from "../data/profile-repository";
import { saveErrorMessage } from "../data/errors";
import { Modal } from "./ui";
import TrainingFields from "./TrainingFields";
import EquipmentFields from "./EquipmentFields";
import PlanPreview from "./PlanPreview";
export default function PlanSettings({
  profile,
  onClose,
}: {
  profile: Profile;
  onClose: () => void;
}) {
  const [p, setP] = useState({ ...profile });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const preview = generatePlan(p);
  const update = (patch: Partial<Profile>) =>
    setP((current) => ({ ...current, ...patch }));
  return (
    <Modal title="Edit your week" onClose={onClose}>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (p.days.length < 2) {
            setError("Choose at least two training days.");
            return;
          }
          if (
            !confirm(
              "Save this weekly plan? Your workout history and active session will be kept.",
            )
          )
            return;
          setBusy(true);
          setError("");
          try {
            await saveProfileAndPlan(p, {
              includeStartingWeight: false,
              plan: preview,
            });
            onClose();
          } catch (error) {
            setError(saveErrorMessage(error, "your plan"));
          } finally {
            setBusy(false);
          }
        }}
      >
        <TrainingFields profile={p} onChange={update} />
        <EquipmentFields profile={p} onChange={update} />
        <PlanPreview plan={preview} />
        {error && (
          <p role="alert" className="danger">
            {error}
          </p>
        )}
        <footer className="form-footer">
          <button type="button" className="button secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="button" type="submit" disabled={busy}>
            {busy ? "Saving…" : "Save plan"}
          </button>
        </footer>
      </form>
    </Modal>
  );
}
