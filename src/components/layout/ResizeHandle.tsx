import { useResize } from "../../hooks/useResize";

interface Props {
  width: number;
  onChange: (w: number) => void;
  dir: 1 | -1;
  label: string;
}

export function ResizeHandle({ width, onChange, dir, label }: Props) {
  const onPointerDown = useResize(width, onChange, dir);
  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={label}
      onPointerDown={onPointerDown}
      className="group relative z-10 w-px shrink-0 cursor-col-resize bg-line-soft"
    >
      <span className="absolute inset-y-0 -left-1 -right-1" />
      <span className="absolute inset-y-0 left-0 w-px bg-accent opacity-0 transition-opacity delay-75 group-hover:opacity-70 group-active:opacity-100" />
    </div>
  );
}
