import DOMPurify from 'dompurify';
import { marked } from 'marked';
import { useEffect, useRef, useState } from 'react';
import '../styles/components/SideGuide.css';

/**
 * SideGuide
 * Props:
 * - guideKey: string (will fetch /guides/{guideKey}.md from public folder)
 * - side: 'right' | 'left' (default 'right')
 * - defaultOpen: boolean
 */
export default function SideGuide({ guideKey, side = 'right', defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  const [width, setWidth] = useState(420);
  const [contentHtml, setContentHtml] = useState('<p>Loading guide...</p>');
  const [error, setError] = useState(null);
  
  // Draggable state
  const [localSide, setLocalSide] = useState(side);
  const [top, setTop] = useState('15%');
  const [isDragging, setIsDragging] = useState(false);
  const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 });
  const [previewSide, setPreviewSide] = useState(null); // 'left' or 'right' when dragging
  
  // Attention Flashing State
  const [isFlashing, setIsFlashing] = useState(!defaultOpen);
  const [isResizing, setIsResizing] = useState(false);

  const resizerRef = useRef(null);
  const panelRef = useRef(null);
  const dragOffset = useRef({ x: 0, y: 0 });

  // Fetch content
  useEffect(() => {
    const path = `./guides/${guideKey}.md`;
    fetch(path)
      .then((res) => {
        if (!res.ok) throw new Error(`Guide not found: ${path}`);
        return res.text();
      })
      .then((md) => {
        const raw = marked.parse(md || '');
        const clean = DOMPurify.sanitize(raw);
        setContentHtml(clean);
      })
      .catch((err) => {
        setError(err.message);
        setContentHtml('<p>Guide not available.</p>');
      });
  }, [guideKey]);

  // Track open state for effect without dependency
  const openRef = useRef(open);
  useEffect(() => {
    openRef.current = open;
  }, [open]);

  // Flashing Logic: Start on new page if closed
  useEffect(() => {
    if (!openRef.current) {
      setIsFlashing(true);
      const timer = setTimeout(() => {
        setIsFlashing(false);
      }, 10000); // Stop after 10 seconds
      return () => clearTimeout(timer);
    }
  }, [guideKey]);

  // Flashing Logic: Stop when opened
  useEffect(() => {
    if (open) {
      setIsFlashing(false);
    }
  }, [open]);

  // Resizer Logic
  useEffect(() => {
    const resizer = resizerRef.current;
    if (!resizer) return;

    let startX = 0;
    let startWidth = 0;

    function onMouseDown(e) {
      startX = e.clientX;
      startWidth = width;
      setIsResizing(true); // Start resizing
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
      document.body.style.cursor = 'col-resize';
      e.preventDefault();
    }

    function onMouseMove(e) {
      const delta = localSide === 'right' ? startX - e.clientX : e.clientX - startX;
      const next = Math.max(280, Math.min(900, startWidth + delta));
      setWidth(next);
    }

    function onMouseUp() {
      setIsResizing(false); // Stop resizing
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = '';
    }

    resizer.addEventListener('mousedown', onMouseDown);
    return () => {
      resizer.removeEventListener('mousedown', onMouseDown);
    };
  }, [resizerRef, width, localSide]);

  // Sync state with body classes and CSS variables for layout coordination
  useEffect(() => {
    const body = document.body;
    
    // Set classes
    body.classList.add('side-guide-visible');
    if (localSide === 'left') {
      body.classList.add('side-guide-left');
      body.classList.remove('side-guide-right');
    } else {
      body.classList.add('side-guide-right');
      body.classList.remove('side-guide-left');
    }

    // Set width variable
    const currentWidth = open ? width : (localSide === 'left' ? 20 : 44); // 20px approx for 1% or closed state
    body.style.setProperty('--side-guide-width', `${currentWidth}px`);

    return () => {
      body.classList.remove('side-guide-visible', 'side-guide-left', 'side-guide-right');
      body.style.removeProperty('--side-guide-width');
    };
  }, [open, width, localSide]);

  const hasDragged = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });

  // Drag Handler for Closed State
  const handleMouseDown = (e) => {
    if (open) return; // Only draggable when closed
    
    e.preventDefault();
    setIsDragging(true);
    setPreviewSide(localSide);
    hasDragged.current = false;
    dragStart.current = { x: e.clientX, y: e.clientY };
    
    const rect = panelRef.current.getBoundingClientRect();
    dragOffset.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
    
    // Initialize drag position (only Y matters for constrained drag)
    setDragPosition({ x: rect.left, y: rect.top });

    const moveHandler = (moveEvent) => {
      // Check for significant movement
      if (!hasDragged.current) {
        const dx = Math.abs(moveEvent.clientX - dragStart.current.x);
        const dy = Math.abs(moveEvent.clientY - dragStart.current.y);
        if (dx > 5 || dy > 5) {
          hasDragged.current = true;
        }
      }

      // Constrained Drag: Only update Y
      const newY = moveEvent.clientY - dragOffset.current.y;
      setDragPosition(prev => ({ ...prev, y: newY }));
      
      // Determine preview side based on mouse X
      const screenWidth = window.innerWidth;
      const currentX = moveEvent.clientX;
      const newPreviewSide = currentX < screenWidth / 2 ? 'left' : 'right';
      setPreviewSide(newPreviewSide);
    };

    const upHandler = (upEvent) => {
      document.removeEventListener('mousemove', moveHandler);
      document.removeEventListener('mouseup', upHandler);
      setIsDragging(false);
      setPreviewSide(null);

      // Commit the side change
      const screenWidth = window.innerWidth;
      const finalX = upEvent.clientX;
      const newSide = finalX < screenWidth / 2 ? 'left' : 'right';
      setLocalSide(newSide);
      
      // Save vertical position
      const rect = panelRef.current.getBoundingClientRect();
      setTop(`${rect.top}px`);
    };

    document.addEventListener('mousemove', moveHandler);
    document.addEventListener('mouseup', upHandler);
  };

  // Calculate styles
  const style = {
    width: open ? width : undefined,
    transition: isResizing ? 'none' : undefined, // Disable transition during resize
  };

  if (!open) {
    if (isDragging) {
      style.position = 'fixed';
      style.top = dragPosition.y;
      style.bottom = 'auto';
      style.marginTop = 0;
      style.transition = 'none';
      
      // Constrain horizontal position to the current side
      if (localSide === 'left') {
        style.left = 0;
        style.right = 'auto';
      } else {
        style.right = 0;
        style.left = 'auto';
      }
    } else {
      style.top = top;
      style.marginTop = 0;
      // left/right handled by CSS classes
    }
  }

  return (
    <>
      {/* Ghost Preview Element */}
      {isDragging && previewSide && previewSide !== localSide && (
        <div 
          className={`side-guide side-guide--${previewSide} closed side-guide-ghost`}
          style={{
            top: dragPosition.y,
            marginTop: 0,
            position: 'fixed',
            height: '40px', // Match toggle height
            width: '40px',
            zIndex: 1100 // Below the real one
          }}
        >
          <div className="side-guide__header" style={{ height: '100%', padding: 0 }}>
             {/* Dashed placeholder content */}
          </div>
        </div>
      )}

      <div
        className={`side-guide side-guide--${localSide} ${open ? 'open' : 'closed'} ${isFlashing ? 'side-guide-flashing' : ''}`}
        style={style}
        ref={panelRef}
        aria-hidden={!open}
        onMouseDown={!open ? handleMouseDown : undefined}
      >
        <div className="side-guide__header">
          <button
            className="side-guide__toggle"
            aria-label={open ? 'Close guide' : 'Open guide'}
            onClick={(e) => {
              e.stopPropagation();
              if (!hasDragged.current) setOpen((s) => !s);
            }}
          >
            {open ? (
              localSide === 'right' ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="ionicon" viewBox="0 0 512 512">
                  <path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="48" d="M184 112l144 144-144 144" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="ionicon" viewBox="0 0 512 512">
                  <path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="48" d="M328 112L184 256l144 144"/>
                </svg>
              )
            ) : (
              '≡'
            )}
          </button>
          {open && (
            <div className="side-guide__title">Guide</div>
          )}
        </div>

        {open && (
          <div className="side-guide__content" role="region">
            {error && <div className="side-guide__error">{error}</div>}
            <div
              className="side-guide__markdown"
              dangerouslySetInnerHTML={{ __html: contentHtml }}
            />
          </div>
        )}

        <div ref={resizerRef} className="side-guide__resizer" title="Drag to resize" />
      </div>
    </>
  );
}
