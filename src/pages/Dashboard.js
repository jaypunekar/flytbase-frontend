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
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
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

  const generateRandomVideoId = () => {
    return `video_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  };

  const handleAnalyzeVideo = async () => {
    if (!uploadedFile) {
      setError('Please select a file to upload');
      return;
    }

    setIsUploading(true);
    setIsAnalyzing(true);
    setUploadProgress(0);
    setProcessingProgress(0);
    setError(null);
    setProcessingLogs([]);
    
    // Generate a unique video ID for this upload
    const videoId = generateRandomVideoId();
    setCurrentVideoId(videoId);

    try {
      const formData = new FormData();
      formData.append('file', uploadedFile);
      formData.append('video_id', videoId);

      // Use the combined endpoint
      const response = await api.post('/video/upload_and_analyze', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          setUploadProgress(percentCompleted);
        },
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
      
      // Start fetching logs every second
      if (logsCheckInterval.current) {
        clearInterval(logsCheckInterval.current);
      }
      logsCheckInterval.current = setInterval(fetchLogs, 1000);
      
      // Start checking status
      if (statusCheckInterval.current) {
        clearInterval(statusCheckInterval.current);
      }

      statusCheckInterval.current = setInterval(async () => {
        try {
          const response = await api.get('/video/status');
          setAnalysisStatus(response.data);
          
          // Update progress state
          if (response.data.progress !== undefined) {
            setProcessingProgress(response.data.progress);
          }
          
          if (!response.data.processing && response.data.has_data) {
            setMessages(prevMessages => [
              ...prevMessages,
              { text: 'Video analysis complete! You can now chat with the AI about the video content.', sender: 'bot' },
            ]);
            setIsAnalyzing(false); // Important: stop the loading indicator
            setIsUploading(false); // Also stop upload indicator
            setProcessingProgress(100); // Set progress to 100% when done
            clearInterval(statusCheckInterval.current);
            clearInterval(logsCheckInterval.current);
            
            // Refresh video list to show the new video
            fetchVideos();
          }
        } catch (err) {
          console.error('Error checking analysis status:', err);
        }
      }, 3000);
      
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to process video');
      setIsUploading(false);
      setIsAnalyzing(false);
    }
  };

  const handleChatSubmit = async (e) => {
    e.preventDefault();
    
    if (!chatInput.trim()) return;
    
    const userMessage = { text: chatInput, sender: 'user' };
    setMessages([...messages, userMessage]);
    const question = chatInput;
    setChatInput('');
    
    try {
      // For ongoing processing, use the initial VLM assessment
      // Even if vectorstore isn't fully ready
      const response = await api.post('/video/chat', { 
        question,
        video_id: videoDetails?.video_id || currentVideoId 
      });
      const botMessage = { text: response.data.answer, sender: 'bot' };
      setMessages(prev => [...prev, botMessage]);
    } catch (err) {
      console.error('Chat error:', err);
      setMessages(prev => [...prev, { 
        text: err.response?.data?.detail || 'Failed to get a response. The system might still be processing the video.', 
        sender: 'bot' 
      }]);
    }
  };

  const handleReset = () => {
    // Allow the user to upload and analyze a new video
    setUploadedFile(null);
    setIsAnalyzing(false);
    setIsUploading(false);
    setUploadProgress(0);
    setProcessingProgress(0);
    setProcessingLogs([]);
    // Keep chat history
  };

  const fetchVideoLogs = async (videoId) => {
    setIsLoading(true);
    try {
      const response = await api.get(`/video/${videoId}/logs`);
      if (response.data && response.data.logs) {
        setVideoLogs(response.data.logs);
      }
    } catch (err) {
      console.error('Error fetching video logs:', err);
      setError('Failed to load video logs');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteVideo = async (videoId) => {
    setIsDeleting(true);
    try {
      await api.delete(`/video/${videoId}`);
      // Remove the deleted video from the list
      setVideos(videos.filter(v => v.video_id !== videoId));
      // Close dialog if open
      setDialogOpen(false);
      // Show success message
      alert('Video deleted successfully');
    } catch (err) {
      console.error('Error deleting video:', err);
      setError('Failed to delete video');
    } finally {
      setIsDeleting(false);
      setDeleteConfirmOpen(false);
    }
  };

  const handleVideoClick = (video, event) => {
    // Check if delete button was clicked
    if (event?.target?.closest('.delete-button')) {
      event.stopPropagation();
      setSelectedVideo(video);
      setDeleteConfirmOpen(true);
      return;
    }

    setSelectedVideo(video);
    fetchVideoDetails(video.video_id);
    fetchVideoLogs(video.video_id);
    setDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setDialogTab(0);
    setDialogChatMessages([]);
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
              
              <Divider sx={{ my: 3 }} />
              
              <Box>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                  <VideoLibraryIcon sx={{ mr: 1 }} />
                  Your Videos
                </Typography>
                
                {isLoading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                    <CircularProgress />
                  </Box>
                ) : (
                  <VideoGrid container spacing={2}>
                    {videos.length > 0 ? (
                      videos.map((video) => (
                        <Grid item xs={12} sm={6} key={video.id}>
                          <Card sx={{ cursor: 'pointer' }} onClick={(e) => handleVideoClick(video, e)}>
                            <CardMedia
                              component="img"
                              height="140"
                              image={video.thumbnail_url || '/placeholder-video.jpg'}
                              alt={video.filename}
                            />
                            <CardContent>
                              <Typography gutterBottom variant="h6" noWrap>
                                {video.filename}
                              </Typography>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                <Typography variant="body2" color="text.secondary">
                                  {formatDuration(video.duration_seconds)}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  {formatBytes(video.size_bytes)}
                                </Typography>
                              </Box>
                              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <Box>
                                  <Chip 
                                    label={video.status} 
                                    size="small" 
                                    color={video.status === 'completed' ? 'success' : 'warning'} 
                                    variant="outlined"
                                  />
                                  {video.alert_count > 0 && (
                                    <Chip
                                      icon={<WarningIcon />}
                                      label={`${video.alert_count} alert${video.alert_count > 1 ? 's' : ''}`}
                                      size="small"
                                      color="error"
                                      sx={{ ml: 1 }}
                                    />
                                  )}
                                </Box>
                                <IconButton 
                                  size="small" 
                                  color="error" 
                                  className="delete-button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedVideo(video);
                                    setDeleteConfirmOpen(true);
                                  }}
                                >
                                  <DeleteIcon />
                                </IconButton>
                              </Box>
                            </CardContent>
                          </Card>
                        </Grid>
                      ))
                    ) : (
                      <Grid item xs={12}>
                        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                          No videos available. Upload and analyze a video to see it here.
                        </Typography>
                      </Grid>
                    )}
                  </VideoGrid>
                )}
              </Box>
            </Paper>
          </Grid>
          
          {/* Right side: Chat with AI */}
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
                />
                <Button
                  type="submit"
                  variant="contained"
                  endIcon={<SendIcon />}
                  disabled={!chatInput.trim()}
                >
                  Send
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
                <>
                  <Button 
                    variant="outlined"
                    onClick={handleStartNewDialogChat}
                  >
                    Chat with this Video
                  </Button>
                  <Button 
                    variant="contained" 
                    onClick={() => {
                      setDialogOpen(false);
                      setCurrentVideoId(videoDetails.video_id);
                      setMessages([]);
                    }}
                  >
                    Use in Main Chat
                  </Button>
                </>
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