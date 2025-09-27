import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';
import '../styles/components/CollaborativeEditor.css';

function CollaborativeEditor({ roomId, onClose, participants = [] }) {
  const { user, isAuthenticated } = useAuth();
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [files, setFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileContent, setFileContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [compilationStatus, setCompilationStatus] = useState('idle');
  const [previewUrl, setPreviewUrl] = useState('');
  const [showCodePaste, setShowCodePaste] = useState(false);
  const [pastedCode, setPastedCode] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('javascript');
  const [fileName, setFileName] = useState('');
  const [showSyntaxHighlighting, setShowSyntaxHighlighting] = useState(true);
  const [showScrollToTop, setShowScrollToTop] = useState(false);
  const [showSideScroller, setShowSideScroller] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  
  const fileInputRef = useRef(null);
  const contentRef = useRef(null);

  useEffect(() => {
    if (roomId) {
      loadProjects();
    }
    
    // Allow scrolling when editor is open
    document.body.classList.add('editor-open');
    
    // Ensure the editor is properly sized for full-screen
    const handleResize = () => {
      if (contentRef.current) {
        // Force a reflow to ensure proper sizing
        const headerHeight = 80; // Approximate header height
        const newHeight = window.innerHeight - headerHeight;
        contentRef.current.style.height = `${newHeight}px`;
      }
    };
    
    // Set initial height
    handleResize();
    
    window.addEventListener('resize', handleResize);
    
    return () => {
      // Clean up when editor is closed
      document.body.classList.remove('editor-open');
      window.removeEventListener('resize', handleResize);
    };
  }, [roomId]);

  // Handle scroll events for scroll buttons
  useEffect(() => {
    const handleScroll = () => {
      if (contentRef.current) {
        const scrollTop = contentRef.current.scrollTop;
        const scrollHeight = contentRef.current.scrollHeight;
        const clientHeight = contentRef.current.clientHeight;
        
        // Show scroll to top button when scrolled down
        setShowScrollToTop(scrollTop > 200);
        
        // Show side scroller when content is scrollable
        setShowSideScroller(scrollHeight > clientHeight);
        
        // Calculate scroll progress
        const progress = (scrollTop / (scrollHeight - clientHeight)) * 100;
        setScrollProgress(Math.min(100, Math.max(0, progress)));
      }
    };

    const contentElement = contentRef.current;
    if (contentElement) {
      // Use passive event listener for better performance
      contentElement.addEventListener('scroll', handleScroll, { passive: true });
      return () => contentElement.removeEventListener('scroll', handleScroll);
    }
  }, [selectedProject, files]);

  // Fix scroll position when content changes
  useEffect(() => {
    if (contentRef.current && selectedFile) {
      // Small delay to ensure content is rendered
      setTimeout(() => {
        if (contentRef.current) {
          contentRef.current.scrollTop = 0;
        }
      }, 100);
    }
  }, [selectedFile]);

  const loadProjects = async () => {
    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'https://awsproject-backend.onrender.com';
      const response = await fetch(`${apiUrl}/api/projects/room/${roomId}`);
      const data = await response.json();
      
      if (data.success) {
        setProjects(data.projects);
      }
    } catch (err) {
      console.error('Error loading projects:', err);
    }
  };

  const createProject = async () => {
    const projectName = prompt('Enter project name:');
    if (!projectName) return;

    setLoading(true);
    setError('');

    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'https://awsproject-backend.onrender.com';
      const response = await fetch(`${apiUrl}/api/projects/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: projectName,
          description: `Collaborative project for room ${roomId}`,
          roomId,
          createdBy: user?.email || user?.username,
          projectType: 'react',
          roomMembers: participants.map(p => ({
            username: p.username,
            email: p.email || p.username
          }))
        })
      });

      const data = await response.json();
      if (data.success) {
        setSuccess('Project created successfully!');
        loadProjects();
        setSelectedProject(data.project);
        loadProjectFiles(data.project.projectId);
      } else {
        setError(data.message || 'Failed to create project');
      }
    } catch (err) {
      setError('Failed to create project');
      console.error('Error creating project:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadProjectFiles = async (projectId) => {
    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'https://awsproject-backend.onrender.com';
      const response = await fetch(`${apiUrl}/api/projects/${projectId}`);
      const data = await response.json();
      
      if (data.success) {
        setFiles(data.project.files || []);
        if (data.project.files && data.project.files.length > 0) {
          setSelectedFile(data.project.files[0]);
          setFileContent(data.project.files[0].content);
        }
      }
    } catch (err) {
      console.error('Error loading project files:', err);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file || !selectedProject) {
      setError('Please select a project and file to upload');
      return;
    }

    // Validate file type
    const allowedTypes = ['.js', '.jsx', '.ts', '.tsx', '.css', '.html', '.json', '.md', '.txt'];
    const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
    if (!allowedTypes.includes(fileExtension)) {
      setError(`File type ${fileExtension} is not supported. Allowed types: ${allowedTypes.join(', ')}`);
      return;
    }

    // Validate file size (max 1MB)
    if (file.size > 1024 * 1024) {
      setError('File size must be less than 1MB');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('uploadedBy', user?.email || user?.username);
      formData.append('lastModifiedBy', user?.email || user?.username);

      const apiUrl = process.env.REACT_APP_API_URL || 'https://awsproject-backend.onrender.com';
      const response = await fetch(`${apiUrl}/api/projects/${selectedProject.projectId}/files/upload`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Upload failed with status: ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        setSuccess(`File "${file.name}" uploaded successfully!`);
        loadProjectFiles(selectedProject.projectId);
        // Clear the file input
        event.target.value = '';
      } else {
        setError(data.message || 'Failed to upload file');
      }
    } catch (err) {
      setError(`Failed to upload file: ${err.message}`);
      console.error('Error uploading file:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (file) => {
    setSelectedFile(file);
    setFileContent(file.content);
  };

  const handleFileDelete = async (fileId) => {
    if (!selectedProject || !fileId) {
      setError('No file selected for deletion');
      return;
    }

    if (!confirm('Are you sure you want to delete this file?')) {
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'https://awsproject-backend.onrender.com';
      const response = await fetch(`${apiUrl}/api/projects/${selectedProject.projectId}/files/${fileId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Delete failed with status: ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        setSuccess('File deleted successfully!');
        loadProjectFiles(selectedProject.projectId);
        // Clear selection if deleted file was selected
        if (selectedFile && selectedFile._id === fileId) {
          setSelectedFile(null);
          setFileContent('');
        }
      } else {
        setError(data.message || 'Failed to delete file');
      }
    } catch (err) {
      setError(`Failed to delete file: ${err.message}`);
      console.error('Error deleting file:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSave = async () => {
    if (!selectedFile || !selectedProject) {
      setError('No file selected to save');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'https://awsproject-backend.onrender.com';
      const response = await fetch(`${apiUrl}/api/projects/${selectedProject.projectId}/files/${selectedFile._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content: fileContent,
          lastModifiedBy: user?.email || user?.username
        })
      });

      if (!response.ok) {
        throw new Error(`Save failed with status: ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        setSuccess('File saved successfully!');
        loadProjectFiles(selectedProject.projectId);
      } else {
        setError(data.message || 'Failed to save file');
      }
    } catch (err) {
      setError(`Failed to save file: ${err.message}`);
      console.error('Error saving file:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileContentChange = (content) => {
    setFileContent(content);
  };

  const saveFileContent = async () => {
    if (!selectedFile || !selectedProject) return;

    setLoading(true);
    setError('');

    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'https://awsproject-backend.onrender.com';
      const response = await fetch(`${apiUrl}/api/projects/${selectedProject.projectId}/files/${selectedFile._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content: fileContent,
          lastModifiedBy: user?.email || user?.username
        })
      });

      const data = await response.json();
      if (data.success) {
        setSuccess('File saved successfully!');
        loadProjectFiles(selectedProject.projectId);
      } else {
        setError(data.message || 'Failed to save file');
      }
    } catch (err) {
      setError('Failed to save file');
      console.error('Error saving file:', err);
    } finally {
      setLoading(false);
    }
  };

  const compileProject = async () => {
    if (!selectedProject) {
      setError('Please select a project first');
      return;
    }

    if (files.length === 0) {
      setError('No files to compile. Please upload some files first.');
      return;
    }

    setCompilationStatus('compiling');
    setError('');
    setSuccess('');

    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'https://awsproject-backend.onrender.com';
      const response = await fetch(`${apiUrl}/api/projects/${selectedProject.projectId}/compile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          compiledBy: user?.email || user?.username
        })
      });

      if (!response.ok) {
        throw new Error(`Compilation failed with status: ${response.status}`);
      }
      
      const data = await response.json();

      if (data.success && data.compilation) {
        setCompilationStatus('success');
        
        // Try to use the preview URL first
        const fullPreviewUrl = `${apiUrl}${data.compilation.previewUrl}`;
        
        // Test if the preview URL is accessible
        try {
          const testResponse = await fetch(fullPreviewUrl, { method: 'HEAD' });
          if (testResponse.ok) {
            setPreviewUrl(fullPreviewUrl);
          } else {
            // Fallback to data URL
            const dataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(data.compilation.output)}`;
            setPreviewUrl(dataUrl);
          }
        } catch (urlError) {
          // Fallback to data URL if preview URL fails
          const dataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(data.compilation.output)}`;
          setPreviewUrl(dataUrl);
        }
        
        setSuccess('Project compiled successfully!');
      } else {
        setCompilationStatus('error');
        setError(data.message || 'Compilation failed');
      }
    } catch (err) {
      setCompilationStatus('error');
      setError(`Failed to compile project: ${err.message}`);
      console.error('Error compiling project:', err);
    }
  };

  const handleCodePaste = () => {
    setShowCodePaste(true);
    setPastedCode('');
    setFileName('');
    setSelectedLanguage('javascript');
  };

  // Scroll functions
  const scrollToTop = () => {
    if (contentRef.current) {
      contentRef.current.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }
  };

  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
  };

  const scrollToPreview = () => {
    const previewSection = document.querySelector('.preview-section');
    if (previewSection) {
      previewSection.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
  };

  const savePastedCode = async () => {
    if (!pastedCode.trim() || !fileName.trim() || !selectedProject) {
      setError('Please provide code, filename, and select a project');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'https://awsproject-backend.onrender.com';
      
      // Create a file object for the pasted code
      const fileData = {
        projectId: selectedProject.projectId,
        fileName: fileName,
        filePath: `/${fileName}`,
        fileType: selectedLanguage,
        content: pastedCode,
        uploadedBy: user?.email || user?.username,
        lastModifiedBy: user?.email || user?.username,
        metadata: {
          size: pastedCode.length,
          encoding: 'utf8',
          mimeType: getMimeType(selectedLanguage)
        }
      };

      const response = await fetch(`${apiUrl}/api/projects/${selectedProject.projectId}/files/paste`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(fileData)
      });

      const data = await response.json();
      if (data.success) {
        setSuccess('Code pasted and saved successfully!');
        setShowCodePaste(false);
        setPastedCode('');
        setFileName('');
        loadProjectFiles(selectedProject.projectId);
      } else {
        setError(data.message || 'Failed to save pasted code');
      }
    } catch (err) {
      setError('Failed to save pasted code');
      console.error('Error saving pasted code:', err);
    } finally {
      setLoading(false);
    }
  };

  const getMimeType = (language) => {
    const mimeTypes = {
      'javascript': 'text/javascript',
      'css': 'text/css',
      'html': 'text/html',
      'json': 'application/json'
    };
    return mimeTypes[language] || 'text/plain';
  };

  const getFileExtension = (language) => {
    const extensions = {
      'javascript': '.js',
      'css': '.css',
      'html': '.html',
      'json': '.json'
    };
    return extensions[language] || '.txt';
  };

  const handleLanguageChange = (language) => {
    setSelectedLanguage(language);
    if (!fileName || fileName === '') {
      setFileName(`file${getFileExtension(language)}`);
    } else if (!fileName.includes('.')) {
      setFileName(`${fileName}${getFileExtension(language)}`);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="collaborative-editor-overlay" onClick={onClose}>
        <div className="collaborative-editor-container" onClick={e => e.stopPropagation()}>
          <div className="error-message">
            Please log in to use the collaborative editor.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="collaborative-editor-overlay" onClick={onClose}>
      <div className="collaborative-editor-container" onClick={e => e.stopPropagation()}>
        <div className="collaborative-editor-header">
          <h2>🚀 Collaborative Code Editor</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        
        <div className="collaborative-editor-content" ref={contentRef}>
          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}
          {/* Project Selection */}
          <div id="project-section" className="project-section">
            <div className="section-header">
              <h3>📁 Projects</h3>
              <button onClick={createProject} className="btn-primary" disabled={loading}>
                + New Project
              </button>
            </div>
            
            <div className="projects-list">
              {projects.map(project => (
                <div 
                  key={project.projectId}
                  className={`project-item ${selectedProject?.projectId === project.projectId ? 'active' : ''}`}
                  onClick={() => {
                    setSelectedProject(project);
                    loadProjectFiles(project.projectId);
                  }}
                >
                  <div className="project-name">{project.name}</div>
                  <div className="project-meta">
                    {project.collaborators.length} collaborator{project.collaborators.length !== 1 ? 's' : ''}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* File Management */}
          {selectedProject && (
            <div id="files-section" className="files-section">
              <div className="section-header">
                <h3>📄 Files</h3>
                <div className="file-actions">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept=".js,.jsx,.ts,.tsx,.css,.html,.json,.md,.txt"
                    style={{ display: 'none' }}
                  />
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="btn-secondary"
                    disabled={loading}
                  >
                    📤 Upload File
                  </button>
                  <button 
                    onClick={handleCodePaste}
                    className="btn-secondary"
                    disabled={loading}
                  >
                    📝 Paste Code
                  </button>
                  <button 
                    onClick={compileProject}
                    className="btn-primary"
                    disabled={loading || compilationStatus === 'compiling'}
                  >
                    {compilationStatus === 'compiling' ? '⏳ Compiling...' : '🔨 Compile'}
                  </button>
                </div>
              </div>

              <div className="files-grid">
                <div className="files-list">
                  {files.map(file => (
                    <div 
                      key={file._id}
                      className={`file-item ${selectedFile?._id === file._id ? 'active' : ''}`}
                    >
                      <div className="file-content" onClick={() => handleFileSelect(file)}>
                        <div className="file-icon">
                          {file.fileType === 'javascript' ? '📜' : 
                           file.fileType === 'css' ? '🎨' : 
                           file.fileType === 'html' ? '🌐' : '📄'}
                        </div>
                        <div className="file-info">
                          <div className="file-name">{file.fileName}</div>
                          <div className="file-meta">
                            {file.fileType} • {file.metadata?.size ? Math.round(file.metadata.size / 1024) + 'KB' : 'Unknown size'}
                          </div>
                        </div>
                      </div>
                      <div className="file-actions">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleFileDelete(file._id);
                          }}
                          className="delete-btn"
                          title="Delete file"
                          disabled={loading}
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {selectedFile && (
                  <div className="file-editor">
                    <div className="editor-header">
                      <span className="file-name">{selectedFile.fileName}</span>
                      <button 
                        onClick={handleFileSave}
                        className="btn-save"
                        disabled={loading}
                      >
                        💾 Save
                      </button>
                    </div>
                    <textarea
                      value={fileContent}
                      onChange={(e) => handleFileContentChange(e.target.value)}
                      className="code-editor"
                      placeholder="Start coding..."
                      spellCheck={false}
                    />
                  </div>
                )}
              </div>
            </div>
          )}


          {/* Compilation Status */}
          {compilationStatus === 'success' && previewUrl && (
            <div className="preview-section">
              <h3>👀 Live Preview</h3>
              <div className="preview-container">
                <div className="preview-wrapper">
                  {previewUrl.startsWith('data:') ? (
                    <iframe
                      src={previewUrl}
                      className="preview-iframe"
                      title="Project Preview"
                      onLoad={() => {
                        console.log('Data URL iframe loaded:', previewUrl);
                        console.log('Iframe content loaded successfully');
                      }}
                      onError={(e) => {
                        console.error('Data URL iframe error:', e);
                        console.log('Falling back to direct content display');
                      }}
                      style={{ 
                        width: '100%', 
                        height: '600px', 
                        border: '2px solid #007bff', 
                        borderRadius: '8px',
                        backgroundColor: '#fff',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                      }}
                    />
                  ) : (
                    <iframe
                      src={previewUrl}
                      className="preview-iframe"
                      title="Project Preview"
                      sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-top-navigation"
                      allow="camera; microphone; fullscreen"
                      onLoad={() => {
                        console.log('Preview iframe loaded:', previewUrl);
                        console.log('Iframe content loaded successfully');
                      }}
                      onError={(e) => {
                        console.error('Preview iframe error:', e);
                        console.log('Falling back to direct content display');
                      }}
                      style={{ 
                        width: '100%', 
                        height: '600px', 
                        border: '2px solid #007bff', 
                        borderRadius: '8px',
                        backgroundColor: '#fff',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                      }}
                    />
                  )}
                </div>
              </div>
              <div className="preview-actions">
                <button 
                  onClick={() => {
                    const iframe = document.querySelector('.preview-iframe');
                    if (iframe) {
                      iframe.src = iframe.src; // Force refresh
                    }
                  }}
                  className="btn-primary"
                >
                  🔄 Refresh Preview
                </button>
                <button 
                  onClick={() => window.open(previewUrl, '_blank')}
                  className="btn-secondary"
                >
                  🔗 Open in New Tab
                </button>
                <button 
                  onClick={() => setPreviewUrl('')}
                  className="btn-secondary"
                >
                  ❌ Close Preview
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Code Paste Modal */}
        {showCodePaste && (
          <div className="code-paste-overlay">
            <div className="code-paste-modal">
              <div className="code-paste-header">
                <h3>📝 Paste Code</h3>
                <button 
                  onClick={() => setShowCodePaste(false)}
                  className="close-btn"
                >
                  ×
                </button>
              </div>

              <div className="code-paste-content">
                <div className="paste-form">
                  <div className="form-group">
                    <label>File Name:</label>
                    <input
                      type="text"
                      value={fileName}
                      onChange={(e) => setFileName(e.target.value)}
                      placeholder="Enter filename (e.g., script.js)"
                      className="form-input"
                    />
                  </div>

                  <div className="form-group">
                    <label>Language:</label>
                    <select
                      value={selectedLanguage}
                      onChange={(e) => handleLanguageChange(e.target.value)}
                      className="form-select"
                    >
                      <option value="javascript">JavaScript</option>
                      <option value="css">CSS</option>
                      <option value="html">HTML</option>
                      <option value="json">JSON</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Code:</label>
                    <div className="code-editor-container">
                      {showSyntaxHighlighting ? (
                        <SyntaxHighlighter
                          language={selectedLanguage}
                          style={tomorrow}
                          className="code-highlighter"
                          showLineNumbers={true}
                          wrapLines={true}
                        >
                          {pastedCode || '// Paste your code here...'}
                        </SyntaxHighlighter>
                      ) : (
                        <textarea
                          value={pastedCode}
                          onChange={(e) => setPastedCode(e.target.value)}
                          placeholder="Paste your code here..."
                          className="code-textarea"
                          rows={15}
                        />
                      )}
                    </div>
                    <div className="editor-controls">
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={showSyntaxHighlighting}
                          onChange={(e) => setShowSyntaxHighlighting(e.target.checked)}
                        />
                        Syntax Highlighting
                      </label>
                    </div>
                  </div>

                  <div className="paste-actions">
                    <button 
                      onClick={savePastedCode}
                      className="btn-primary"
                      disabled={loading || !pastedCode.trim() || !fileName.trim()}
                    >
                      {loading ? '⏳ Saving...' : '💾 Save Code'}
                    </button>
                    <button 
                      onClick={() => setShowCodePaste(false)}
                      className="btn-secondary"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Scroll Progress Indicator */}
        <div className={`scroll-progress ${showSideScroller ? 'visible' : ''}`}>
          <div 
            className="scroll-progress-bar" 
            style={{ width: `${scrollProgress}%` }}
          ></div>
        </div>

        {/* Scroll to Top Button */}
        <button
          className={`scroll-to-top ${showScrollToTop ? 'visible' : ''}`}
          onClick={scrollToTop}
          title="Scroll to top"
        >
          ↑
        </button>

        {/* Side Scroller */}
        <div className={`side-scroller ${showSideScroller ? 'visible' : ''}`}>
          <button
            className="scroll-button"
            onClick={() => scrollToSection('project-section')}
            title="Go to Projects"
          >
            📁
          </button>
          <button
            className="scroll-button"
            onClick={() => scrollToSection('files-section')}
            title="Go to Files"
          >
            📄
          </button>
          <button
            className="scroll-button"
            onClick={scrollToPreview}
            title="Go to Preview"
          >
            👀
          </button>
        </div>
        </div>
      </div>
  );
}

export default CollaborativeEditor;
