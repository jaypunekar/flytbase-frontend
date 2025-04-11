import React, { useState, useContext, useEffect } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Box, 
  Typography, 
  TextField, 
  Button, 
  Container, 
  Paper, 
  Alert,
  CircularProgress
} from '@mui/material';
import EmailIcon from '@mui/icons-material/Email';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';

export default function VerifyEmail() {
  const [verificationCode, setVerificationCode] = useState('');
  const [error, setError] = useState(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { verifyEmail } = useContext(AuthContext);
  
  // Get email from URL params or location state
  const emailFromParams = searchParams.get('email');
  const tokenFromParams = searchParams.get('token');
  const emailFromState = location.state?.email;
  
  const [email, setEmail] = useState(emailFromParams || emailFromState || '');
  
  // Handle auto-verification if both email and token are in URL
  useEffect(() => {
    const autoVerify = async () => {
      if (emailFromParams && tokenFromParams) {
        setVerificationCode(tokenFromParams);
        setIsVerifying(true);
        
        try {
          await verifyEmail(emailFromParams, tokenFromParams);
          // On success, user will be redirected to dashboard by the verifyEmail function
        } catch (err) {
          console.error('Auto-verification error:', err);
          setError(err.response?.data?.detail || 'Failed to verify email');
          setIsVerifying(false);
        }
      }
    };
    
    autoVerify();
  }, [emailFromParams, tokenFromParams, verifyEmail]);
  
  // If no email is provided, redirect to signup
  useEffect(() => {
    if (!email) {
      navigate('/signup');
    }
  }, [email, navigate]);
  
  const handleVerify = async (e) => {
    e.preventDefault();
    if (!verificationCode) {
      setError('Please enter the verification code');
      return;
    }
    
    setIsVerifying(true);
    setError(null);
    
    try {
      // Call the verifyEmail function from AuthContext
      await verifyEmail(email, verificationCode);
      // On success, user will be redirected to dashboard by the verifyEmail function
    } catch (err) {
      console.error('Verification error:', err);
      setError(err.response?.data?.detail || 'Failed to verify email');
    } finally {
      setIsVerifying(false);
    }
  };
  
  const handleResendCode = async () => {
    setIsSendingCode(true);
    setError(null);
    
    try {
      const formData = new FormData();
      formData.append('email', email);
      
      await api.post('/auth/resend-verification', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      setError({ severity: 'success', message: 'Verification code sent to your email' });
    } catch (err) {
      console.error('Error resending code:', err);
      setError(err.response?.data?.detail || 'Failed to resend verification code');
    } finally {
      setIsSendingCode(false);
    }
  };
  
  // Format error message
  const formatErrorMessage = (error) => {
    if (!error) return '';
    if (typeof error === 'string') return error;
    if (error.message) return error.message;
    if (typeof error === 'object') return JSON.stringify(error);
    return String(error);
  };
  
  if (!email) {
    return null; // Will redirect in useEffect
  }
  
  return (
    <Container component="main" maxWidth="xs">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Paper
          elevation={3}
          sx={{
            padding: 4,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            width: '100%',
          }}
        >
          <Box sx={{ 
            bgcolor: 'primary.main', 
            color: 'primary.contrastText',
            p: 2,
            borderRadius: '50%',
            mb: 2
          }}>
            <EmailIcon fontSize="large" />
          </Box>
          <Typography component="h1" variant="h5" gutterBottom>
            Verify Your Email
          </Typography>
          
          <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 3 }}>
            We've sent a verification code to <strong>{email}</strong>.
            <br />Please enter the code below to verify your account.
          </Typography>
          
          {error && (
            <Alert 
              severity={error.severity || "error"} 
              sx={{ mt: 2, mb: 2, width: '100%' }}
            >
              {formatErrorMessage(error)}
            </Alert>
          )}
          
          <Box component="form" onSubmit={handleVerify} sx={{ width: '100%' }}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="verificationCode"
              label="Verification Code"
              name="verificationCode"
              autoComplete="one-time-code"
              inputMode="numeric"
              autoFocus
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
            />
            
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3 }}
              disabled={isVerifying || !verificationCode}
            >
              {isVerifying ? <CircularProgress size={24} /> : 'Verify Email'}
            </Button>
            
            <Button
              fullWidth
              variant="text"
              sx={{ mt: 1 }}
              onClick={handleResendCode}
              disabled={isSendingCode}
            >
              {isSendingCode ? 'Sending...' : 'Resend Verification Code'}
            </Button>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
} 