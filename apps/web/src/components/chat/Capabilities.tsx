"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
type Capability = {
  status: "configured" | "missing_configuration" | "unavailable";
  reason: string;
  verified: boolean;
};
export function Capabilities() {
  const [items, setItems] = useState<Record<string, Capability>>({});
  const [error, setError] = useState("");
  const load = async () => {
    try {
      const response = await fetch("/api/capabilities");
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setItems(data.capabilities);
      setError("");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Cannot inspect capabilities"
      );
    }
  };
  useEffect(() => {
    load();
  }, []);
  return (
    <details className="rounded border p-3 text-xs">
      <summary className="cursor-pointer">Provider configuration</summary>
      {error && <p role="status">{error}</p>}
      <dl className="space-y-2 py-2">
        {Object.entries(items).map(([name, item]) => (
          <div key={name}>
            <dt className="font-medium capitalize">
              {name.replaceAll("_", " ")}:{" "}
              {item.status === "configured"
                ? "Configured (unverified)"
                : item.status === "missing_configuration"
                  ? "Needs configuration"
                  : "Unavailable"}
            </dt>
            <dd className="text-muted-foreground">{item.reason}</dd>
          </div>
        ))}
      </dl>
      <Button variant="outline" size="sm" onClick={() => load()}>
        Refresh configuration
      </Button>
    </details>
  );
}
