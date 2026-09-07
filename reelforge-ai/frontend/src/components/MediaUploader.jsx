import { useCallback, useRef, useState } from 'react';

/**
 * Drag-and-drop media uploader.
 * @param mediaList array of already uploaded media {id, file_url, file_type, original_name}
 * @param onUpload(file, fileType) called for new uploads
 * @param onRemove(mediaId) called to delete a media item
 * @param allowedTypes 'image' | 'video' | 'all'
 */
export default function MediaUploader({ mediaList = [], onUpload, onRemove, allowedTypes = 'all', maxFiles = 6 }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const fileTypeAllowed = (file) => {
    if (allowedTypes === 'image') return file.type.startsWith('image/');
    if (allowedTypes === 'video') return file.type.startsWith('video/');
    return file.type.startsWith('image/') || file.type.startsWith('video/');
  };

  const handleFiles = useCallback(
    async (files) => {
      setError('');
      const list = Array.from(files);
      if (mediaList.length + list.length > maxFiles) {
        setError(`You can upload up to ${maxFiles} files.`);
        return;
      }
      const invalid = list.filter((f) => !fileTypeAllowed(f));
      if (invalid.length) {
        setError('Only image and video files are supported.');
        return;
      }
      const tooLarge = list.some((f) => f.size > 50 * 1024 * 1024);
      if (tooLarge) {
        setError('Each file must be under 50 MB.');
        return;
      }
      setBusy(true);
      try {
        for (const file of list) {
          const type = file.type.startsWith('video/') ? 'video' : 'image';
          await onUpload(file, type);
        }
      } finally {
        setBusy(false);
      }
    },
    [mediaList.length, maxFiles, onUpload]
  );

  const onDrop = useCallback(
    (e) => {
      e.preventDefault();
      setDragging(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  return (
    <div>
      <div
        className={`upload-zone ${dragging ? 'dragging' : ''} ${busy ? 'busy' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
      >
        <div className="upload-icon">📁</div>
        <p><strong>Drag &amp; drop</strong> your photos or videos here</p>
        <p className="small muted">or click to browse · JPG, PNG, WebP, MP4, MOV · max 50 MB</p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={allowedTypes === 'image' ? 'image/*' : 'image/*,video/*'}
          style={{ display: 'none' }}
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>
      {error && <div className="field-error">{error}</div>}
      <div className="media-grid">
        {mediaList.map((m) => (
          <div className="media-card" key={m.id}>
            {m.file_type === 'video' ? (
              <video src={m.file_url} muted />
            ) : (
              <img src={m.file_url} alt={m.original_name || 'media'} />
            )}
            <div className="media-card-overlay">
              <span className="badge">{m.file_type === 'logo' ? 'Logo' : m.file_type === 'video' ? 'Video' : 'Image'}</span>
              <button
                type="button"
                className="media-remove"
                onClick={(e) => { e.stopPropagation(); onRemove(m.id); }}
                aria-label="Remove"
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}