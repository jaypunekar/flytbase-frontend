import React, { useContext } from 'react';
import { Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { 
  Container, 
  CssBaseline, 
  ThemeProvider, 
  createTheme, 
  Box, 
  CircularProgress, 
  AppBar, 
  Toolbar, 
  Typography, 
  Button,
  Tabs,
  Tab
} from '@mui/material';
import LiveTvIcon from '@mui/icons-material/LiveTv';
import DashboardIcon from '@mui/icons-material/Dashboard';

// Pages
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import Streams from './pages/Streams';
import NotFound from './pages/NotFound';
import VerifyEmail from './pages/VerifyEmail';

// Context
import { AuthContext } from './context/AuthContext';

// Create a professional theme
const theme = createTheme({
  palette: {
    primary: {
      main: '#10b981', // Emerald green as primary
      light: '#34d399',
      dark: '#059669',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#3b82f6', // Blue as secondary
      light: '#60a5fa',
      dark: '#2563eb', 
      contrastText: '#ffffff',
    },
    background: {
      default: '#f8fafc', // Light gray background
      paper: '#ffffff',
    },
    text: {
      primary: '#1e293b', // Dark slate for better readability
      secondary: '#64748b', // Medium slate
    },
    error: {
      main: '#ef4444', // Red for errors
      light: '#f87171',
      dark: '#dc2626',
    },
    warning: {
      main: '#f97316', // Orange for warnings
      light: '#fb923c',
      dark: '#ea580c',
    },
    info: {
      main: '#0ea5e9', // Light blue for info
      light: '#38bdf8',
      dark: '#0284c7',
    },
    success: {
      main: '#10b981', // Match primary for consistency
      light: '#34d399',
      dark: '#059669',
    },
  },
  typography: {
    fontFamily: "'Inter', 'Roboto', 'Helvetica', 'Arial', sans-serif",
    h1: {
      fontWeight: 700,
      fontSize: '2.5rem',
    },
    h2: {
      fontWeight: 700,
      fontSize: '2rem',
    },
    h3: {
      fontWeight: 600,
      fontSize: '1.75rem',
    },
    h4: {
      fontWeight: 600,
      fontSize: '1.5rem',
    },
    h5: {
      fontWeight: 600,
      fontSize: '1.25rem',
    },
    h6: {
      fontWeight: 600,
      fontSize: '1rem',
    },
    subtitle1: {
      fontWeight: 500,
      fontSize: '1rem',
    },
    body1: {
      fontSize: '1rem',
    },
    button: {
      fontWeight: 600,
      textTransform: 'none', // More modern look without all-caps
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
          },
        },
        contained: {
          padding: '8px 16px',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
          borderRadius: 12,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        rounded: {
          borderRadius: 12,
        },
        elevation1: {
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
        },
      },
    },
    MuiContainer: {
      styleOverrides: {
        root: {
          paddingTop: 16,
          paddingBottom: 16,
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          borderRadius: 5,
          height: 8,
        },
      },
    },
    MuiCircularProgress: {
      styleOverrides: {
        circle: {
          strokeLinecap: 'round',
        },
      },
    },
  },
});

// Navigation Tabs component
const NavigationTabs = () => {
  const location = useLocation();
  const { isAuthenticated } = useContext(AuthContext);
  
  // Only show tabs for authenticated users
  if (!isAuthenticated) return null;
  
  const path = location.pathname;
  
  return (
    <Tabs 
      value={path === "/streams" ? 1 : 0}
      textColor="inherit"
      indicatorColor="secondary"
      sx={{ ml: 2 }}
    >
      <Tab 
        icon={<DashboardIcon />} 
        iconPosition="start" 
        label="Dashboard" 
        component={Link} 
        to="/dashboard" 
        sx={{ fontSize: '1rem', fontWeight: 500 }}
      />
      <Tab 
        icon={<LiveTvIcon />} 
        iconPosition="start" 
        label="LIVE STREAMS" 
        component={Link} 
        to="/streams" 
        sx={{ 
          fontSize: '1.1rem', 
          fontWeight: 700, 
          color: path === "/streams" ? theme.palette.secondary.light : 'inherit',
          backgroundColor: path === "/streams" ? 'rgba(59, 130, 246, 0.08)' : 'transparent',
          borderRadius: '8px 8px 0 0',
          '&:hover': {
            backgroundColor: 'rgba(59, 130, 246, 0.12)',
          },
          px: 3,
          letterSpacing: '0.5px'
        }}
      />
    </Tabs>
  );
};

// Protected route component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useContext(AuthContext);
  
  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '80vh',
        }}
      >
        <CircularProgress size={60} thickness={4} />
      </Box>
    );
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }
  
  return children;
};

function App() {
  const { isAuthenticated } = useContext(AuthContext);
  
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      
      {/* Top AppBar with prominent title */}
      <AppBar position="sticky" elevation={0} sx={{ 
        backgroundColor: '#ffffff', 
        color: theme.palette.text.primary,
        borderBottom: '1px solid',
        borderColor: 'rgba(0,0,0,0.06)'
      }}>
        <Toolbar>
          <Typography 
            variant="h5" 
            component="div" 
            sx={{ 
              fontWeight: 700,
              background: 'linear-gradient(90deg, #10b981 0%, #3b82f6 50%, #f97316 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              letterSpacing: '0.5px'
            }}
          >
            FlytBase AI Engineer Assignment
          </Typography>
          <NavigationTabs />
          <Box sx={{ flexGrow: 1 }} />
          {isAuthenticated && (
            <Button 
              component={Link} 
              to="/streams" 
              variant="contained" 
              color="secondary"
              startIcon={<LiveTvIcon />}
              sx={{ ml: 2 }}
            >
              View Live Streams
            </Button>
          )}
        </Toolbar>
      </AppBar>
      
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Routes>
          <Route path="/" element={<Navigate to="/login" />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/streams" 
            element={
              <ProtectedRoute>
                <Streams />
              </ProtectedRoute>
            } 
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Container>
    </ThemeProvider>
  );
}

export default App; 