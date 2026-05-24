import { useState } from 'react';
import { useTree } from '../../context/TreeContext.jsx';
import { useUI } from '../../context/UIContext.jsx';
import '../../styles/layout/Sidebar.css';
import { convertToNewick } from '../../utils/newickUtils.js';

const SidebarLeft = ({ isOpen, onToggle }) => {
  const { state: { loading, error, treeInstance, collapsedNodes, renamedNodes } } = useTree();
  const { searchTerm, setSearchTerm } = useUI();
  const [copyStatus, setCopyStatus] = useState('idle'); // 'idle' | 'success' | 'error'

  const getNewick = () => {
    if (!treeInstance?.nodes) return null;
    return convertToNewick(treeInstance.nodes, collapsedNodes, renamedNodes);
  };

  const handleExportNewick = () => {
    const newick = getNewick();
    if (!newick) { alert('No tree data to export.'); return; }
    try {
      const blob = new Blob([newick], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'exported_tree.nwk';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      alert(`Export failed: ${e.message}`);
    }
  };

  const handleCopyNewick = async () => {
    const newick = getNewick();
    if (!newick) { alert('No tree data to copy.'); return; }
    try {
      await navigator.clipboard.writeText(newick);
      setCopyStatus('success');
      setTimeout(() => setCopyStatus('idle'), 2000);
    } catch {
      setCopyStatus('error');
      setTimeout(() => setCopyStatus('idle'), 2000);
    }
  };

  const handleExportPNG = () => {
    const treeSvgEl = document.querySelector('.viewport-scroll svg');
    if (!treeSvgEl) { alert('No tree to export.'); return; }

    // Optionally capture the axis panel SVG (only if visible in DOM)
    const axisSvgEl = document.querySelector('.axis-panel svg');

    // Inline computed styles into a cloned SVG so CSS variables resolve correctly
    const inlineStyles = (origSvg) => {
      const clone = origSvg.cloneNode(true);
      const origEls  = Array.from(origSvg.querySelectorAll('*'));
      const cloneEls = Array.from(clone.querySelectorAll('*'));
      origEls.forEach((el, i) => {
        const computed = window.getComputedStyle(el);
        const target   = cloneEls[i];
        ['fill', 'stroke', 'stroke-width', 'stroke-dasharray', 'font-size', 'font-family'].forEach(prop => {
          const val = computed.getPropertyValue(prop);
          if (val) target.setAttribute(prop, val);
        });
      });
      return clone;
    };

    const treeW = treeSvgEl.width.baseVal.value;
    const treeH = treeSvgEl.height.baseVal.value;
    const axisH = axisSvgEl ? axisSvgEl.height.baseVal.value : 0;
    const totalW = treeW;
    const totalH = axisH + treeH;

    const bg = window.getComputedStyle(document.documentElement)
      .getPropertyValue('--bg-surface').trim() || '#ffffff';
    const dpr = window.devicePixelRatio || 1;

    const canvas = document.createElement('canvas');
    canvas.width  = totalW * dpr;
    canvas.height = totalH * dpr;
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, totalW, totalH);

    // Helper: serialise a cloned SVG to an Image, resolve promise when loaded
    const svgToImage = (clonedSvg, w, h) => new Promise((resolve, reject) => {
      clonedSvg.setAttribute('width',  w);
      clonedSvg.setAttribute('height', h);
      // Remove translateX transform that was used for scroll-sync — not needed in export
      clonedSvg.style.transform = '';
      const svgStr  = new XMLSerializer().serializeToString(clonedSvg);
      const svgBlob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
      const url     = URL.createObjectURL(svgBlob);
      const img = new Image();
      img.onload  = () => { URL.revokeObjectURL(url); resolve(img); };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('SVG render failed')); };
      img.src = url;
    });

    const tasks = [];

    if (axisSvgEl) {
      const axisClone = inlineStyles(axisSvgEl);
      tasks.push(svgToImage(axisClone, treeW, axisH).then(img => ({ img, x: 0, y: 0, w: treeW, h: axisH })));
    }

    const treeClone = inlineStyles(treeSvgEl);
    tasks.push(svgToImage(treeClone, treeW, treeH).then(img => ({ img, x: 0, y: axisH, w: treeW, h: treeH })));

    Promise.all(tasks)
      .then(frames => {
        frames.forEach(({ img, x, y, w, h }) => ctx.drawImage(img, x, y, w, h));
        canvas.toBlob((blob) => {
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = 'tree.png';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        });
      })
      .catch(() => alert('PNG export failed.'));
  };

  const copyLabel = copyStatus === 'success' ? 'Copied!' : copyStatus === 'error' ? 'Failed' : 'Copy Newick';

  return (
    <div className={`sidebar-panel${isOpen ? '' : ' sidebar-panel--collapsed'}`}>
      <div className="sidebar-panel__header__left">
        {isOpen && <h2 className="sidebar-panel__title">Data &amp; Search</h2>}
        <button
          className="sidebar-panel__toggle"
          onClick={onToggle}
          title={isOpen ? 'Collapse panel' : 'Expand panel'}
        >
          {isOpen ? '‹' : '›'}
        </button>
      </div>

      {isOpen && (
        <div className="sidebar-panel__content">
          <div className="sidebar-panel__section">
            {loading && <p className="sidebar-panel__status">Loading tree...</p>}
            {error   && <p className="sidebar-panel__status sidebar-panel__status--error">Error: {error}</p>}
          </div>

          <hr className="sidebar-panel__divider" />

          <div className="sidebar-panel__section">
            <label className="sidebar-panel__label">Search Nodes</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Species name..."
              className="sidebar-panel__input"
            />
          </div>

          <hr className="sidebar-panel__divider" />

          <div className="sidebar-panel__section">
            <h3 className="sidebar-panel__section-title">Export</h3>
            <div className="sidebar-panel__export-group">
              <button className="sidebar-panel__btn" onClick={handleExportNewick}>
                Export Newick
              </button>
              <button
                className={`sidebar-panel__btn${copyStatus === 'success' ? ' sidebar-panel__btn--success' : copyStatus === 'error' ? ' sidebar-panel__btn--error' : ''}`}
                onClick={handleCopyNewick}
              >
                {copyLabel}
              </button>
              <button className="sidebar-panel__btn" onClick={handleExportPNG}>
                Export as PNG
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SidebarLeft;