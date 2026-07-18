import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { api } from '../features/AnalysisPipeline/services/api';

const AnalysisContext = createContext(null);

export function AnalysisProvider({ children }) {
  // -- State from AnalysisPanel --
  const [logs, setLogs] = useState([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState('ready');
  const [detectedSpecies, setDetectedSpecies] = useState([]);
  const [selectedSpecies, setSelectedSpecies] = useState(null);
  const [qualityConfig, setQualityConfig] = useState({});
  const [showLogs, setShowLogs] = useState(false);
  const [activeStep, setActiveStep] = useState(0); // 0 = ready, 1-6 = running steps
  
  // -- App Flow State --
  const [dockerReady, setDockerReady] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [showResults, setShowResults] = useState(false);
  
  // Configuration State
  const [minLength, setMinLength] = useState(200);
  const [maxLength, setMaxLength] = useState();
  const [ncbiFile, setNcbiFile] = useState(null);
  const [keyword, setKeyword] = useState();
  const [identity, setIdentity] = useState(98);
  const [copyNumber, setCopyNumber] = useState(2);

  const eventSourceRef = useRef(null);

  // -- Helper Functions --
  const addLog = (message, type = 'info') => {
    const logEntry = {
      id: Date.now() + Math.random(),
      message,
      type,
      timestamp: new Date().toLocaleTimeString()
    };
    setLogs(prev => [...prev, logEntry]);
  };

  // -- SSE Monitoring --
  const startSSEMonitoring = () => {
    // Prevent multiple connections
    if (eventSourceRef.current && eventSourceRef.current.readyState !== EventSource.CLOSED) {
      return;
    }

    addLog('Starting SSE connection...', 'info');
    
    // Check if analysis exists first
    api.analysis.pipeline.getStatus()
      .then((response) => {
        if (response.data && response.data.status === 'running') {
           connectSSE();
        } else {
           throw new Error('No running analysis found');
        }
      })
      .catch((error) => {
        // If we are just starting a new analysis, we might not have status yet, 
        // but startPipeline calls this after a delay, so it should be fine.
        // However, if we are reconnecting on page load, this check is important.
        // For now, we'll try to connect anyway if we think we are analyzing.
        if (isAnalyzing) {
            connectSSE();
        } else {
            addLog(`No active analysis found: ${error.message}`, 'warning');
            setIsAnalyzing(false);
            setAnalysisStep('selecting');
        }
      });
  };

  const STEP_MAPPING = {
    "trim and rename": 1,
    "flash": 2,
    "length filter": 2,
    "blast": 3,
    "assign species": 3,
    "species classifier": 3,
    "MAFFT": 4,
    "tab formatter": 4,
    "trim gaps": 4,
    "separate reads": 5,
    "generate location-haplotype table": 6
  };

  const connectSSE = () => {
    eventSourceRef.current = api.analysis.pipeline.watchProgress({
      onConnect: () => {
        addLog('SSE connection established', 'success');
      },
      onStart: (data) => {
        addLog(data.message || 'Started monitoring analysis progress...', 'info');
        setActiveStep(1);
      },
      onStepStart: (data) => {
        const stepName = data.stepName;
        if (stepName && STEP_MAPPING[stepName]) {
          setActiveStep(STEP_MAPPING[stepName]);
        }
        addLog(data.message || `Starting step: ${stepName}`, 'info');
      },
      onStepComplete: (data) => {
        // Optional: check if we should advance step, but onStepStart handles it better
        addLog(data.message || `Completed step: ${data.stepName}`, 'success');
      },
      onProgress: (data) => {
        addLog(data.message || 'Analysis in progress...', 'info');
      },
      onComplete: (data) => {
        addLog(data.message || 'Analysis completed!', 'success');
        setIsAnalyzing(false);
        setAnalysisStep('completed');
        setActiveStep(7); // All done
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      },
      onError: (data) => {
        addLog(`Analysis error: ${data.message || data.error || 'Unknown error'}`, 'error');
        setIsAnalyzing(false);
        setAnalysisStep('selecting');
        setActiveStep(0);
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      },
      onSSEError: (error) => {
        addLog(`SSE connection error: ${error.message}`, 'warning');
        // Retry logic
        setTimeout(() => {
          if (isAnalyzing) {
            addLog('Attempting to reconnect SSE...', 'info');
            connectSSE();
          }
        }, 3000);
      }
    });
  };

  // -- Actions --
  const startPipeline = async (params) => {
    try {
      setIsAnalyzing(true);
      setAnalysisStep('running');
      
      // We assume params are prepared by the component
      addLog(`Starting DNA analysis for project: ${selectedSpecies}`, 'info');

      await api.analysis.pipeline.start(params);
      
      addLog('Analysis task started successfully', 'success');

      // Delay starting SSE
      setTimeout(() => {
        startSSEMonitoring();
      }, 1000);

    } catch (error) {
      console.error('Failed to start analysis:', error);
      addLog(`Startup failed: ${error.response?.data?.error || error.message}`, 'error');
      setIsAnalyzing(false);
      setAnalysisStep('selecting');
    }
  };

  const stopAnalysis = async () => {
    try {
      addLog('Stopping analysis...', 'warning');
      const response = await api.analysis.pipeline.stop();
      addLog(`Analysis stopped: ${response.data.message}`, 'warning');
    } catch (error) {
      console.error('Failed to stop analysis:', error);
      addLog(`Failed to stop analysis: ${error.response?.data?.error || error.message}`, 'error');
    } finally {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      setIsAnalyzing(false);
      setAnalysisStep('selecting');
      setActiveStep(0);
    }
  };

  const resetAnalysis = () => {
    setLogs([]);
    setAnalysisStep('ready');
    setActiveStep(0);
    setDetectedSpecies([]);
    setSelectedSpecies(null);
    setQualityConfig({});
    setMinLength(200);
    setMaxLength();
    setIsAnalyzing(false);
    setNcbiFile(null);
    setKeyword('');
    setIdentity(98);
    setCopyNumber(2);
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
  };

  // -- Check for existing analysis on mount (Global check) --
  useEffect(() => {
    const checkExistingAnalysis = async () => {
      try {
        const response = await api.analysis.pipeline.getCurrent();
        if (response.data.hasAnalysis) {
          const status = response.data.status;
          
          if (status === 'running') {
            // Only restore if we aren't already tracking it (e.g. page refresh)
            if (!isAnalyzing) {
                addLog(`Found existing background analysis: ${status}`, 'info');
                setIsAnalyzing(true);
                setAnalysisStep('running');
                startSSEMonitoring();
            }
          }
        }
      } catch (error) {
        // console.log('No existing analysis found');
      }
    };

    checkExistingAnalysis();
    
    // Cleanup on APP unmount (not page unmount)
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  const value = {
    // State
    logs,
    isAnalyzing,
    analysisStep,
    detectedSpecies,
    selectedSpecies,
    qualityConfig,
    showLogs,
    minLength,
    maxLength,
    ncbiFile,
    keyword,
    identity,
    copyNumber,
    
    // App Flow State
    dockerReady,
    uploadedFiles,
    analysisResult,
    showResults,
    
    // Setters (exposed for UI inputs)
    setLogs,
    setAnalysisStep,
    setDetectedSpecies,
    setSelectedSpecies,
    setQualityConfig,
    setShowLogs,
    setMinLength,
    setMaxLength,
    setNcbiFile,
    setKeyword,
    setIdentity,
    setCopyNumber,
    
    // App Flow Setters
    setDockerReady,
    setUploadedFiles,
    setAnalysisResult,
    setShowResults,

    // Actions
    startPipeline,
    stopAnalysis,
    resetAnalysis,
    addLog,
    activeStep
  };

  return <AnalysisContext.Provider value={value}>{children}</AnalysisContext.Provider>;
}

export function useAnalysisContext() {
  const context = useContext(AnalysisContext);
  if (!context) {
    throw new Error('useAnalysisContext must be used within an AnalysisProvider');
  }
  return context;
}
