import { useObjectUrl } from '@lib/hooks'
import { CATEGORY_LABEL } from '@lib/outfits'

export default function GarmentCard({ item, onDelete, onToggleFavorite, compact = false }) {
  const url = useObjectUrl(item.blob)
  return (
    <div className={`garment ${compact ? 'compact' : ''}`}>
      <div className="garment-img">
        {url ? <img src={url} alt={item.name} /> : <div className="skeleton" />}
        <span className="swatch" style={{ background: item.color }} title={item.color} />
        {onToggleFavorite ? (
          <button
            type="button"
            className={`fav ${item.favorite ? 'on' : ''}`}
            onClick={() => onToggleFavorite(item)}
            aria-label={item.favorite ? 'Remove from favourites' : 'Mark as favourite'}
          >
            {item.favorite ? '♥' : '♡'}
          </button>
        ) : null}
      </div>
      {!compact && (
        <div className="garment-meta">
          <div>
            <div className="garment-name">{item.name}</div>
            <div className="muted small">{CATEGORY_LABEL[item.category] || item.category}</div>
          </div>
          {onDelete ? (
            <button type="button" className="icon-btn" onClick={() => onDelete(item)} aria-label="Delete">
              ✕
            </button>
          ) : null}
        </div>
      )}
    </div>
  )
}
