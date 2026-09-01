import { CheckBold } from './Icons'

export default function Toast({ message, color }) {
  if (!message) return null
  return (
    <div className="ag-toast">
      <span
        className="ag-avatar"
        style={{ width: 16, height: 16, borderRadius: '50%', background: color }}
      >
        <CheckBold />
      </span>
      <span style={{ fontSize: 13, fontWeight: 500 }}>{message}</span>
    </div>
  )
}
