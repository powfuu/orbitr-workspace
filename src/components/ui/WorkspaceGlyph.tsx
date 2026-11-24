export function WorkspaceGlyph({ name, size = 20 }: { name: string; hue?: number; size?: number }) {
  return (
    <span
      className="grid shrink-0 place-items-center rounded-md bg-fg font-bold text-bg"
      style={{ width: size, height: size, fontSize: size * 0.5 }}
    >
      {name.charAt(0).toUpperCase()}
    </span>
  );
}
