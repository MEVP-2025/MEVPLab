// src/pages/HaplotypePage.jsx
import SideGuide from '../components/SideGuide.jsx';
import AnalysisPipelineApp from '../features/AnalysisPipeline/AnalysisPipelineApp.jsx';
import '../styles/components/SideGuide.css';

export default function AnalysisPipelinePage() {
  return (
    <div className="page-with-guide">
      <AnalysisPipelineApp />
      <SideGuide guideKey="analysis" side="right" defaultOpen={false} />
    </div>
  );
}