export default function Card({ children, className = '', style = undefined }) {
  return <div className={`card ${className}`.trim()} style={style}>{children}</div>;
}
