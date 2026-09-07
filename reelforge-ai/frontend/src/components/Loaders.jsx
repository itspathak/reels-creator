export function Spinner({ size = 20 }) {
  return <span className="spinner" style={{ width: size, height: size, borderWidth: 3 }} />;
}

export function Skeleton({ width = '100%', height = 20, borderRadius = 10, style = {} }) {
  return <div className="skeleton" style={{ width, height, borderRadius, ...style }} />;
}