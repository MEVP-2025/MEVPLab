// src/pages/PhylotreePage.jsx
import { useFileContext } from '../contexts/FileContext'; // Hook
import PhylotreeApplication from '../features/Phylotree/PhylotreeApplication.jsx';

export default function PhylotreePage() {
  const { phylotreeContent } = useFileContext();

  return (
    <div style={{ maxWidth: 1140, margin: "0 auto" }}>
      <PhylotreeApplication initialNewick={phylotreeContent} />
    </div>
  );
}