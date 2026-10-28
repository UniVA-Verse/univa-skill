"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { Message, ReviewDecision } from "./types";
function PlanValue({ value, depth = 0 }: { value: unknown; depth?: number }) {
  if (value === null || value === undefined) return <span>None</span>;
  if (typeof value !== "object")
    return (
      <span className="whitespace-pre-wrap break-words">{String(value)}</span>
    );
  if (Array.isArray(value))
    return (
      <ol className="space-y-2 list-decimal pl-5">
        {value.map((item, n) => (
          <li key={n}>
            <PlanValue value={item} depth={depth + 1} />
          </li>
        ))}
      </ol>
    );
  return (
    <dl className="space-y-2">
      {Object.entries(value).map(([key, item]) => (
        <div key={key} className="border-l pl-3">
          <dt className="font-medium capitalize">{key.replaceAll("_", " ")}</dt>
          <dd className="text-sm">
            <PlanValue value={item} depth={depth + 1} />
          </dd>
        </div>
      ))}
    </dl>
  );
}
export function PipelineInteractionCard({
  message,
  onResume,
  isLoading = false,
}: {
  message: Message;
  onResume: (input: string, review?: ReviewDecision) => Promise<void>;
  isLoading?: boolean;
}) {
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const data = message.interactionData ?? {};
  const version =
    typeof data.plan_version === "string" ? data.plan_version : "";
  const plan = data.plan ?? data;
  const act = async (decision: ReviewDecision["decision"], text: string) => {
    if (!version || !message.continuationToken) return;
    setSubmitting(true);
    try {
      await onResume(text, {
        decision,
        plan_version: version,
        continuation_token: message.continuationToken,
      });
    } finally {
      setSubmitting(false);
    }
  };
  const download = () => {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify({ plan_version: version, plan }, null, 2)], {
        type: "application/json",
      })
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `univa-plan-${version.slice(0, 12)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const disabled =
    isLoading || submitting || !version || !message.continuationToken;
  return (
    <section
      className="space-y-3 rounded border p-4"
      aria-label="Media plan review"
    >
      <h3 className="font-semibold">
        {message.interactionType === "user_choice"
          ? "Choose a proposal"
          : "Review the complete plan"}
      </h3>
      <p className="text-xs">
        Approval applies to this version only. Generating or editing media may
        incur provider charges.
      </p>
      <details open>
        <summary className="cursor-pointer">
          Complete prompts, parameters and source details
        </summary>
        <div className="max-h-96 overflow-auto p-2">
          <PlanValue value={plan} />
        </div>
      </details>
      <Button variant="outline" onClick={download}>
        Download complete plan
      </Button>
      {!version && (
        <p role="alert">
          This older review has no version. Reload the current pipeline state
          before approving.
        </p>
      )}
      <textarea
        aria-label="Revision notes"
        className="w-full rounded border bg-background p-2"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Choose a proposal or describe changes"
      />
      <div className="flex flex-wrap gap-2">
        <Button
          disabled={disabled}
          onClick={() => act("approve", notes || "Confirm")}
        >
          {message.interactionType === "user_choice"
            ? "Select proposal"
            : "Approve this version"}
        </Button>
        <Button
          variant="outline"
          disabled={disabled || !notes.trim()}
          onClick={() => act("revise", notes)}
        >
          Revise plan
        </Button>
        <Button
          variant="outline"
          disabled={disabled}
          onClick={() => act("cancel", "Cancel")}
        >
          Cancel
        </Button>
      </div>
    </section>
  );
}
