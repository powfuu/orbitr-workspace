import { Component, type ReactNode } from "react";
import { TriangleAlert } from "lucide-react";

/** Contains a crash to one region of the UI; sessions keep running underneath. */
export class ErrorBoundary extends Component<{ children: ReactNode; label: string }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error(`[${this.props.label}]`, error);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="grid h-full place-items-center p-6">
        <div className="max-w-sm text-center">
          <TriangleAlert size={20} className="mx-auto mb-3 text-error" />
          <div className="text-[13px] font-medium text-fg">{this.props.label} hit an error</div>
          <div className="selectable mt-1 font-mono text-[11px] text-muted">{this.state.error.message}</div>
          <button onClick={() => this.setState({ error: null })} className="mt-4 h-7 rounded-md px-3 text-[12px] text-fg ring-1 ring-line hover:bg-surface">
            Try again
          </button>
        </div>
      </div>
    );
  }
}
