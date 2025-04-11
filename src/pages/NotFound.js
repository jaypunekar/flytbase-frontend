import React from 'react';
import { Box, Typography, Button, Container } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

export default function NotFound() {
  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '80vh',
        }}
      >
        <Typography variant="h1" color="primary" gutterBottom>
          404
        </Typography>
        <Typography variant="h5" color="textSecondary" gutterBottom>
          Page Not Found
        </Typography>
        <Typography variant="body1" align="center" color="textSecondary" paragraph>
          The page you are looking for might have been removed, had its name changed,
          or is temporarily unavailable.
        </Typography>
        <Button variant="contained" component={RouterLink} to="/" sx={{ mt: 3 }}>
          Go to Home
        </Button>
      </Box>
    </Container>
  );
} 