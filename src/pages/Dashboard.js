import React, { useState, useEffect, useContext, useRef } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { 
  Box, 
  Grid, 
  Paper, 
  Typography, 
  Button, 
  TextField, 
  CircularProgress,
  AppBar,
  Toolbar,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Divider,
  Alert,
  Tabs,
  Tab,
  Card,
  CardContent,
  CardMedia,
  CardActions,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  LinearProgress,
  Menu,
  MenuItem
} from '@mui/material';
import { styled } from '@mui/material/styles';
import LogoutIcon from '@mui/icons-material/Logout';
import SendIcon from '@mui/icons-material/Send';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import VideoLibraryIcon from '@mui/icons-material/VideoLibrary';
import LiveTvIcon from '@mui/icons-material/LiveTv';
import WarningIcon from '@mui/icons-material/Warning';
import DeleteIcon from '@mui/icons-material/Delete';
import MenuIcon from '@mui/icons-material/Menu';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';

// Styled components
const ChatMessage = styled(Box)(({ theme, sender }) => ({
  padding: theme.spacing(1, 2),
  borderRadius: theme.spacing(2),
  marginBottom: theme.spacing(1),
  maxWidth: '70%',
  wordBreak: 'break-word',
  ...(sender === 'user' && {
    backgroundColor: theme.palette.primary.main,
    color: theme.palette.primary.contrastText,
    alignSelf: 'flex-end',
  }),
  ...(sender === 'bot' && {
    backgroundColor: theme.palette.grey[200],
    color: theme.palette.text.primary,
    alignSelf: 'flex-start',
  }),
}));

const ChatMessagesContainer = styled(Box)({
  display: 'flex',
  flexDirection: 'column',
  overflow: 'auto',
  height: '350px',
  padding: '16px',
});

const LogsContainer = styled(Box)({
  maxHeight: '200px',
  overflowY: 'auto',
  backgroundColor: '#f5f5f5',
  padding: '10px',
  borderRadius: '4px',
  fontFamily: 'monospace',
  fontSize: '12px',
  marginTop: '10px',
});

const VideoGrid = styled(Grid)({
  marginTop: '20px',
});

const VisuallyHiddenInput = styled('input')({
  clip: 'rect(0 0 0 0)',
  clipPath: 'inset(50%)',
  height: 1,
  overflow: 'hidden',
  position: 'absolute',
  bottom: 0,
  left: 0,
  whiteSpace: 'nowrap',
  width: 1,
});

// Tab Panel component
function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 2 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

