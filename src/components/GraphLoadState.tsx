import { AlertCircle, LoaderCircle } from "lucide-react";

type GraphLoadStateProps =
  { kind: "loading" } | { kind: "error"; message: string };

export function GraphLoadState(props: GraphLoadStateProps) {
  if (props.kind === "loading") {
    return (
      <main className="state-page">
        <LoaderCircle
          className="animate-spin text-indigo-600"
          aria-hidden="true"
        />
        <p>Loading task graph…</p>
      </main>
    );
  }
  return (
    <main className="state-page text-rose-700" role="alert">
      <AlertCircle aria-hidden="true" />
      <div>
        <h1 className="font-semibold">Could not open the task graph</h1>
        <p className="mt-1 text-sm">{props.message}</p>
      </div>
    </main>
  );
}
