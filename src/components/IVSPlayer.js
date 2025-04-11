import React, { useEffect, useRef, useState } from 'react';
import { Box, Typography, Button, CircularProgress, Stack, Alert } from '@mui/material';
import WarningIcon from '@mui/icons-material/Warning';
import RefreshIcon from '@mui/icons-material/Refresh';
import DvrIcon from '@mui/icons-material/Dvr';
import { styled } from '@mui/material/styles';

// Styled components for better visuals
const PlayerContainer = styled(Box)(({ theme }) => ({
  height: '100%',
  width: '100%',
  backgroundColor: '#000',
  position: 'relative',
  borderRadius: theme.shape.borderRadius,
  overflow: 'hidden',
  aspectRatio: '16/9',
  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
}));

const StyledVideo = styled('video')({
  width: '100%',
  height: '100%',
  objectFit: 'contain',
});

const OverlayContainer = styled(Box)({
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: 'rgba(0, 0, 0, 0.7)',
  color: 'white',
  zIndex: 10,
  padding: 16,
});

// IVS Player component to handle AWS IVS live streams
const IVSPlayer = ({ streamUrl, height = '300px', width = '100%' }) => {
  const videoRef = useRef(null);
  const playerRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fallbackToIframe, setFallbackToIframe] = useState(false);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Preparing stream player...');
  const [player, setPlayer] = useState(null);

  // Set up global error handler to catch cross-origin script errors
  useEffect(() => {
    const handleGlobalError = (event) => {
      // Prevent "Script error" messages from flooding the console
      if (event.message === 'Script error.' && event.filename === '') {
        // This is a cross-origin error, likely from the IVS Player script
        console.warn('Suppressed cross-origin script error');
        event.preventDefault();
        event.stopPropagation();
        return true;
      }
      return false;
    };

    // Add global error handler
    window.addEventListener('error', handleGlobalError, true);
    
    // Cleanup
    return () => {
      window.removeEventListener('error', handleGlobalError, true);
    };
  }, []);

  // Safe cleanup function to dispose of player resources
  const cleanupPlayer = () => {
    try {
      if (playerRef.current && typeof playerRef.current.destroy === 'function') {
        playerRef.current.destroy();
      } else if (playerRef.current && typeof playerRef.current.pause === 'function') {
        playerRef.current.pause();
      }
    } catch (err) {
      console.error('Error cleaning up player:', err);
    }
    playerRef.current = null;
  };

  // Load the IVS player script
  useEffect(() => {
    // Load IVS Player script
    const loadScript = () => {
      return new Promise((resolve, reject) => {
        if (window.IVSPlayer) {
          resolve();
          return;
        }

        const script = document.createElement('script');
        script.src = 'https://player.live-video.net/1.24.0/amazon-ivs-player.min.js';
        script.async = true;
        script.onload = () => {
          console.log('IVS Player script loaded successfully');
          resolve();
        };
        script.onerror = (error) => {
          console.error('Failed to load IVS Player script:', error);
          reject(new Error('Failed to load IVS Player script'));
        };
        document.head.appendChild(script);
      });
    };

    const initializePlayer = async () => {
      try {
        await loadScript();
        if (!window.IVSPlayer) {
          throw new Error('IVS Player not available after script load');
        }

        const player = window.IVSPlayer.create();
        if (!player) {
          throw new Error('Failed to create IVS Player instance');
        }

        setPlayer(player);
        console.log('IVS Player initialized successfully');
      } catch (error) {
        console.error('Error initializing IVS Player:', error);
        setError(error.message);
      }
    };

    initializePlayer();

    return () => {
      if (player) {
        player.delete();
      }
    };
  }, []);

  // Setup player when streamUrl changes or script loads
  useEffect(() => {
    if (!streamUrl || fallbackToIframe || !scriptLoaded) return;

    const setupPlayer = async () => {
      try {
        setIsLoading(true);
        setLoadingMessage('Connecting to stream...');
        setError(null);

        // Cleanup any existing player first
        cleanupPlayer();

        // Check if IVSPlayer is available
        if (!window.IVSPlayer) {
          console.error('IVSPlayer not found in window');
          setFallbackToIframe(true);
          setIsLoading(false);
          return;
        }

        const IVSPlayer = window.IVSPlayer;
        
        if (!IVSPlayer.isPlayerSupported) {
          console.warn('IVS Player is not supported in this browser');
          setFallbackToIframe(true);
          setIsLoading(false);
          return;
        }

        // Create player instance with error handling
        try {
          const player = IVSPlayer.create();
          playerRef.current = player;

          console.log('Attaching video element');
          // Set up event listeners before attaching video element
          player.addEventListener(IVSPlayer.PlayerState.PLAYING, () => {
            console.log('IVS Player: Started playing');
            setIsLoading(false);
          });

          player.addEventListener(IVSPlayer.PlayerState.ENDED, () => {
            console.log('IVS Player: Stream ended');
            setError("Stream has ended");
          });

          player.addEventListener(IVSPlayer.PlayerState.ERROR, (err) => {
            console.error('IVS Player error:', err);
            setError(`Stream playback error: ${err.code || 'Unknown'}`);
            setIsLoading(false);
          });

          // Attach video element and play
          if (videoRef.current) {
            player.attachHTMLVideoElement(videoRef.current);
            console.log('Loading stream URL:', streamUrl);
            try {
              player.load(streamUrl);
              player.play();
              setLoadingMessage('Stream is loading...');
              
              // Set timeout for stream loading
              setTimeout(() => {
                if (isLoading) {
                  setLoadingMessage('Still connecting... This may take a moment');
                }
              }, 5000);
            } catch (loadErr) {
              console.error('Error loading stream:', loadErr);
              setError(`Failed to load stream: ${loadErr.message || 'Unknown error'}`);
              setFallbackToIframe(true);
            }
          } else {
            console.error('Video element reference not found');
            setError('Video player initialization failed');
            setIsLoading(false);
          }
        } catch (playerCreateErr) {
          console.error('Failed to create player instance:', playerCreateErr);
          setError('Failed to initialize player');
          setFallbackToIframe(true);
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Failed to initialize IVS player:', err);
        setError(`Failed to load player: ${err.message || 'Unknown error'}`);
        setIsLoading(false);
        setFallbackToIframe(true);
      }
    };

    setupPlayer().catch(err => {
      console.error('Player setup error:', err);
      setFallbackToIframe(true);
    });

    // Cleanup function
    return () => {
      cleanupPlayer();
    };
  }, [streamUrl, scriptLoaded, fallbackToIframe, isLoading]);

  const handleRetry = () => {
    // Clean up player safely
    cleanupPlayer();
    
    setIsLoading(true);
    setLoadingMessage('Reconnecting to stream...');
    setError(null);
    
    // Try falling back to iframe if native player failed
    if (!scriptLoaded || !window.IVSPlayer) {
      setFallbackToIframe(true);
      setIsLoading(false);
      return;
    }
    
    // Add a small delay before retrying
    setTimeout(() => {
      if (!videoRef.current || !streamUrl) return;
      
      try {
        const IVSPlayer = window.IVSPlayer;
        if (!IVSPlayer) {
          setError("IVS Player not loaded. Please refresh the page.");
          setFallbackToIframe(true);
          return;
        }
        
        const player = IVSPlayer.create();
        playerRef.current = player;
        
        player.attachHTMLVideoElement(videoRef.current);
        player.load(streamUrl);
        player.play();
      } catch (err) {
        console.error('Error retrying playback:', err);
        setError(`Failed to retry: ${err.message || 'Unknown error'}`);
        setFallbackToIframe(true);
      }
    }, 500);
  };

  // If we need to fall back to iframe mode
  if (fallbackToIframe) {
    return (
      <PlayerContainer sx={{ height, width }}>
        <iframe
          src={streamUrl}
          allow="autoplay; fullscreen"
          allowFullScreen
          title="Stream Player Fallback"
          style={{
            width: '100%',
            height: '100%',
            border: 'none'
          }}
        />
      </PlayerContainer>
    );
  }

  return (
    <PlayerContainer sx={{ height, width }}>
      <StyledVideo 
        ref={videoRef} 
        playsInline 
        autoPlay 
        controls
      />
      
      {/* Loading indicator with progressive messages */}
      {isLoading && (
        <OverlayContainer>
          <CircularProgress color="primary" size={48} thickness={4} sx={{ mb: 3 }} />
          <Typography variant="h6" sx={{ mb: 1, textAlign: 'center', fontWeight: 500 }}>
            {loadingMessage}
          </Typography>
          <Typography variant="body2" sx={{ textAlign: 'center', opacity: 0.8, maxWidth: '80%' }}>
            Live streams may take a moment to connect depending on network conditions
          </Typography>
        </OverlayContainer>
      )}
      
      {/* Error display with retry and fallback options */}
      {error && (
        <OverlayContainer>
          <WarningIcon color="error" sx={{ fontSize: 48, mb: 2 }} />
          <Typography variant="h6" sx={{ mb: 2, textAlign: 'center', fontWeight: 500 }}>
            {error}
          </Typography>
          
          <Alert severity="info" sx={{ mb: 2, maxWidth: '80%' }}>
            If the stream is active but not loading, try using the fallback player or refreshing the page.
          </Alert>
          
          <Stack direction="row" spacing={2}>
            <Button 
              variant="contained" 
              color="primary"
              startIcon={<RefreshIcon />}
              onClick={handleRetry}
              sx={{ fontWeight: 500 }}
            >
              Retry Connection
            </Button>
            <Button 
              variant="outlined" 
              color="primary"
              startIcon={<DvrIcon />}
              onClick={() => setFallbackToIframe(true)}
              sx={{ fontWeight: 500 }}
            >
              Use Fallback Player
            </Button>
          </Stack>
        </OverlayContainer>
      )}
    </PlayerContainer>
  );
};

export default IVSPlayer; 