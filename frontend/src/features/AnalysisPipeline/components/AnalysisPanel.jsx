// src/components/AnalysisPanel.jsx
import { CheckCircle2, Circle, Dot, Play, RotateCcw, Terminal } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { api } from '../services/api'
import '../styles/components/AnalysisPanel.css'
import { formatFileSize } from '../utils/formatFileSize'

const AnalysisPanel = ({ uploadedFiles, onAnalysisComplete, onReset }) => {
  const [logs, setLogs] = useState([])
  const [showLogs, setShowLogs] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  
  const [analysisStep, setAnalysisStep] = useState('ready')
  const [detectedSpecies, setDetectedSpecies] = useState([])
  const [selectedSpecies, setSelectedSpecies] = useState(null) // 新增：選中的物種
  const [qualityConfig, setQualityConfig] = useState({}) // 現在只針對單一物種

  const [minLength, setMinLength] = useState(200)
  const [maxLength, setMaxLength] = useState()

  const [ncbiFile, setNcbiFile] = useState(null)

  const [keyword, setKeyword] = useState()
  const [identity, setIdentity] = useState(98)

  const [copyNumber, setCopyNumber] = useState(2)
  
  const eventSourceRef = useRef(null)
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
        barcodeFile: `uploads/${uploadedFiles.barcode.filename}`
      })

      if (response.data.success) {
        const species = response.data.data.species
        setDetectedSpecies(species)
        
        addLog(`Species detection completed. Found ${species.length} species: ${species.join(', ')}`, 'success')
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
    if (uploadedFiles?.detectedSpecies && uploadedFiles?.defaultQualityConfig) {
      setDetectedSpecies(uploadedFiles.detectedSpecies)
      setAnalysisStep('selecting') // selecting stage
      
      addLog(`Pre-detected projects loaded: ${uploadedFiles.detectedSpecies.join(', ')}`, 'success')
    } else if (uploadedFiles?.barcode) {
      detectSpecies()
    }
  }, [uploadedFiles])

  // Add log entry
  const addLog = (message, type = 'info') => {
    const logEntry = {
      id: Date.now() + Math.random(),
      message,
      type,
      timestamp: new Date().toLocaleTimeString()
    }
    
    setLogs(prev => [...prev, logEntry])
    
    // Auto scroll to bottom
    setTimeout(() => {
      if (logContainerRef.current) {
        logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight
      }
    }, 100)
  }

  // -- selecting project
  const selectSpecies = (species) => {
    setSelectedSpecies(species)
    
    // initialize project configuration
    setQualityConfig({
      [species]: 0 // default 0
    })
    
    // stay in the "selecting" stage
    addLog(`Selected project: ${species}`, 'info')
  }

  // -- start analysis
  const startPipeline = async () => {
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
      setIsAnalyzing(true)
      setAnalysisStep('running')
      setShowLogs(true)

      addLog(`Uploading NCBI reference file: ${ncbiFile.name}...`, 'info')
    
      const formData = new FormData()
      formData.append('file', ncbiFile)
      
      const uploadResponse = await api.files.uploadSingle(formData)
      const uploadedFilename = uploadResponse.data.filename
      
      addLog(`NCBI file uploaded: ${uploadedFilename}`, 'success')
      
      const params = {
        r1File: `uploads/${uploadedFiles.R1.filename}`,
        r2File: `uploads/${uploadedFiles.R2.filename}`,
        barcodeFile: `uploads/${uploadedFiles.barcode.filename}`,
        qualityConfig: qualityConfig,
        minLength: minLength,
        maxLength: maxLength || null,
        ncbiReferenceFile: `uploads/${uploadedFilename}`,
        keyword: keyword,
        identity: identity,
        copyNumber: copyNumber
      }

      addLog(`Starting DNA analysis for project: ${selectedSpecies}`, 'info')
      addLog(`Quality settings: ${JSON.stringify(qualityConfig)}`, 'info')
      addLog(`Minimum length threshold of ${minLength}bp`, 'info')

      // Call API to start analysis
      const response = await api.analysis.pipeline.start(params)
      
      addLog('Analysis task started successfully', 'success')

      // Call original callback if needed
      // if (onAnalysisStart) {
      //   onAnalysisStart('pipeline', params)
      // }

      // -- Delay starting SSE monitoring to give the backend time to set up the analysis state
      setTimeout(() => {
        startSSEMonitoring()
      }, 1000)

    } catch (error) {
      console.error('Failed to start analysis:', error)
      addLog(`Startup failed: ${error.response?.data?.error || error.message}`, 'error')
      setIsAnalyzing(false)
      setAnalysisStep('selecting') // 錯誤時回到選擇階段
    }
  }

  const handleQualityChange = (value) => {
    setQualityConfig({
      [selectedSpecies]: parseInt(value)
    })
  }

  const handleMinLengthChange = (value) => {
    const parsedValue = parseInt(value)
    setMinLength(parsedValue)
  }

  const handleMaxLengthChange = (value) => {
    const parsedValue = parseInt(value)
    setMaxLength(parsedValue)
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

    // 0-100
    const identityValid = identity >= 0 && identity <= 100

    // 1-1000
    const copyNumberValid = copyNumber >= 1 && copyNumber <= 1000

    return qualityConfigValid && 
          minLengthValid && 
          identityValid && 
          copyNumberValid && 
          maxLengthValid
  }

  const startSSEMonitoring = () => {
    addLog('Starting SSE connection...', 'info')
    
    checkAnalysisExists()
      .then(() => {
        // -- If an analysis exists, establish an SSE connection
        eventSourceRef.current = api.analysis.pipeline.watchProgress({
          onConnect: () => {
            addLog('SSE connection established', 'success')
          },

          onStart: (data) => {
            addLog(data.message || 'Started monitoring analysis progress...', 'info')
          },

          onProgress: (data) => {
            addLog(data.message || 'Analysis in progress...', 'info')
          },

          onComplete: (data) => {
            addLog(data.message || 'Analysis completed!', 'success')
            setIsAnalyzing(false)
            setAnalysisStep('completed')
            
            // Optionally fetch results here
            fetchAnalysisResults().then(results => {
              if (onAnalysisComplete && results) {
                onAnalysisComplete(results)
              }
            })
          },

          onError: (data) => {
            addLog(`Analysis error: ${data.message || data.error || 'Unknown error'}`, 'error')
            setIsAnalyzing(false)
            setAnalysisStep('selecting')
          },

          onSSEError: (error) => {
            addLog(`SSE connection error: ${error.message}`, 'warning')
            // -- try to reconnect
            setTimeout(() => {
              if (isAnalyzing && eventSourceRef.current?.readyState === EventSource.CLOSED) {
                addLog('Attempting to reconnect SSE...', 'info')
                startSSEMonitoring()
              }
            }, 3000)
          }
        })
      })
      .catch((error) => {
        addLog(`No active analysis found: ${error.message}`, 'warning')
        setIsAnalyzing(false)
        setAnalysisStep('selecting')
      })
  }

  // -- Check if there is an ongoing analysis
  const checkAnalysisExists = async () => {
    try {
      const response = await api.analysis.pipeline.getStatus()
      if (response.data && response.data.status === 'running') {
        return true
      } else {
        throw new Error('No running analysis found')
      }
    } catch (error) {
      throw new Error('No active analysis')
    }
  }

  // Fetch analysis results when completed
  const fetchAnalysisResults = async () => {
    try {
      const response = await api.analysis.pipeline.getResults()
      if (response.data) {
        addLog(`Analysis completed for ${selectedSpecies}!`, 'success')
        addLog(`Results ready: ${JSON.stringify(response.data.result, null, 2)}`, 'success')
        return response.data
      }
    } catch (error) {
      addLog(`Failed to fetch results: ${error.message}`, 'warning')
    }
  }

  // Stop analysis (backend still analysising, NEED TO FIX)
  const stopAnalysis = async () => {
    try {
      addLog('Stopping analysis...', 'warning')
      
      const response = await api.analysis.pipeline.stop()
      addLog(`Analysis stopped: ${response.data.message}`, 'warning')
      
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
        eventSourceRef.current = null
      }
      
      setIsAnalyzing(false)
      setAnalysisStep('selecting')
      
    } catch (error) {
      console.error('Failed to stop analysis:', error)
      addLog(`Failed to stop analysis: ${error.response?.data?.error || error.message}`, 'error')
      
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
        eventSourceRef.current = null
      }
      setIsAnalyzing(false)
      setAnalysisStep('selecting')
    }
  }

  // Check for existing analysis on component mount
  useEffect(() => {
    const checkExistingAnalysis = async () => {
      try {
        const response = await api.analysis.pipeline.getCurrent()
        if (response.data.hasAnalysis) {
          const status = response.data.status
          addLog(`Found existing analysis: ${status}`, 'info')
          
          if (status === 'running') {
            setIsAnalyzing(true)
            setAnalysisStep('running')
            setShowLogs(true)
            addLog('Reconnecting to existing analysis...', 'info')
            startSSEMonitoring()
          } else if (status === 'completed') {
            addLog('Previous analysis completed', 'success')
            fetchAnalysisResults()
          } else if (status === 'error') {
            addLog('Previous analysis failed', 'error')
          }
        }
      } catch (error) {
        console.log('No existing analysis found')
      }
    }

    checkExistingAnalysis()
  }, [])

  // Close SSE when component unmounts
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
      }
    }
  }, [])

  return (
    <div className="analysis-section">
      <h2>DNA Analysis Pipeline</h2>
      
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
            <h3>2. Merge paired-end reads & Length Filtering</h3>
            <div className='detail'>
              <p><Dot />Tool: PEAR v0.9.6 for assembly</p>
              <p><Dot />Merge overlapping paired-end reads (R1/R2) into single reads</p>
              <div className='input-container'>
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
                      id="length-filter"
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
              <p><Dot />Applies species assignment rules using sequence identity</p>
              <div className="input-container">
                <h3>Please define minimum identity</h3>
                <div className='identity-container'>
                  <label htmlFor="keyword">Priority exactly matched word (optional):</label>
                  <input 
                    type="text" 
                    id="keyword" 
                    className="keyword-input" 
                    value={keyword}
                    onChange={(e) => handleKeywordChange(e.target.value)}
                  />
                  <label>(ex. mitochondrion)</label>
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
              <p><Dot />Separates sequences by assigned species into individual FASTA files</p>
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
            <h3>5. Amplicon sequence variations (ASVs) Identification</h3>
            <div className='detail'>
              <p><Dot />Identify identical sequences and counts their occurrence frequency</p>
              <p><Dot />Generate separate files for common haplotypes and rare variants</p>
              <div className='input-container'>
                <div className='copies-container'>
                  <h3>Please define minimum number of copies:</h3>
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
                (Sequences with copies ≤ this number will be classified as unique)
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
                onClick={startPipeline}
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
          onClick={onReset}
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
          <div className="status-indicator">
            <div className="spinner"></div>
            <span>Analyzing {selectedSpecies}...</span>
          </div>
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