export default function Dashboard() {
  const { logout } = useContext(AuthContext);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStatus, setAnalysisStatus] = useState(null);
  
  // Single chatbot state instead of three
  const [messages, setMessages] = useState([
    { text: "Hello! I can help analyze your video content. Upload a video to get started.", sender: 'bot' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  
  const [error, setError] = useState(null);
  const [processingLogs, setProcessingLogs] = useState([]);
  const [currentVideoId, setCurrentVideoId] = useState(null);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [videoDetails, setVideoDetails] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogTab, setDialogTab] = useState(0);
  const [videos, setVideos] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [dialogChatMessages, setDialogChatMessages] = useState([]);
  const [dialogChatInput, setDialogChatInput] = useState('');
  const [videoLogs, setVideoLogs] = useState([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  
  // Single chatbot ref
  const chatMessagesRef = useRef(null);
  const logsContainerRef = useRef(null);
  const statusCheckInterval = useRef(null);
  const logsCheckInterval = useRef(null);
  const dialogChatMessagesRef = useRef(null);

  // Add menu state
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  // Load videos on mount
  useEffect(() => {
    fetchVideos();
  }, []);

  // Scroll to bottom of chat when messages change
  useEffect(() => {
    if (chatMessagesRef.current) {
      chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
    }
  }, [messages]);

  // Scroll to bottom of logs when they change
  useEffect(() => {
    if (logsContainerRef.current) {
      logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight;
    }
  }, [processingLogs]);

  // Scroll to bottom of dialog chat when messages change
  useEffect(() => {
    if (dialogChatMessagesRef.current) {
      dialogChatMessagesRef.current.scrollTop = dialogChatMessagesRef.current.scrollHeight;
    }
  }, [dialogChatMessages]);

  // Clear intervals on unmount
  useEffect(() => {
    return () => {
      if (statusCheckInterval.current) {
        clearInterval(statusCheckInterval.current);
      }
      if (logsCheckInterval.current) {
        clearInterval(logsCheckInterval.current);
      }
    };
  }, []);

  // Adding back the missing function definitions
  const fetchVideos = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/video/all');
      setVideos(response.data);
    } catch (err) {
      console.error('Error fetching videos:', err);
      setError('Failed to load videos');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchVideoDetails = async (videoId) => {
    setIsLoading(true);
    try {
      const response = await api.get(`/video/${videoId}/details`);
      setVideoDetails(response.data);
    } catch (err) {
      console.error('Error fetching video details:', err);
      setError('Failed to load video details');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (event) => {
    if (event.target.files && event.target.files[0]) {
      setUploadedFile(event.target.files[0]);
      setUploadProgress(0);
      setError(null);
    }
  };

  const fetchLogs = async () => {
    try {
      const response = await api.get('/video/logs');
      if (response.data && response.data.logs) {
        setProcessingLogs(response.data.logs);
      }
    } catch (err) {
      console.error('Error fetching logs:', err);
    }
  };

  const handleAnalyzeVideo = async () => {
    if (!uploadedFile) {
      setError('Please select a file to upload');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setError(null);
    setProcessingLogs([]);
    setIsAnalyzing(false);
    const formData = new FormData();
    formData.append('file', uploadedFile);
    
    // Generate video ID
    const videoId = `video_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    formData.append('video_id', videoId);
    setCurrentVideoId(videoId);
    
    try {
      const onUploadProgress = (progressEvent) => {
        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        setUploadProgress(percentCompleted);
      };
      
      // Upload the video
      const response = await api.post('/video/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress,
      });

      setMessages([
        ...messages,
        { text: 'Video upload and analysis started!', sender: 'bot' },
      ]);
      
      // If the operation was resuming a previous analysis
      if (response.data.resumed) {
        setMessages(prevMessages => [
          ...prevMessages,
          { text: 'Resuming analysis from where it was interrupted.', sender: 'bot' },
        ]);
      }
      
      // Start tracking analysis status
      setIsAnalyzing(true);
      statusCheckInterval.current = setInterval(async () => {
        try {
          const statusResponse = await api.get(`/video/${videoId}/status`);
          setAnalysisStatus(statusResponse.data);
          setProcessingProgress(statusResponse.data.progress);
          
          if (!statusResponse.data.processing && statusResponse.data.has_data) {
            setMessages(prevMessages => [
              ...prevMessages,
              { text: 'Video analysis complete! You can now chat with the AI about the video content.', sender: 'bot' },
            ]);
            
            clearInterval(statusCheckInterval.current);
            clearInterval(logsCheckInterval.current);
          }
        } catch (err) {
          console.error('Error checking analysis status:', err);
          clearInterval(statusCheckInterval.current);
        }
      }, 5000);
      
      // Start tracking logs
      logsCheckInterval.current = setInterval(fetchLogs, 3000);
      
    } catch (err) {
      console.error('Error uploading video:', err);
      setIsUploading(false);
      setError(err.response?.data?.detail || 'Failed to upload video');
      setMessages([
        ...messages,
        { text: `Error: ${err.response?.data?.detail || 'Failed to upload and analyze video'}`, sender: 'bot' },
      ]);
    }
  };

  const handleReset = () => {
    setUploadedFile(null);
    setUploadProgress(0);
    setError(null);
    setProcessingLogs([]);
    setIsAnalyzing(false);
    setAnalysisStatus(null);
    setCurrentVideoId(null);
  };

  const fetchVideoLogs = async (videoId) => {
    try {
      const response = await api.get(`/video/${videoId}/logs`);
      if (response.data && response.data.logs) {
        setVideoLogs(response.data.logs);
      }
    } catch (err) {
      console.error('Error fetching video logs:', err);
      setVideoLogs([]);
    }
  };

  const handleDeleteVideo = async (videoId) => {
    setIsDeleting(true);
    try {
      await api.delete(`/video/${videoId}`);
      setDeleteConfirmOpen(false);
      setDialogOpen(false);
      fetchVideos();
    } catch (err) {
      console.error('Error deleting video:', err);
      setError('Failed to delete video');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleVideoClick = (video, event) => {
    if (event.target.closest('.delete-button')) {
      return;
    }
    
    setSelectedVideo(video);
    setDialogOpen(true);
    setDialogTab(0);
    fetchVideoDetails(video.video_id);
    fetchVideoLogs(video.video_id);
    setDialogChatMessages([]);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setSelectedVideo(null);
    setVideoDetails(null);
  };

  const handleDialogTabChange = (event, newValue) => {
    setDialogTab(newValue);
  };

  const handleDialogChatSubmit = async (e) => {
    e.preventDefault();
    
    if (!dialogChatInput.trim()) return;
    
    const userMessage = { text: dialogChatInput, sender: 'user' };
    setDialogChatMessages([...dialogChatMessages, userMessage]);
    const question = dialogChatInput;
    setDialogChatInput('');
    
    try {
      const response = await api.post('/video/chat', { 
        question,
        video_id: selectedVideo?.video_id
      });
      const botMessage = { text: response.data.answer, sender: 'bot' };
      setDialogChatMessages(prev => [...prev, botMessage]);
    } catch (err) {
      console.error('Dialog chat error:', err);
      setDialogChatMessages(prev => [...prev, { 
        text: err.response?.data?.detail || 'Failed to get a response for this video.', 
        sender: 'bot' 
      }]);
    }
  };

  const formatBytes = (bytes, decimals = 2) => {
    if (!bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  const formatDuration = (seconds) => {
    if (!seconds) return '0:00';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Add a function to start a new chat for the selected video
  const handleStartNewDialogChat = () => {
    setDialogTab(3); // Switch to chatbot tab
    setDialogChatMessages([]); // Clear previous chat messages
  };

  const handleMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
  };

  // Single chat submit handler
  const handleChatSubmit = async (e) => {
    e.preventDefault();
    
    if (!chatInput.trim() || !currentVideoId) return;
    
    const userMessage = { text: chatInput, sender: 'user' };
    setMessages([...messages, userMessage]);
    const question = chatInput;
    setChatInput('');
    
    setIsChatLoading(true);
    
    try {
      const response = await api.post('/video/chat', { 
        question, 
        video_id: currentVideoId
      });
      
      const botMessage = { text: response.data.answer, sender: 'bot' };
      setMessages(prev => [...prev, botMessage]);
    } catch (err) {
      console.error('Chat error:', err);
      setMessages(prev => [...prev, { 
        text: 'Sorry, I could not process your request at this time.', 
        sender: 'bot' 
      }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static" sx={{ marginBottom: 2 }}>
        <Toolbar>
          <IconButton
            size="large"
            edge="start"
            color="inherit"
            aria-label="menu"
            sx={{ mr: 2 }}
            onClick={handleMenu}
          >
            <MenuIcon />
          </IconButton>
          <Menu
            id="menu-appbar"
            anchorEl={anchorEl}
            anchorOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            keepMounted
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            open={open}
            onClose={handleCloseMenu}
          >
            <MenuItem component={RouterLink} to="/dashboard" onClick={handleCloseMenu}>
              <VideoLibraryIcon sx={{ mr: 1 }} />
              Videos
            </MenuItem>
            <MenuItem component={RouterLink} to="/streams" onClick={handleCloseMenu}>
              <LiveTvIcon sx={{ mr: 1 }} />
              Live Streams
            </MenuItem>
          </Menu>
          <VideoLibraryIcon sx={{ mr: 2 }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Video Dashboard
          </Typography>
          <Button color="inherit" onClick={logout} startIcon={<LogoutIcon />}>
            Logout
          </Button>
        </Toolbar>
      </AppBar>
      
      <Box sx={{ p: 3 }}>
        <Grid container spacing={3}>
          {/* Left side: Video upload and analysis */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, height: '100%' }}>
              <Typography variant="h5" gutterBottom>
                Video Upload & Analysis
              </Typography>
              
              {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {error}
                </Alert>
              )}
              
              <Box sx={{ mb: 3 }}>
                <Button
                  component="label"
                  variant="contained"
                  startIcon={<UploadFileIcon />}
                  sx={{ mr: 2 }}
                  disabled={isUploading || isAnalyzing}
                >
                  Select Video
                  <VisuallyHiddenInput type="file" onChange={handleFileChange} accept="video/*" />
                </Button>
                
                <Button
                  variant="contained"
                  color="secondary"
                  startIcon={<PlayArrowIcon />}
                  onClick={handleAnalyzeVideo}
                  disabled={!uploadedFile || isUploading || isAnalyzing}
                  sx={{ mr: 2 }}
                >
                  Analyze Video
                </Button>
                
                {!isAnalyzing && analysisStatus?.has_data && (
                  <Button 
                    variant="outlined"
                    onClick={handleReset}
                  >
                    Analyze New Video
                  </Button>
                )}
                
                {uploadedFile && (
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    Selected file: {uploadedFile.name}
                  </Typography>
                )}
                
                {(isUploading || isAnalyzing) && (
                  <Box sx={{ mt: 2 }}>
                    {isUploading && uploadProgress < 100 && (
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <CircularProgress size={24} sx={{ mr: 2 }} />
                        <Typography variant="body2">
                          Uploading: {uploadProgress}%
                        </Typography>
                      </Box>
                    )}
                    
                    {(uploadProgress === 100 || isAnalyzing) && (
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <CircularProgress size={24} sx={{ mr: 2 }} />
                        <Typography variant="body2">
                          {analysisStatus?.processing 
                            ? `Processing video... ${processingProgress}%` 
                            : 'Analysis complete'}
                        </Typography>
                      </Box>
                    )}
                    
                    <Box sx={{ width: '100%' }}>
                      <LinearProgress 
                        variant="determinate" 
                        value={isUploading && uploadProgress < 100 ? uploadProgress : processingProgress} 
                        color="secondary"
                        sx={{ height: 8, borderRadius: 4 }}
                      />
                    </Box>
                  </Box>
                )}
              </Box>
              
              <Divider sx={{ my: 2 }} />
              
              <Box>
                {(isAnalyzing || processingLogs.length > 0) && (
                  <Box sx={{ mt: 3 }}>
                    <Typography variant="h6" gutterBottom>
                      Processing Logs
                    </Typography>
                    <LogsContainer ref={logsContainerRef}>
                      {processingLogs.length > 0 ? (
                        processingLogs.map((log, index) => (
                          <div key={index} className="log-line">
                            {log}
                          </div>
                        ))
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          Waiting for logs...
                        </Typography>
                      )}
                    </LogsContainer>
                  </Box>
                )}
              </Box>
            </Paper>
          </Grid>
          
          {/* Right side: Single Chatbot */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
              <Typography variant="h5" gutterBottom>
                Chat with Video Analysis AI
              </Typography>
              
              <ChatMessagesContainer ref={chatMessagesRef}>
                {messages.length === 0 ? (
                  <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mt: 10 }}>
                    No messages yet. Upload and analyze a video, then start chatting!
                  </Typography>
                ) : (
                  messages.map((message, index) => (
                    <ChatMessage key={index} sender={message.sender}>
                      {message.text}
                    </ChatMessage>
                  ))
                )}
              </ChatMessagesContainer>
              
              <Box component="form" onSubmit={handleChatSubmit} sx={{ mt: 'auto', display: 'flex' }}>
                <TextField
                  fullWidth
                  placeholder="Ask about the video analysis..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  sx={{ mr: 2 }}
                  disabled={isChatLoading}
                />
                <Button
                  type="submit"
                  variant="contained"
                  endIcon={isChatLoading ? <CircularProgress size={16} color="inherit" /> : <SendIcon />}
                  disabled={!chatInput.trim() || !currentVideoId || isChatLoading}
                >
                  {isChatLoading ? 'Thinking' : 'Send'}
                </Button>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </Box>
      
      {/* Video Details Dialog */}
      <Dialog 
        open={dialogOpen} 
        onClose={handleDialogClose}
        maxWidth="md"
        fullWidth
      >
        {selectedVideo && (
          <>
            <DialogTitle>
              {selectedVideo.filename}
            </DialogTitle>
            <DialogContent dividers>
              {isLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}>
                  <CircularProgress />
                </Box>
              ) : (
                <>
                  <Tabs value={dialogTab} onChange={handleDialogTabChange} centered sx={{ mb: 2 }}>
                    <Tab label="Details" />
                    <Tab label="Logs" />
                    <Tab label="Alerts" />
                    <Tab label="Chatbot" />
                  </Tabs>
                  
                  <TabPanel value={dialogTab} index={0}>
                    {videoDetails && (
                      <Grid container spacing={2}>
                        <Grid item xs={12} md={6}>
                          {videoDetails.video_url ? (
                            <video 
                              controls 
                              width="100%" 
                              poster={videoDetails.thumbnail_url}
                              src={videoDetails.video_url}
                            />
                          ) : (
                            <Box sx={{ 
                              height: 250, 
                              width: '100%', 
                              bgcolor: 'grey.200', 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'center' 
                            }}>
                              <Typography>Video not available</Typography>
                            </Box>
                          )}
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <Typography variant="h6" gutterBottom>Video Information</Typography>
                          <Typography variant="body2"><strong>Duration:</strong> {formatDuration(videoDetails.duration_seconds)}</Typography>
                          <Typography variant="body2"><strong>Resolution:</strong> {videoDetails.resolution}</Typography>
                          <Typography variant="body2"><strong>Size:</strong> {formatBytes(videoDetails.size_bytes)}</Typography>
                          <Typography variant="body2"><strong>Alerts:</strong> {videoDetails.alert_count}</Typography>
                          <Typography variant="body2"><strong>Status:</strong> {videoDetails.status}</Typography>
                          <Typography variant="body2"><strong>Created:</strong> {new Date(videoDetails.created_at).toLocaleString()}</Typography>
                        </Grid>
                      </Grid>
                    )}
                  </TabPanel>
                  
                  <TabPanel value={dialogTab} index={1}>
                    <Typography variant="h6" gutterBottom>Processing Logs</Typography>
                    {isLoading ? (
                      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                        <CircularProgress size={24} />
                      </Box>
                    ) : (
                      <LogsContainer sx={{ height: '350px' }}>
                        {videoLogs.length > 0 ? (
                          videoLogs.map((log, index) => (
                            <div key={index} className="log-line">
                              {log}
                            </div>
                          ))
                        ) : (
                          <Typography variant="body2" color="text.secondary">No logs available</Typography>
                        )}
                      </LogsContainer>
                    )}
                  </TabPanel>
                  
                  <TabPanel value={dialogTab} index={2}>
                    <Typography variant="h6" gutterBottom>Confirmed Alerts</Typography>
                    {videoDetails?.alerts?.filter(alert => alert.is_confirmed_alert)?.length > 0 ? (
                      <Box sx={{ mt: 2 }}>
                        {videoDetails.alerts
                          .filter(alert => alert.is_confirmed_alert)
                          .map((alert, index) => (
                            <Alert 
                              key={index} 
                              severity="warning" 
                              sx={{ mb: 2 }}
                            >
                              <Typography variant="subtitle2">
                                Frame {alert.frame_id} - {alert.timestamp ? `${Math.floor(alert.timestamp / 60)}:${(alert.timestamp % 60).toString().padStart(2, '0')}` : 'Unknown time'}
                              </Typography>
                              <Typography variant="body2">{alert.description}</Typography>
                            </Alert>
                          ))}
                      </Box>
                    ) : (
                      <Typography variant="body2" color="text.secondary">No confirmed alerts detected in this video</Typography>
                    )}
                  </TabPanel>
                  
                  <TabPanel value={dialogTab} index={3}>
                    <Typography variant="h6" gutterBottom>Chat with this Video</Typography>
                    <Box sx={{ height: '350px', display: 'flex', flexDirection: 'column' }}>
                      <ChatMessagesContainer ref={dialogChatMessagesRef}>
                        {dialogChatMessages.length === 0 ? (
                          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mt: 10 }}>
                            Ask questions about this specific video.
                          </Typography>
                        ) : (
                          dialogChatMessages.map((message, index) => (
                            <ChatMessage key={index} sender={message.sender}>
                              {message.text}
                            </ChatMessage>
                          ))
                        )}
                      </ChatMessagesContainer>
                      
                      <Box component="form" onSubmit={handleDialogChatSubmit} sx={{ mt: 'auto', display: 'flex' }}>
                        <TextField
                          fullWidth
                          placeholder="Ask about this video..."
                          value={dialogChatInput}
                          onChange={(e) => setDialogChatInput(e.target.value)}
                          sx={{ mr: 2 }}
                        />
                        <Button
                          type="submit"
                          variant="contained"
                          endIcon={<SendIcon />}
                          disabled={!dialogChatInput.trim()}
                        >
                          Send
                        </Button>
                      </Box>
                    </Box>
                  </TabPanel>
                </>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={handleDialogClose}>Close</Button>
              <Button
                color="error"
                startIcon={<DeleteIcon />}
                onClick={() => {
                  setDeleteConfirmOpen(true);
                }}
              >
                Delete Video
              </Button>
              {videoDetails && (
                <Button 
                  variant="outlined"
                  onClick={handleStartNewDialogChat}
                >
                  Chat with this Video
                </Button>
              )}
            </DialogActions>
          </>
        )}
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
      >
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete {selectedVideo?.filename}? This cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)} disabled={isDeleting}>
            Cancel
          </Button>
          <Button 
            onClick={() => handleDeleteVideo(selectedVideo?.video_id)} 
            color="error" 
            variant="contained"
            disabled={isDeleting}
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}