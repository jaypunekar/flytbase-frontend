import React, { useState, useEffect, useRef, useContext } from 'react';
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
import VideoLibraryIcon from '@mui/icons-material/VideoLibrary';
import SendIcon from '@mui/icons-material/Send';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import DeleteIcon from '@mui/icons-material/Delete';
import WarningIcon from '@mui/icons-material/Warning';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import LiveTvIcon from '@mui/icons-material/LiveTv';
import LogoutIcon from '@mui/icons-material/Logout';
import MenuIcon from '@mui/icons-material/Menu';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import IVSPlayer from '../components/IVSPlayer';
import { formatIVSUrl, extractStreamMetrics } from '../utils/StreamUtils';

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

const StreamGrid = styled(Grid)({
  marginTop: '20px',
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

// Debug function to log the response structure
const logStreamApiResponse = (response, label) => {
  console.group(`Stream API Response: ${label}`);
  console.log('Status:', response.status);
  console.log('Headers:', response.headers);
  console.log('Data Type:', typeof response.data);
  console.log('Data Structure:', response.data);
  
  if (response.data && typeof response.data === 'object') {
    console.log('Keys:', Object.keys(response.data));
    if (response.data.logs) {
      console.log('Logs Type:', typeof response.data.logs);
      console.log('Logs is Array:', Array.isArray(response.data.logs));
      console.log('Logs Length:', Array.isArray(response.data.logs) ? response.data.logs.length : 'N/A');
      if (Array.isArray(response.data.logs) && response.data.logs.length > 0) {
        console.log('First Log Entry:', response.data.logs[0]);
      }
    }
  }
  console.groupEnd();
};

export default function Streams() {
  const { logout } = useContext(AuthContext);
  const [streamName, setStreamName] = useState('');
  const [streamUrl, setStreamUrl] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState(null);
  const [streams, setStreams] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const [selectedStream, setSelectedStream] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogTab, setDialogTab] = useState(0);
  const [dialogChatMessages, setDialogChatMessages] = useState([]);
  const [dialogChatInput, setDialogChatInput] = useState('');
  const [streamLogs, setStreamLogs] = useState([]);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  
  const chatMessagesRef = useRef(null);
  const dialogChatMessagesRef = useRef(null);
  const statusCheckInterval = useRef(null);
  const logsRefreshInterval = useRef(null);

  // Add menu state
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  // Add a ref for the logs container
  const logsContainerRef = useRef(null);

  // Add a new state for iframe loading error
  const [streamLoadError, setStreamLoadError] = useState(false);

  // Add a state to track stream card preview errors
  const [streamCardErrors, setStreamCardErrors] = useState({});

  // Add stream metrics state
  const [streamMetrics, setStreamMetrics] = useState({});

  // Add state for editing the URL
  const [isEditingUrl, setIsEditingUrl] = useState(false);
  const [editedUrl, setEditedUrl] = useState('');

  // Add state for chat loading indicator
  const [isChatLoading, setIsChatLoading] = useState(false);

  // Load streams on mount
  useEffect(() => {
    fetchStreams();
  }, []);

  // Scroll to bottom of chat when messages change
  useEffect(() => {
    if (dialogChatMessagesRef.current) {
      dialogChatMessagesRef.current.scrollTop = dialogChatMessagesRef.current.scrollHeight;
    }
  }, [dialogChatMessages]);

  // Add useEffect for auto-scrolling logs
  useEffect(() => {
    if (logsContainerRef.current) {
      logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight;
    }
  }, [streamLogs]);

  // Clear intervals on unmount
  useEffect(() => {
    return () => {
      if (statusCheckInterval.current) {
        clearInterval(statusCheckInterval.current);
      }
      if (logsRefreshInterval.current) {
        clearInterval(logsRefreshInterval.current);
      }
    };
  }, []);

  // Add this in the useEffect to process logs when they change
  useEffect(() => {
    if (streamLogs.length > 0 && selectedStream) {
      const metrics = extractStreamMetrics(streamLogs);
      setStreamMetrics(metrics);
    }
  }, [streamLogs, selectedStream]);

  const fetchStreams = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/stream/all');
      setStreams(response.data);
    } catch (err) {
      console.error('Error fetching streams:', err);
      setError('Failed to load streams');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStreamDetails = async (streamId) => {
    setIsLoading(true);
    try {
      console.log(`Fetching details for stream: ${streamId}`);
      const response = await api.get(`/stream/${streamId}`);
      
      // Debug response structure
      logStreamApiResponse(response, 'Stream Details Endpoint');
      
      setSelectedStream(response.data);
      return response.data;
    } catch (err) {
      console.error('Error fetching stream details:', err);
      setError('Failed to load stream details');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterStream = async (e) => {
    e.preventDefault();
    setError(null);
    setIsRegistering(true);
    
    if (!streamUrl) {
      setError("Please enter a stream URL");
      setIsRegistering(false);
      return;
    }
    
    try {
      const formattedUrl = formatIVSUrl(streamUrl);
      console.log('Registering stream with formatted URL:', formattedUrl);
      
      const response = await api.post('/stream/register', {
        name: streamName || `Stream ${new Date().toLocaleTimeString()}`,
        ivs_url: formattedUrl,
        stream_id: `stream_${Date.now()}`
      });
      
      console.log('Stream registration response:', response.data);
      setStreams([...streams, response.data]);
      setStreamName('');
      setStreamUrl('');
    } catch (err) {
      console.error('Error registering stream:', err);
      setError(err.response?.data?.detail || `Failed to register stream: ${err.message}`);
    } finally {
      setIsRegistering(false);
    }
  };

  const handleStartStream = async (streamId) => {
    setError(null);
    setIsStarting(true);
    
    try {
      await api.post(`/stream/${streamId}/start`);
      
      // Start checking stream status
      if (statusCheckInterval.current) {
        clearInterval(statusCheckInterval.current);
      }
      
      statusCheckInterval.current = setInterval(() => {
        checkStreamStatus(streamId);
      }, 5000);
      
      fetchStreams();
    } catch (err) {
      console.error('Error starting stream:', err);
      setError(err.response?.data?.detail || 'Failed to start stream');
    } finally {
      setIsStarting(false);
    }
  };

  const handleStopStream = async (streamId) => {
    setError(null);
    setIsStopping(true);
    
    try {
      await api.post(`/stream/${streamId}/stop`);
      
      // Clear status check interval
      if (statusCheckInterval.current) {
        clearInterval(statusCheckInterval.current);
      }
      
      fetchStreams();
    } catch (err) {
      console.error('Error stopping stream:', err);
      setError(err.response?.data?.detail || 'Failed to stop stream');
    } finally {
      setIsStopping(false);
    }
  };

  const checkStreamStatus = async (streamId) => {
    try {
      const response = await api.get(`/stream/status/${streamId}`);
      
      // Update stream in the list
      setStreams(prevStreams => {
        return prevStreams.map(stream => {
          if (stream.stream_id === streamId) {
            return {
              ...stream,
              status: response.data.status,
              processing_progress: response.data.progress
            };
          }
          return stream;
        });
      });
      
      // Update selected stream if it's open in dialog
      if (selectedStream && selectedStream.stream_id === streamId) {
        setSelectedStream(prev => ({
          ...prev,
          status: response.data.status,
          processing_progress: response.data.progress
        }));
      }
    } catch (err) {
      console.error('Error checking stream status:', err);
    }
  };

  const fetchStreamLogs = async (streamId) => {
    try {
      console.log(`Fetching logs for stream: ${streamId}`);
      const response = await api.get(`/stream/${streamId}/logs`);
      
      // Debug response structure
      logStreamApiResponse(response, 'Logs Endpoint');
      
      if (response.data && Array.isArray(response.data.logs)) {
        setStreamLogs(response.data.logs);
      } else if (response.data && response.data.logs) {
        // Try to parse if it's a string
        if (typeof response.data.logs === 'string') {
          try {
            const parsedLogs = JSON.parse(response.data.logs);
            setStreamLogs(Array.isArray(parsedLogs) ? parsedLogs : []);
          } catch (e) {
            console.error('Failed to parse logs as JSON:', e);
            setStreamLogs([]);
          }
        } else {
          // Handle non-array logs
          setStreamLogs([]);
        }
      } else {
        console.warn('Unexpected logs format:', response.data);
        setStreamLogs([]);
      }
    } catch (err) {
      console.error('Error fetching stream logs:', err);
      setError(`Failed to load stream logs: ${err.response?.data?.detail || err.message}`);
      setStreamLogs([]);
    }
  };

  const handleDeleteStream = async (streamId) => {
    setIsDeleting(true);
    try {
      await api.delete(`/stream/${streamId}`);
      setStreams(streams.filter(stream => stream.stream_id !== streamId));
      setDeleteConfirmOpen(false);
      setDialogOpen(false);
    } catch (err) {
      console.error('Error deleting stream:', err);
      setError('Failed to delete stream');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleStreamClick = (stream, event) => {
    event.preventDefault();
    setSelectedStream(stream);
    setDialogOpen(true);
    setDialogTab(0);
    fetchStreamDetails(stream.stream_id).then(data => {
      // Load stream logs
      fetchStreamLogs(stream.stream_id);
      // Load chat history if available
      if (data) {
        // Initialize with any existing chat messages if available
        setDialogChatMessages([
          { sender: 'bot', text: 'Hello! I can answer questions about what I observe in this stream. How can I help you?' }
        ]);
        
        // Set up logs refresh interval if stream is active
        if (data.status === 'active') {
          // Clear any existing interval
          if (logsRefreshInterval.current) {
            clearInterval(logsRefreshInterval.current);
          }
          
          // Set up new refresh interval
          logsRefreshInterval.current = setInterval(() => {
            fetchStreamLogs(stream.stream_id);
          }, 10000); // Refresh logs every 10 seconds
        }
      }
    });
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setSelectedStream(null);
    setDialogChatMessages([]);
    setStreamLogs([]);
    
    // Clear logs refresh interval
    if (logsRefreshInterval.current) {
      clearInterval(logsRefreshInterval.current);
      logsRefreshInterval.current = null;
    }
  };

  const handleDialogTabChange = (event, newValue) => {
    setDialogTab(newValue);
  };

  const handleDialogChatSubmit = async (e) => {
    e.preventDefault();
    
    if (!dialogChatInput.trim() || !selectedStream) return;
    
    const userMessage = { sender: 'user', text: dialogChatInput };
    setDialogChatMessages([...dialogChatMessages, userMessage]);
    setDialogChatInput('');
    
    // Set loading state to true before making API call
    setIsChatLoading(true);
    
    try {
      const response = await api.post(`/stream/${selectedStream.stream_id}/chat`, {
        query: dialogChatInput
      });
      
      setDialogChatMessages(prev => [
        ...prev,
        { sender: 'bot', text: response.data.answer }
      ]);
    } catch (err) {
      console.error('Error getting response from stream chat:', err);
      setDialogChatMessages(prev => [
        ...prev,
        { sender: 'bot', text: 'Sorry, I encountered an error while processing your question.' }
      ]);
    } finally {
      // Set loading state to false after API call completes
      setIsChatLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'error':
        return 'error';
      case 'inactive':
        return 'default';
      default:
        return 'info';
    }
  };

  const handleMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
  };

  // Handle iframe error
  const handleStreamIframeError = () => {
    setStreamLoadError(true);
    console.error('Failed to load stream iframe');
  };

  // Handle iframe load success
  const handleStreamIframeLoad = () => {
    setStreamLoadError(false);
  };

  // Handle stream preview error in cards
  const handleStreamCardError = (streamId) => {
    setStreamCardErrors(prev => ({
      ...prev,
      [streamId]: true
    }));
  };

  // Add function to update stream URL
  const handleUpdateStreamUrl = async () => {
    if (!selectedStream || !editedUrl.trim()) return;
    
    try {
      const formattedUrl = formatIVSUrl(editedUrl);
      console.log(`Updating stream ${selectedStream.stream_id} URL to:`, formattedUrl);
      
      await api.post(`/stream/${selectedStream.stream_id}/update`, {
        ivs_url: formattedUrl
      });
      
      // Update the selected stream
      setSelectedStream({
        ...selectedStream,
        ivs_url: formattedUrl
      });
      
      // Update the stream in the list
      setStreams(prevStreams => {
        return prevStreams.map(stream => {
          if (stream.stream_id === selectedStream.stream_id) {
            return {
              ...stream,
              ivs_url: formattedUrl
            };
          }
          return stream;
        });
      });
      
      // Exit edit mode
      setIsEditingUrl(false);
      setEditedUrl('');
    } catch (err) {
      console.error('Error updating stream URL:', err);
      setError(`Failed to update stream URL: ${err.message}`);
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
          <LiveTvIcon sx={{ mr: 2 }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Live Streams
          </Typography>
          <Button color="inherit" onClick={logout} startIcon={<LogoutIcon />}>
            Logout
          </Button>
        </Toolbar>
      </AppBar>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Register New Stream
        </Typography>
        <form onSubmit={handleRegisterStream}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={5}>
              <TextField
                fullWidth
                label="Stream Name"
                value={streamName}
                onChange={(e) => setStreamName(e.target.value)}
                required
                disabled={isRegistering}
              />
            </Grid>
            <Grid item xs={12} sm={5}>
              <TextField
                fullWidth
                label="AWS IVS Playground URL"
                value={streamUrl}
                onChange={(e) => setStreamUrl(e.target.value)}
                required
                disabled={isRegistering}
                placeholder="e.g., https://ivs.us-west-2.amazonaws.com/..."
              />
            </Grid>
            <Grid item xs={12}>
              <Button
                variant="outlined"
                color="secondary"
                onClick={() => {
                  if (!streamUrl) {
                    setError("Please enter a stream URL first");
                    return;
                  }
                  
                  const formattedUrl = formatIVSUrl(streamUrl);
                  console.log('Testing formatted URL:', formattedUrl);
                  window.open(formattedUrl, '_blank');
                }}
                sx={{ mt: 2 }}
                disabled={!streamUrl.trim() || isRegistering}
              >
                Test Stream URL in New Tab
              </Button>
            </Grid>
            <Grid item xs={12} sm={2}>
              <Button
                fullWidth
                type="submit"
                variant="contained"
                color="primary"
                disabled={isRegistering}
                startIcon={isRegistering ? <CircularProgress size={24} /> : <AddCircleIcon />}
                sx={{ height: '56px' }}
              >
                {isRegistering ? 'Registering...' : 'Register'}
              </Button>
            </Grid>
          </Grid>
        </form>
      </Paper>
      
      <Typography variant="h6" sx={{ mb: 2 }}>
        Your Streams
      </Typography>
      
      {isLoading && <LinearProgress sx={{ mb: 2 }} />}
      
      {streams.length === 0 && !isLoading ? (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="body1">
            You haven't registered any streams yet. Add one using the form above.
          </Typography>
        </Paper>
      ) : (
        <StreamGrid container spacing={3}>
          {streams.map((stream) => (
            <Grid item xs={12} sm={6} md={4} key={stream.stream_id}>
              <Card
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  cursor: 'pointer',
                  transition: 'transform 0.2s',
                  '&:hover': {
                    transform: 'scale(1.02)',
                  },
                }}
                onClick={(e) => handleStreamClick(stream, e)}
              >
                <CardMedia
                  component="div"
                  sx={{ height: 140 }}
                >
                  {stream.status === 'active' ? (
                    <IVSPlayer 
                      streamUrl={formatIVSUrl(stream.ivs_url)} 
                      height="140px"
                    />
                  ) : (
                    <Box
                      component="img"
                      height="140"
                      width="100%"
                      src={stream.thumbnail_url || 'https://via.placeholder.com/300x140?text=Stream'}
                      alt={stream.name}
                      sx={{ bgcolor: 'black', objectFit: 'cover' }}
                    />
                  )}
                </CardMedia>
                <CardContent sx={{ flexGrow: 1 }}>
                  <Typography gutterBottom variant="h6" component="div">
                    {stream.name}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <Chip
                      label={stream.status}
                      color={getStatusColor(stream.status)}
                      size="small"
                      sx={{ mr: 1 }}
                    />
                    {stream.status === 'active' && (
                      <LinearProgress
                        variant="determinate"
                        value={stream.processing_progress || 0}
                        sx={{ flexGrow: 1 }}
                      />
                    )}
                  </Box>
                  {stream.alert_count > 0 && (
                    <Box sx={{ display: 'flex', alignItems: 'center', color: 'error.main' }}>
                      <WarningIcon fontSize="small" sx={{ mr: 0.5 }} />
                      <Typography variant="body2">
                        {stream.alert_count} alert{stream.alert_count !== 1 ? 's' : ''}
                      </Typography>
                    </Box>
                  )}
                </CardContent>
                <CardActions>
                  {stream.status === 'inactive' ? (
                    <Button
                      size="small"
                      startIcon={<PlayArrowIcon />}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStartStream(stream.stream_id);
                      }}
                      disabled={isStarting}
                    >
                      Start
                    </Button>
                  ) : (
                    <Button
                      size="small"
                      startIcon={<StopIcon />}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStopStream(stream.stream_id);
                      }}
                      disabled={isStopping}
                    >
                      Stop
                    </Button>
                  )}
                  <Button
                    size="small"
                    color="error"
                    startIcon={<DeleteIcon />}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedStream(stream);
                      setDeleteConfirmOpen(true);
                    }}
                    disabled={isDeleting}
                  >
                    Delete
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </StreamGrid>
      )}
      
      {/* Stream Details Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={handleDialogClose}
        maxWidth="md"
        fullWidth
      >
        {selectedStream && (
          <>
            <DialogTitle>
              {selectedStream.name}
              <Chip
                label={selectedStream.status}
                color={getStatusColor(selectedStream.status)}
                size="small"
                sx={{ ml: 1 }}
              />
            </DialogTitle>
            <Tabs
              value={dialogTab}
              onChange={handleDialogTabChange}
              centered
            >
              <Tab label="Chat" />
              <Tab label="Logs" />
              <Tab label="Alerts" />
              <Tab label="Details" />
            </Tabs>
            <DialogContent>
              {/* Chat Tab */}
              <TabPanel value={dialogTab} index={0}>
                {selectedStream && selectedStream.status === 'active' && (
                  <Box sx={{ mb: 2, height: '300px' }}>
                    <IVSPlayer streamUrl={formatIVSUrl(selectedStream.ivs_url)} height="300px" />
                  </Box>
                )}
                <ChatMessagesContainer ref={dialogChatMessagesRef}>
                  {dialogChatMessages.map((msg, index) => (
                    <ChatMessage key={index} sender={msg.sender}>
                      {msg.text}
                    </ChatMessage>
                  ))}
                </ChatMessagesContainer>
                <Box
                  component="form"
                  onSubmit={handleDialogChatSubmit}
                  sx={{ display: 'flex', mt: 2 }}
                >
                  <TextField
                    fullWidth
                    value={dialogChatInput}
                    onChange={(e) => setDialogChatInput(e.target.value)}
                    placeholder="Ask about what's happening in the stream..."
                    variant="outlined"
                    size="small"
                    disabled={selectedStream.status !== 'active' || isChatLoading}
                  />
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={!dialogChatInput.trim() || selectedStream.status !== 'active' || isChatLoading}
                    endIcon={isChatLoading ? <CircularProgress size={16} color="inherit" /> : <SendIcon />}
                    sx={{ ml: 1 }}
                  >
                    {isChatLoading ? 'Thinking' : 'Send'}
                  </Button>
                </Box>
                {selectedStream.status !== 'active' && (
                  <Alert severity="info" sx={{ mt: 2 }}>
                    Start the stream to chat with the AI assistant about what it observes.
                  </Alert>
                )}
              </TabPanel>
              
              {/* Logs Tab */}
              <TabPanel value={dialogTab} index={1}>
                <Typography variant="subtitle1" gutterBottom>
                  Stream Processing Logs
                </Typography>
                <Paper variant="outlined" sx={{ p: 1, mb: 2 }}>
                  <Typography variant="body2">
                    <strong>Status:</strong> {selectedStream.status}
                    {selectedStream.status === 'active' && (
                      <> • Processing: {selectedStream.processing_progress || 0}%</>
                    )}
                  </Typography>
                  {streamMetrics && streamMetrics.totalLogs > 0 && (
                    <>
                      <Divider sx={{ my: 1 }} />
                      <Typography variant="body2">
                        <strong>Logs:</strong> {streamMetrics.totalLogs} total
                        {streamMetrics.errorCount > 0 && (
                          <Chip 
                            label={`${streamMetrics.errorCount} errors`} 
                            size="small" 
                            color="error" 
                            sx={{ ml: 1 }}
                          />
                        )}
                        {streamMetrics.warningCount > 0 && (
                          <Chip 
                            label={`${streamMetrics.warningCount} warnings`} 
                            size="small" 
                            color="warning" 
                            sx={{ ml: 1 }}
                          />
                        )}
                      </Typography>
                      {streamMetrics.framesProcessed > 0 && (
                        <Typography variant="body2">
                          <strong>Frames processed:</strong> {streamMetrics.framesProcessed}
                        </Typography>
                      )}
                      {streamMetrics.lastProcessedTime && (
                        <Typography variant="body2">
                          <strong>Last activity:</strong> {streamMetrics.lastProcessedTime.toLocaleTimeString()}
                        </Typography>
                      )}
                      {streamMetrics.recentActivity && (
                        <Typography variant="body2" sx={{ mt: 1 }}>
                          <strong>Recent observation:</strong> {streamMetrics.recentActivity}
                        </Typography>
                      )}
                    </>
                  )}
                </Paper>
                <LogsContainer ref={logsContainerRef} sx={{ maxHeight: '350px' }}>
                  {streamLogs.length === 0 ? (
                    <Alert severity="info">
                      No logs available. Start the stream to begin generating logs.
                    </Alert>
                  ) : (
                    streamLogs.map((log, index) => (
                      <Box key={index} sx={{ mb: 1, p: 1, borderRadius: 1, bgcolor: log.log_type === 'error' ? 'error.100' : log.log_type === 'warning' ? 'warning.100' : 'grey.100' }}>
                        <Typography variant="caption" color="text.secondary" display="block">
                          {new Date(log.created_at).toLocaleString()}
                          {log.frame_id && ` - Frame ${log.frame_id}`}
                        </Typography>
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            fontFamily: 'monospace',
                            color: log.log_type === 'error' ? 'error.main' : 
                                  log.log_type === 'warning' ? 'warning.main' : 'inherit',
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word'
                          }}
                        >
                          {log.message}
                        </Typography>
                      </Box>
                    ))
                  )}
                </LogsContainer>
                {selectedStream.status === 'active' && (
                  <Button 
                    variant="outlined" 
                    size="small" 
                    onClick={() => fetchStreamLogs(selectedStream.stream_id)}
                    sx={{ mt: 2 }}
                  >
                    Refresh Logs
                  </Button>
                )}
              </TabPanel>
              
              {/* Alerts Tab */}
              <TabPanel value={dialogTab} index={2}>
                {selectedStream.alerts && selectedStream.alerts.length > 0 ? (
                  <List>
                    {selectedStream.alerts.map((alert) => (
                      <React.Fragment key={alert.id}>
                        <ListItem alignItems="flex-start">
                          <ListItemText
                            primary={
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <WarningIcon color="error" sx={{ mr: 1 }} />
                                <Typography variant="subtitle1">
                                  Alert at Frame {alert.frame_id}
                                  {alert.timestamp && ` (${Math.floor(alert.timestamp / 60)}:${String(alert.timestamp % 60).padStart(2, '0')})`}
                                </Typography>
                              </Box>
                            }
                            secondary={
                              <>
                                <Typography variant="body2" color="text.primary">
                                  {alert.description}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  Detected at {new Date(alert.created_at).toLocaleString()}
                                </Typography>
                              </>
                            }
                          />
                        </ListItem>
                        <Divider component="li" />
                      </React.Fragment>
                    ))}
                  </List>
                ) : (
                  <Typography variant="body1" sx={{ p: 2, textAlign: 'center' }}>
                    No alerts detected for this stream.
                  </Typography>
                )}
              </TabPanel>
              
              {/* Details Tab */}
              <TabPanel value={dialogTab} index={3}>
                <Typography variant="subtitle1">Stream Information</Typography>
                <Typography variant="body2"><strong>Stream ID:</strong> {selectedStream.stream_id}</Typography>
                <Typography variant="body2"><strong>Status:</strong> {selectedStream.status}</Typography>
                <Typography variant="body2"><strong>Created:</strong> {new Date(selectedStream.created_at).toLocaleString()}</Typography>
                {selectedStream.last_active_at && (
                  <Typography variant="body2">
                    <strong>Last Active:</strong> {new Date(selectedStream.last_active_at).toLocaleString()}
                  </Typography>
                )}
                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle1">Stream URL</Typography>
                <TextField
                  fullWidth
                  value={selectedStream.ivs_url}
                  InputProps={{
                    readOnly: true,
                  }}
                  variant="outlined"
                  size="small"
                  margin="normal"
                />
                <Typography variant="body2" color="textSecondary" gutterBottom>
                  Formatted playback URL:
                </Typography>
                <TextField
                  fullWidth
                  value={formatIVSUrl(selectedStream.ivs_url)}
                  InputProps={{
                    readOnly: true,
                  }}
                  variant="outlined"
                  size="small"
                  margin="normal"
                />
                <Box sx={{ mt: 2, mb: 2 }}>
                  <Button 
                    variant={isEditingUrl ? "outlined" : "contained"}
                    color={isEditingUrl ? "error" : "primary"}
                    size="small"
                    onClick={() => {
                      if (isEditingUrl) {
                        setIsEditingUrl(false);
                        setEditedUrl('');
                      } else {
                        setIsEditingUrl(true);
                        setEditedUrl(selectedStream.ivs_url);
                      }
                    }}
                    sx={{ mb: isEditingUrl ? 2 : 0 }}
                  >
                    {isEditingUrl ? "Cancel Edit" : "Update Stream URL"}
                  </Button>
                  
                  {isEditingUrl && (
                    <Box sx={{ mt: 2 }}>
                      <TextField
                        fullWidth
                        label="New Stream URL"
                        value={editedUrl}
                        onChange={(e) => setEditedUrl(e.target.value)}
                        variant="outlined"
                        size="small"
                        margin="dense"
                      />
                      <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
                        <Button
                          variant="contained"
                          color="primary"
                          size="small"
                          onClick={handleUpdateStreamUrl}
                          disabled={!editedUrl.trim()}
                        >
                          Save Changes
                        </Button>
                        <Button 
                          variant="outlined"
                          size="small"
                          onClick={() => {
                            const formattedUrl = formatIVSUrl(editedUrl);
                            window.open(formattedUrl, '_blank');
                          }}
                          disabled={!editedUrl.trim()}
                        >
                          Test URL
                        </Button>
                      </Box>
                    </Box>
                  )}
                </Box>
                <Button 
                  variant="outlined"
                  size="small"
                  onClick={() => window.open(formatIVSUrl(selectedStream.ivs_url), '_blank')}
                  sx={{ mt: 1 }}
                >
                  Open Stream in New Tab
                </Button>
              </TabPanel>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleDialogClose}>Close</Button>
            </DialogActions>
          </>
        )}
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
      >
        <DialogTitle>Delete Stream</DialogTitle>
        <DialogContent>
          <Typography variant="body1">
            Are you sure you want to delete the stream "{selectedStream?.name}"? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
          <Button 
            color="error" 
            onClick={() => handleDeleteStream(selectedStream?.stream_id)}
            disabled={isDeleting}
            startIcon={isDeleting && <CircularProgress size={24} />}
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
} 