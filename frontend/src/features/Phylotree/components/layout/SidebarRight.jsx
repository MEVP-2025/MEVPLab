import { useTree } from '../../context/TreeContext.jsx';
import { useUI } from '../../context/UIContext.jsx';
import '../../styles/layout/Sidebar.css';

const DENSITY_OPTIONS = [
  { value: 'compact', label: 'Thin'   },
  { value: 'normal',  label: 'Medium' },
  { value: 'large',   label: 'Thick'  },
];

const SidebarRight = ({ isOpen, onToggle }) => {
  const { settings, updateSetting, requestFit } = useUI();
  const { state: { treeInstance: _t } } = useTree(); // keep context subscription for future use

  return (
    <div className={`sidebar-panel${isOpen ? '' : ' sidebar-panel--collapsed'}`}>
      <div className="sidebar-panel__header__right">
        <button
          className="sidebar-panel__toggle"
          onClick={onToggle}
          title={isOpen ? 'Collapse panel' : 'Expand panel'}
        >
          {isOpen ? '›' : '‹'}
        </button>
        {isOpen && <h2 className="sidebar-panel__title">Controls</h2>}
      </div>

      {isOpen && (
        <div className="sidebar-panel__content">

          <hr className="sidebar-panel__divider" />

          {/* Layout Style */}
          <div className="sidebar-panel__section">
            <h3 className="sidebar-panel__section-title">Layout Style</h3>

            <label className="sidebar-panel__checkbox-label">
              <input
                type="checkbox"
                checked={settings.alignTips === 'right'}
                onChange={(e) => updateSetting('alignTips', e.target.checked ? 'right' : 'left')}
              />
              Align Tips Right
            </label>

            <label className="sidebar-panel__label" style={{ marginTop: '10px' }}>Sort Order</label>
            <select
              className="sidebar-panel__select"
              value={settings.sort || ''}
              onChange={(e) => updateSetting('sort', e.target.value || null)}
            >
              <option value="">None</option>
              <option value="ascending">Ascending</option>
              <option value="descending">Descending</option>
            </select>
          </div>

          <hr className="sidebar-panel__divider" />

          {/* Appearance */}
          <div className="sidebar-panel__section">
            <h3 className="sidebar-panel__section-title">Appearance</h3>

            <label className="sidebar-panel__checkbox-label">
              <input
                type="checkbox"
                checked={settings.showInternalLabels}
                onChange={(e) => updateSetting('showInternalLabels', e.target.checked)}
              />
              Show Internal Labels
            </label>

            <label className="sidebar-panel__checkbox-label" style={{ marginTop: '8px' }}>
              <input
                type="checkbox"
                checked={settings.showBranchLengthAxis}
                onChange={(e) => updateSetting('showBranchLengthAxis', e.target.checked)}
              />
              Show Branch Length Axis
            </label>

            <label className="sidebar-panel__label" style={{ marginTop: '12px' }}>Branch Density</label>
            <div className="sidebar-panel__density-group">
              {DENSITY_OPTIONS.map(({ value, label }) => (
                <button
                  key={value}
                  className={`sidebar-panel__density-btn${settings.density === value ? ' sidebar-panel__density-btn--active' : ''}`}
                  onClick={() => updateSetting('density', value)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <hr className="sidebar-panel__divider" />

          {/* Canvas Size */}
          <div className="sidebar-panel__section">
            <h3 className="sidebar-panel__section-title">Canvas Size</h3>

            <label className="sidebar-panel__label">Width ({settings.width}px)</label>
            <input
              type="range" min="200" max="4000" step="50"
              className="sidebar-panel__range"
              value={settings.width}
              onChange={(e) => updateSetting('width', Number(e.target.value))}
            />

            <label className="sidebar-panel__label" style={{ marginTop: '10px' }}>Height ({settings.height}px)</label>
            <input
              type="range" min="200" max="4000" step="50"
              className="sidebar-panel__range"
              value={settings.height}
              onChange={(e) => updateSetting('height', Number(e.target.value))}
            />

            <button className="sidebar-panel__btn" style={{ marginTop: '10px' }} onClick={requestFit}>
              Fit to View
            </button>
          </div>

        </div>
      )}
    </div>
  );
};

export default SidebarRight;