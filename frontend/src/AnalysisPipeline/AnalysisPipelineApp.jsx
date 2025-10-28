// src/App.jsx
import { useState } from 'react'
import AnalysisPanel from './components/AnalysisPanel'
import DockerCheckPanel from './components/DockerCheckPanel'
import FileUpload from './components/FileUpload'
import ResultsPanel from './components/ResultsPanel'
import './styles/components.css'
import './styles/globals.css'

const AnalysisPipelineApp = () => {
  const [dockerReady, setDockerReady] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState(null)
  const [analysisResult, setAnalysisResult] = useState(null)
  const [showResults, setShowResults] = useState(false)

  const handleDockerReady = () => {
    setDockerReady(true)
  }

  const handleFilesUploaded = (files) => {
    setUploadedFiles(files)
    setAnalysisResult(null)
    setShowResults(false)
  }

  const handleAnalysisComplete = (result) => {
    setAnalysisResult(result)
    setShowResults(true)
  }

  const resetApp = () => {
    setDockerReady(false)
    setUploadedFiles(null)
    setAnalysisResult(null)
    setShowResults(false)
  }

  return (
    <div className='analysis-app'>
      <div className="analysis-main">
        {!dockerReady && (
          <DockerCheckPanel onDockerReady={handleDockerReady} />
        )}

        {/* Step 1: File Upload */}
        {dockerReady && !uploadedFiles && (
        // {!uploadedFiles && (
          <FileUpload onFilesUploaded={handleFilesUploaded} />
        )}

        {/* Step 2: Analysis Panel */}
        {uploadedFiles && !showResults && (
          <AnalysisPanel
            uploadedFiles={uploadedFiles}
            onAnalysisComplete={handleAnalysisComplete}
            onReset={resetApp}
          />
        )}

        {/* Step 3: Results */}
        {showResults && analysisResult && (
          <ResultsPanel
            result={analysisResult}
            onReset={resetApp}
          />
        )}
      </div>
    </div>
  )
}

export default AnalysisPipelineApp