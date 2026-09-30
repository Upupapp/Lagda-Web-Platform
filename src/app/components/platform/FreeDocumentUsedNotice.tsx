// "You've used your free document" (backend 093): shown where a Free owner's
// workspace would send a second document. The owner upgrades; anyone else
// asks the owner. The same "pass" as every other plan lock.

import { FileLock2 } from "lucide-react";
import { useWorkspacePlan } from "../../hooks/usePlans";
import { PlanPassCard, PlanTiles } from "./PlanPass";

export function FreeDocumentUsedNotice() {
  const { info } = useWorkspacePlan();
  const owner = info?.ownerIsYou ?? true;
  return (
    <div role="alert">
      <PlanPassCard
        testId="free-document-used"
        compact
        icon={<FileLock2 size={17} />}
        chip="Free plan"
        title="You've used your free document"
        body={<p>{owner
          ? "Choose Personal or Business to send more. You can send this draft once your plan is active."
          : "This workspace is on its owner's Free plan. Ask the owner to choose Personal or Business to send more."}</p>}
        {...(owner ? {
          cta: { to: "/app/settings/plan", label: "See plans", testId: "free-document-see-plans" },
          note: "Your draft is kept · Test mode, no money is moved",
          aside: <PlanTiles requires="personal" highlight="50 documents a month" />,
        } : { askOwner: "Ask the owner to upgrade" })}
      />
    </div>
  );
}
