// src/components/AnalysisPanel.jsx
import { CheckCircle2, Circle, Dot, Play, RotateCcw, Terminal } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { useAnalysisContext } from '../../../contexts/AnalysisContext'
import { api } from '../services/api'
import '../styles/components/AnalysisPanel.css'
import { formatFileSize } from '../utils/formatFileSize'
import AnalysisProgressBar from './AnalysisProgressBar'

const AnalysisPanel = ({ uploadedFiles, onAnalysisComplete, onReset }) => {
  // -- Use Context --
  const {
    logs,
    isAnalyzing,
    analysisStep,
    detectedSpecies,
    selectedSpecies,
    qualityConfig,
    showLogs,
    minLength,
    maxLength,
    maxOverlap,
    readLengthHint,
    ncbiFile,
    keyword,
    identity,
    copyNumber,
    
    setLogs,
    setAnalysisStep,
    setDetectedSpecies,
    setSelectedSpecies,
    setQualityConfig,
    setShowLogs,
    setMinLength,
    setMaxLength,
    setMaxOverlap,
    setReadLengthHint,
    setNcbiFile,
    setKeyword,
    setIdentity,
    setCopyNumber,

    startPipeline: startPipelineContext,
    stopAnalysis,
    resetAnalysis,
    addLog,
    activeStep
  } = useAnalysisContext();

  const logContainerRef = useRef(null)

  const detectSpecies = async () => {
    if (!uploadedFiles.barcode) {
      alert('Please upload barcode file first.')
      return
    }

    try {
      setAnalysisStep('detecting')
      setLogs([])
      setShowLogs(true)
      
      addLog('Starting species detection...', 'info')

      const response = await api.analysis.pipeline.detectSpecies({
        barcodeFile: `uploads/${uploadedFiles.barcode.filename}`,
        r1File: uploadedFiles.R1
          ? `uploads/${uploadedFiles.R1.filename}`
          : undefined
      })

      if (response.data.success) {
        const species = response.data.data.species
        const hint = response.data.data.readLengthHint ?? null
        setDetectedSpecies(species)
        setReadLengthHint(hint)
        
        addLog(`Species detection completed. Found ${species.length} species: ${species.join(', ')}`, 'success')
        if (hint != null) {
          addLog(`Detected R1 read length ≈ ${hint} bp (may be shorter after trimming)`, 'info')
        }
        setAnalysisStep('selecting')
      } else {
        addLog('Species detection failed', 'error')
        setAnalysisStep('ready')
      }

    } catch (error) {
      console.error('Failed to detect species:', error)
      addLog(`Species detection failed: ${error.response?.data?.error || error.message}`, 'error')
      setAnalysisStep('ready')
    }
  }

  useEffect(() => {
    // -- check whether detection is complete
    // IMPORTANT: Do not reset step if we are already analyzing or completed
    if (isAnalyzing || analysisStep === 'running' || analysisStep === 'completed') {
        return;
    }

    if (uploadedFiles?.detectedSpecies && uploadedFiles?.defaultQualityConfig) {
      setDetectedSpecies(uploadedFiles.detectedSpecies)
      if (uploadedFiles.readLengthHint != null) {
        setReadLengthHint(uploadedFiles.readLengthHint)
        addLog(
          `Detected R1 read length ≈ ${uploadedFiles.readLengthHint} bp (may be shorter after trimming)`,
          'info'
        )
      }
      setAnalysisStep('selecting') // selecting stage
      
      addLog(`Pre-detected projects loaded: ${uploadedFiles.detectedSpecies.join(', ')}`, 'success')
    } else if (uploadedFiles?.barcode && analysisStep === 'ready') {
       // Only auto-detect if we are in ready state (not if we already have results or are running)
       detectSpecies()
    }
  }, [uploadedFiles, isAnalyzing, analysisStep])

  // Auto scroll logs
  useEffect(() => {
    if (showLogs && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight
    }
  }, [logs, showLogs])

  // -- selecting project
  const selectSpecies = (species) => {
    setSelectedSpecies(species)
    
    // initialize project configuration if not set
    if (!qualityConfig[species]) {
        setQualityConfig(prev => ({
            ...prev,
            [species]: 0 // default 0
        }))
    }
    
    // stay in the "selecting" stage
    addLog(`Selected project: ${species}`, 'info')
  }

  // -- start analysis
  const handleStartPipeline = async () => {
    // Check if files are complete
    if (!uploadedFiles.R1 || !uploadedFiles.R2 || !uploadedFiles.barcode) {
      alert('Please upload R1, R2, and barcode files to start the pipeline.')
      return
    }

    if (!isNumberValid()) {
      alert('Please check your input values - some numbers are outside the allowed range.')
      return
    }

    // Check if project is selected
    if (!selectedSpecies) {
      alert('Please select a project to analyze.')
      return
    }

    if (!ncbiFile) {
      alert('Please upload NCBI reference file.')
      return
    }

    try {
      setShowLogs(true)
      addLog(`Uploading NCBI reference file: ${ncbiFile.name}...`, 'info')
    
      const formData = new FormData()
      formData.append('file', ncbiFile)
      
      const uploadResponse = await api.files.uploadSingle(formData)
      const uploadedFilename = uploadResponse.data.filename
      
      addLog(`NCBI file uploaded: ${uploadedFilename}`, 'success')

      const currentRunConfig = {
        [selectedSpecies]: qualityConfig[selectedSpecies]
      };
      
      const params = {
        r1File: `uploads/${uploadedFiles.R1.filename}`,
        r2File: `uploads/${uploadedFiles.R2.filename}`,
        barcodeFile: `uploads/${uploadedFiles.barcode.filename}`,
        qualityConfig: currentRunConfig,
        maxOverlap: maxOverlap || null,
        minLength: minLength,
        maxLength: maxLength || null,
        ncbiReferenceFile: `uploads/${uploadedFilename}`,
        keyword: keyword,
        identity: identity,
        copyNumber: copyNumber
      }

      // Call context action
      await startPipelineContext(params);

    } catch (error) {
      console.error('Failed to start analysis:', error)
      addLog(`Startup failed: ${error.response?.data?.error || error.message}`, 'error')
    }
  }

  const handleQualityChange = (value) => {
    setQualityConfig(prev => ({
      ...prev,
      [selectedSpecies]: parseInt(value)
    }))
  }

  const handleMinLengthChange = (value) => {
    const parsedValue = parseInt(value)
    setMinLength(parsedValue)
  }

  const handleMaxLengthChange = (value) => {
    const parsedValue = parseInt(value)
    setMaxLength(parsedValue)
  }

  const handleMaxOverlapChange = (value) => {
    const parsedValue = parseInt(value)
    setMaxOverlap(parsedValue)
  }

  const handleNCBIFileChange = (event) => {
    const file = event.target.files[0]
    setNcbiFile(file)
  }

  const handleKeywordChange = (value) => {
    setKeyword(value)
  }

  const handleIdentityChange = (value) => {
    const parsedValue = parseInt(value)
    setIdentity(parsedValue)
  }

  const handleCopyNumberChange = (value) => {
    const parsedValue = parseInt(value)
    setCopyNumber(parsedValue)
  }

  const isFormValid = () => {
    return (
          uploadedFiles.R1 &&
          uploadedFiles.R2 && 
          uploadedFiles.barcode && 
          selectedSpecies && 
          qualityConfig && !isNaN(qualityConfig[selectedSpecies]) && 
          minLength && !isNaN(minLength) && 
          (!maxLength || (maxLength && !isNaN(maxLength))) &&
          (!maxOverlap || (maxOverlap && !isNaN(maxOverlap))) &&
          ncbiFile && 
          identity && !isNaN(identity) && 
          copyNumber && !isNaN(copyNumber)
          )
  }

  const isNumberValid = () => {
    // 0 - 99
    const qualityConfigValid = !selectedSpecies || 
      (qualityConfig[selectedSpecies] >= 0 && qualityConfig[selectedSpecies] <= 99)

    // > 0-10000
    const minLengthValid = minLength > 0 && minLength <= 10000

    // 0-10000 && > minLength 
    const maxLengthValid = !maxLength || 
      (maxLength > 0 && maxLength > minLength && maxLength <= 10000)

    // optional; if set, >= FLASH default min-overlap (10). Soft UI upper
    // bound is the R1 readLengthHint when available; FLASH still clamps
    // against trimmed read length server-side.
    const maxOverlapValid = !maxOverlap || (
      maxOverlap >= 10 &&
      (!readLengthHint || maxOverlap <= readLengthHint)
    )

    // 0-100
    const identityValid = identity >= 0 && identity <= 100

    // 1-1000
    const copyNumberValid = copyNumber >= 1 && copyNumber <= 1000

    return qualityConfigValid && 
          minLengthValid && 
          identityValid && 
          copyNumberValid && 
          maxLengthValid &&
          maxOverlapValid
  }

  // Handle Reset
  const handleReset = () => {
      resetAnalysis();
      onReset();
  }

  // Fetch results when completed (handled in context mostly, but if we need to trigger parent callback)
  useEffect(() => {
      if (analysisStep === 'completed') {
          const fetchResults = async () => {
              try {
                const response = await api.analysis.pipeline.getResults()
                if (response.data && onAnalysisComplete) {
                    onAnalysisComplete(response.data)
                }
              } catch (e) {
                  console.error(e)
              }
          }
          fetchResults();
      }
  }, [analysisStep, onAnalysisComplete])


  return (
    <div className="analysis-section">
      <h2>eDNA Analysis Pipeline</h2>
      
      {detectedSpecies.length > 0 && (
        <div className="species-selection-container">
          <h3>Analysis Steps</h3>
          <div className='steps'>
            <h3>1. Data Preprocessing</h3>
            <div className='detail'>
              <p><Dot />Trim barcode and primer sequences from R1/R2 FASTQ files</p>
              <p><Dot />Barcode sequences were used to identify sample locations</p>

              <div className='input-container'>
                <div className='inline-configuration'>
                  <div className="species-selection">
                    <div className="selection-header">
                      <h3>Please select which project to analyze</h3>
                    </div>
                    <div className="species-list">
                      {detectedSpecies.map(species => (
                        <div 
                          key={species} 
                          className={`species-option ${selectedSpecies === species ? 'selected' : ''} ${selectedSpecies && selectedSpecies !== species ? 'dimmed' : ''}`}
                          onClick={() => selectSpecies(species)}
                        >
                          <div className="species-checkbox">
                            {selectedSpecies === species ? (
                              <CheckCircle2 size={20} className="checked" />
                            ) : (
                              <Circle size={20} className="unchecked" />
                            )}
                          </div>
                          <div className="species-info">
                            <span className="species-name">{species}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Quality Control Configuration */}
                  {selectedSpecies && (
                    <div className="inline-configuration">
                      <label htmlFor={`quality-${selectedSpecies}`} className='quality-control'>
                        Maximum mismatches for barcode and primer sequences, <strong>{selectedSpecies}</strong> :
                        <span className="input-group">
                          <input
                            id={`quality-${selectedSpecies}`}
                            type="number"
                            min="0"
                            max="99"
                            defaultValue={qualityConfig[selectedSpecies]}
                            onChange={(e) => handleQualityChange(e.target.value)}
                            className="quality-input"
                          />
                          <span className="input-suffix">mismatches</span>
                        </span>
                      </label>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className='steps'>
            <h3>2. Merge Paired-end Reads & Length Filtering</h3>
            <div className='detail'>
              <p><Dot />Tool: FLASH v1.2.11 for assembly</p>
              <p><Dot />Merge overlapping paired-end reads (R1/R2) into single reads</p>
              <div className='input-container'>
                <h3>Please define FLASH max overlap (optional)</h3>
                {readLengthHint != null && (
                  <p className="read-length-hint">
                    Detected R1 read length ≈ {readLengthHint} bp
                    (may be shorter after trimming)
                  </p>
                )}
                <span className='maximum-overlap-container'>Maximum overlap of
                  <span className="input-group">
                    <input
                      id="max-overlap"
                      type="number"
                      min="10"
                      max={readLengthHint ?? undefined}
                      defaultValue={maxOverlap}
                      onChange={(e) => handleMaxOverlapChange(e.target.value)}
                      className="minimum-length"
                      placeholder="Auto"
                    />
                    <span className="input-suffix">
                      bp
                      {readLengthHint != null
                        ? ` (leave blank for auto; max ${readLengthHint})`
                        : ' (leave blank to auto-detect from read length)'}
                    </span>
                  </span>
                </span>
                <h3>Please define the minimum length</h3>
                <span className='minimum-length-container'>Apply minimum length threshold of
                  <span className="input-group">
                    <input
                      id="length-filter"
                      type="number"
                      min="1"
                      max="1000"
                      defaultValue={minLength}
                      onChange={(e) => handleMinLengthChange(e.target.value)}
                      className="minimum-length"
                    />
                    <span className="input-suffix">bp</span>
                  </span>
                </span>
                <span className='maximum-length-container'>Apply maximum length threshold of
                  <span className="input-group">
                    <input
                      id="max-length-filter"
                      type="number"
                      min="1"
                      max="10000"
                      defaultValue={maxLength}
                      onChange={(e) => handleMaxLengthChange(e.target.value)}
                      className="minimum-length"
                    />
                    <span className="input-suffix">bp (optional)</span>
                  </span>
                </span>
              </div>
            </div>
          </div>
          
          <div className='steps'>
            <h3>3. Species Assignment & Classification</h3>
            <div className='detail'>
              <p><Dot />Perform BLAST search against NCBI reference sequences</p>
              <div className='input-container'>
                <h3>Please upload the NCBI reference file for {selectedSpecies? selectedSpecies : '...'}</h3>
                <input 
                  type="file" 
                  id="ncbi-file" 
                  className="ncbi-reference" 
                  accept='.fasta,.fa' 
                  required
                  onChange={handleNCBIFileChange}
                />
              </div>
              <p><Dot />Apply species assignment rules using sequence identity</p>
              <div className="input-container">
                <h3>Please define minimum identity</h3>
                <div className='identity-container'>
                  <label htmlFor="keyword">Priority exactly matched word (ex. mitochondrion):</label>
                  <input 
                    type="text" 
                    id="keyword" 
                    className="keyword-input" 
                    value={keyword || ''}
                    onChange={(e) => handleKeywordChange(e.target.value)}
                  />
                  <label>(optional)</label>
                </div>
                <div className='identity-container'>
                  <label htmlFor="identity">Minimum identity threshold:</label>
                  <input 
                    type='number' 
                    id="identity" 
                    className='identity' 
                    min="0" 
                    max="100" 
                    defaultValue={identity}
                    onChange={(e) => handleIdentityChange(e.target.value)}
                  />
                  <span>% identity</span>
                </div>
              </div>
              <p><Dot />Separate sequences into individual FASTA files by assigned species</p>
            </div>
          </div>

          <div className='steps'>
            <h3>4. Multiple Sequence Alignment</h3>
            <div className='detail'>
              <p><Dot />Tool: MAFFT v7.505 with default parameters</p>
              <p><Dot />Align reads within each species separately</p>
              <p><Dot />Generate aligned FASTA files for downstream analysis</p>
            </div>
          </div>

          <div className='steps'>
            <h3>5. Amplicon Sequence Variations (ASVs) Identification</h3>
            <div className='detail'>
              <p><Dot />Identify identical sequences and counts their occurrence frequency</p>
              <p><Dot />Generate separate files for common haplotypes and rare variants</p>
              <div className='input-container'>
                <div className='copies-container'>
                  <h3>Please define minimum number of identical copies:</h3>
                  <input 
                    type='number' 
                    id="copy-number" 
                    className='copy-number' 
                    min="1" 
                    max="1000" 
                    defaultValue={copyNumber}
                    onChange={(e) => handleCopyNumberChange(e.target.value)}
                  />
                </div>
                (Sequences with identical copies ≤ this number will be classified as rare variants)
              </div>
            </div>
          </div>

          <div className='steps'>
            <h3>6. Location-Haplotype Table Generation</h3>
            <div className='detail'>
              <p><Dot />Integrate geographic location information and number of ASVs per species</p>
              <p><Dot />Create a cross-tabulation matrix of locations vs. ASVs</p>
            </div>
          </div>
        </div>
      )}

      {/* files summary */}
      <div className="files-summary">
        <h3>Uploaded Files:</h3>
        <div className="files-list">
          <div className="file-item">
            <span className="file-type">R1</span>
            <span className="file-name">{uploadedFiles.R1?.originalName}</span>
            <span className="file-size">({formatFileSize(uploadedFiles.R1?.size || 0)})</span>
          </div>
          <div className="file-item">
            <span className="file-type">R2</span>
            <span className="file-name">{uploadedFiles.R2?.originalName}</span>
            <span className="file-size">({formatFileSize(uploadedFiles.R2?.size || 0)})</span>
          </div>
          <div className="file-item">
            <span className="file-type">Barcode</span>
            <span className="file-name">{uploadedFiles.barcode?.originalName}</span>
            <span className="file-size">({formatFileSize(uploadedFiles.barcode?.size || 0)})</span>
          </div>
          {ncbiFile && (
            <div className="file-item">
              <span className="file-type">NCBI reference</span>
              <span className="file-name">{ncbiFile.name}</span>
              <span className="file-size">({formatFileSize(ncbiFile.size || 0)})</span>
            </div>
          )}
        </div>
      </div>

      <div className="analysis-actions">
        {analysisStep === 'selecting' && (
          <>
            <button
                className="btn btn-primary"
                onClick={handleStartPipeline}
                disabled={!isFormValid()}
              >
                <Play size={20} />
                Start Analysis for {selectedSpecies? selectedSpecies : '...'}
              </button>
          </>
        )}

        {analysisStep === 'running' && (
          <button
            className="btn btn-danger"
            onClick={stopAnalysis}
          >
            Stop Analysis
          </button>
        )}
        
        <button
          className="btn btn-secondary"
          onClick={handleReset}
          disabled={isAnalyzing}
        >
          <RotateCcw size={20} />
          Upload Different Files
        </button>

        {logs.length > 0 && (
          <button
            className="btn btn-outline"
            onClick={() => setShowLogs(!showLogs)}
          >
            <Terminal size={20} />
            {showLogs ? 'Hide' : 'Show'} Debug Logs
          </button>
        )}
      </div>

      {/* Analysis status */}
      {isAnalyzing && (
        <div className="analysis-status">
          <AnalysisProgressBar />
        </div>
      )}

      {/* Python 輸出日誌 */}
      {showLogs && logs.length > 0 && (
        <div className="analysis-logs">
          <div className="logs-header">
            <h3>Debug Logs & Python Output</h3>
          </div>
          
          <div 
            ref={logContainerRef}
            className="logs-container"
          >
            {logs.map(log => (
              <div key={log.id} className={`log-entry log-${log.type}`}>
                <span className="log-timestamp">{log.timestamp}</span>
                <span className="log-message">{log.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Requirements alert */}
      {analysisStep === 'ready' && (!uploadedFiles.R1 || !uploadedFiles.R2 || !uploadedFiles.barcode) && (
        <div className="requirements-notice">
          <h4>Required Files</h4>
          <p>All three files (R1, R2, and barcode CSV) are required to start the analysis pipeline.</p>
        </div>
      )}
      
      {/* 物種選擇提示 */}
      {analysisStep === 'selecting' && detectedSpecies.length === 0 && (
        <div className="requirements-notice">
          <h4>No Species Detected</h4>
          <p>No species were found in your barcode file. Please check your file or try re-detection.</p>
        </div>
      )}
    </div>
  )
}

export default AnalysisPanel