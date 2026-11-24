export function WorkspaceGlyph({ name, size = 20 }: { name: string; hue?: number; size?: number }) {
  return (
    <span
      className="grid shrink-0 place-items-center rounded-md bg-white font-bold text-black"
      style={{ width: size, height: size, fontSize: size * 0.5 }}
    >
      {name.charAt(0).toUpperCase()}
    </span>
  );
}
